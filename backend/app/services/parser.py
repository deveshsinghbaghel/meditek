import json

from app.schemas.health import VitalReading


def parse_raw_vitals(payload: str) -> VitalReading:
    payload = payload.strip()
    if payload.startswith("{"):
        return VitalReading.model_validate(json.loads(payload))

    parts = [segment.strip() for segment in payload.split(",") if segment.strip()]
    parsed: dict[str, str | int | float] = {}

    for part in parts:
        if ":" not in part:
            continue
        key, value = part.split(":", 1)
        key = key.strip()
        value = value.strip()
        if key in {"HR", "SpO2", "Fall"}:
            parsed[key] = int(value)
        elif key == "Temp":
            parsed[key] = float(value)
        else:
            parsed[key] = value

    return VitalReading.model_validate(parsed)
