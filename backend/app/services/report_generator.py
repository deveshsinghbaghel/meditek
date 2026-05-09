import asyncio
from datetime import datetime, timezone
from typing import Any

from app.core.config import settings
from app.services.gemini_service import generate_report_with_gemini
from app.services.supabase_client import table


class ReportGenerator:
    def __init__(self) -> None:
        self._buffer: list[dict[str, Any]] = []
        self._task: asyncio.Task[None] | None = None
        self._running = False

    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._batch_loop())

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    def record(self, vitals: dict[str, Any]) -> None:
        self._buffer.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "hr": _first_present(vitals, "HR", "heart_rate"),
            "spo2": _first_present(vitals, "SpO2", "spo2"),
            "temp": _first_present(vitals, "Temp", "temperature"),
            "fall": _first_present(vitals, "Fall", "fall_detected"),
            "motion": _first_present(vitals, "Motion", "motion"),
        })

    async def generate(self) -> dict[str, Any] | None:
        if not self._buffer:
            return None
        batch = _build_batch(self._buffer)
        self._buffer.clear()
        report = await generate_report_with_gemini(batch)
        await _save_report(report)
        await _enforce_limit()
        return report

    def has_data(self) -> bool:
        return len(self._buffer) > 0

    @property
    def buffer_size(self) -> int:
        return len(self._buffer)

    async def _batch_loop(self) -> None:
        while self._running:
            await asyncio.sleep(settings.batch_interval_seconds)


def _build_batch(buffer: list[dict[str, Any]]) -> dict[str, Any]:
    ts = [r["timestamp"] for r in buffer]
    return {
        "hr_data": {"timestamps": ts, "values": [r["hr"] for r in buffer]},
        "spo2_data": {"timestamps": ts, "values": [r["spo2"] for r in buffer]},
        "temp_data": {"timestamps": ts, "values": [r["temp"] for r in buffer]},
        "fall_data": {"timestamps": ts, "values": [r["fall"] for r in buffer]},
        "motion_data": {"timestamps": ts, "values": [r["motion"] for r in buffer]},
        "batch_size": len(buffer),
    }


def _first_present(data: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in data:
            return data[key]
    return None


def _save_batch(batch: dict[str, Any]) -> None:
    table("vitals_batches").insert({
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        "hr_data": batch["hr_data"],
        "spo2_data": batch["spo2_data"],
        "temp_data": batch["temp_data"],
        "fall_data": batch["fall_data"],
        "motion_data": batch["motion_data"],
        "batch_size": batch["batch_size"],
    })


async def _save_report(report: dict[str, Any]) -> None:
    try:
        table("reports").insert({
            "generated_at": report.get("generated_at", datetime.now(timezone.utc).isoformat()),
            "text_summary": report.get("text_summary", ""),
            "health_score": report.get("health_score", 0),
            "risk_level": report.get("risk_level", "Low"),
            "recommendations": report.get("recommendations", []),
            "metrics_summary": report.get("metrics_summary", {}),
        })
    except Exception:
        pass


async def _enforce_limit() -> None:
    try:
        result = table("reports").select("id,generated_at").order("generated_at").execute()
        if len(result.data) > 5:
            ids = [r["id"] for r in result.data[:-5]]
            table("reports").delete().in_("id", ids)
    except Exception:
        pass


report_generator = ReportGenerator()
