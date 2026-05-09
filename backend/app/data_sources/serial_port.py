import asyncio
import serial
import serial.tools.list_ports

from app.core.config import settings
from app.data_sources.base import DataSource


class SerialPortReader(DataSource):
    def __init__(self) -> None:
        self._port: serial.Serial | None = None
        self.port_name: str | None = None
        self.last_error: str | None = None
        self.last_raw: str = ""
        self._open_port()

    def _open_port(self) -> None:
        port_name = _resolve_port_name()
        self.port_name = port_name
        if port_name is None:
            self._port = None
            self.last_error = "No serial ports found."
            return
        try:
            self._port = serial.Serial(
                port=port_name,
                baudrate=115200,
                timeout=1,
            )
            self.last_error = None
        except serial.SerialException as exc:
            self._port = None
            self.last_error = str(exc)

    def _ensure_open(self) -> None:
        if self._port is None or not self._port.is_open:
            self._open_port()

    async def read(self) -> str:
        self._ensure_open()
        if self._port is None:
            await asyncio.sleep(1)
            return ""
        try:
            line = self._port.readline().decode("utf-8", errors="ignore").strip()
            if not line:
                await asyncio.sleep(0.1)
                return ""
            self.last_raw = line
            self.last_error = None
            return line
        except (serial.SerialException, OSError) as exc:
            self._port = None
            self.last_error = str(exc)
            await asyncio.sleep(1)
            return ""

    def status(self) -> dict[str, str | bool | None]:
        return {
            "port": self.port_name,
            "is_open": self._port is not None and self._port.is_open,
            "last_raw": self.last_raw,
            "last_error": self.last_error,
        }


def _resolve_port_name() -> str | None:
    configured_port = settings.serial_port.strip()
    if configured_port and configured_port.lower() != "auto":
        return configured_port

    ports = list(serial.tools.list_ports.comports())
    if not ports:
        return None

    keywords = ("esp", "cp210", "ch340", "usb serial", "silicon labs", "wch", "uart")
    for port in ports:
        details = " ".join(
            value or "" for value in (port.device, port.description, port.manufacturer)
        ).lower()
        if any(keyword in details for keyword in keywords):
            return port.device

    return ports[0].device
