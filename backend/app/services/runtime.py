import asyncio
from collections import deque
from datetime import datetime, timezone
import time

from app.core.config import settings
from app.data_sources.base import DataSource
from app.data_sources.serial_port import SerialPortReader
from app.data_sources.simulator import FakeDataGenerator
from app.schemas.health import AlertItem, Insight, VitalEnvelope
from app.services.ai_analysis import generate_insight
from app.services.alerts import derive_status, evaluate_alerts
from app.services.parser import parse_raw_vitals
from app.services.report_generator import report_generator


NO_CONTACT_GRACE_SECONDS = 3.0


def get_data_source() -> DataSource:
    if settings.data_source == "serial":
        return SerialPortReader()
    if settings.data_source == "manual":
        return ManualDataSource()
    return FakeDataGenerator()


class ManualDataSource(DataSource):
    async def read(self) -> str:
        await asyncio.sleep(1)
        return ""


class MonitorRuntime:
    def __init__(self) -> None:
        self.source = get_data_source()
        self.history: deque[VitalEnvelope] = deque(maxlen=settings.history_limit)
        self.alert_log: deque[AlertItem] = deque(maxlen=settings.alert_limit)
        self.latest_insight: Insight | None = None
        self.subscribers: set[asyncio.Queue[VitalEnvelope]] = set()
        self._task: asyncio.Task[None] | None = None
        self._running = False
        self.last_raw: str = ""
        self.last_error: str | None = None
        self._last_ingest_at = 0.0
        self._no_contact_emitted = False

    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._stream())

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def subscribe(self) -> asyncio.Queue[VitalEnvelope]:
        queue: asyncio.Queue[VitalEnvelope] = asyncio.Queue()
        self.subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue[VitalEnvelope]) -> None:
        self.subscribers.discard(queue)

    async def _broadcast(self, envelope: VitalEnvelope) -> None:
        for queue in list(self.subscribers):
            await queue.put(envelope)

    async def ingest_raw(self, raw: str) -> VitalEnvelope:
        self.last_raw = raw
        try:
            vitals = parse_raw_vitals(raw)
            self.last_error = None
        except Exception as exc:
            self.last_error = f"Could not parse serial line {raw!r}: {exc}"
            raise

        alerts = evaluate_alerts(vitals)
        status = derive_status(alerts)
        self.latest_insight = generate_insight(self.history)
        envelope = VitalEnvelope(
            timestamp=datetime.now(timezone.utc),
            data=vitals,
            alerts=alerts,
            status=status,
            insight=self.latest_insight,
        )
        self.history.append(envelope)
        for alert in alerts:
            self.alert_log.appendleft(alert)
        report_generator.record(vitals.model_dump())
        self._last_ingest_at = time.monotonic()
        self._no_contact_emitted = False
        await self._broadcast(envelope)
        return envelope

    async def _emit_no_contact_reading(self) -> None:
        vitals = parse_raw_vitals("HR:0,SpO2:0,Temp:0,Fall:0,Motion:Waiting")
        alerts = evaluate_alerts(vitals)
        status = derive_status(alerts)
        self.latest_insight = generate_insight(self.history)
        envelope = VitalEnvelope(
            timestamp=datetime.now(timezone.utc),
            data=vitals,
            alerts=alerts,
            status=status,
            insight=self.latest_insight,
        )
        self.history.append(envelope)
        report_generator.record(vitals.model_dump())
        self._no_contact_emitted = True
        await self._broadcast(envelope)

    async def _stream(self) -> None:
        while self._running:
            raw = await self.source.read()
            if not raw:
                if (
                    settings.data_source == "serial"
                    and self.history
                    and not self._no_contact_emitted
                    and self._last_ingest_at > 0
                    and (time.monotonic() - self._last_ingest_at) >= NO_CONTACT_GRACE_SECONDS
                ):
                    await self._emit_no_contact_reading()
                await asyncio.sleep(0.1)
                continue
            try:
                await self.ingest_raw(raw)
            except Exception as exc:
                await asyncio.sleep(0.1)
                continue
            await asyncio.sleep(settings.stream_interval_seconds)

    def status(self) -> dict:
        source_status = None
        status_fn = getattr(self.source, "status", None)
        if callable(status_fn):
            source_status = status_fn()
        return {
            "running": self._running,
            "data_source": settings.data_source,
            "serial_port": settings.serial_port,
            "history_size": len(self.history),
            "last_raw": self.last_raw,
            "last_error": self.last_error,
            "source": source_status,
        }


runtime = MonitorRuntime()
