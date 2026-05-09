from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from app.schemas.health import AlertItem, VitalReading


def evaluate_alerts(vitals: VitalReading) -> list[AlertItem]:
    alerts: list[AlertItem] = []
    now = datetime.now(timezone.utc)

    if vitals.heart_rate >= 115:
        alerts.append(
            AlertItem(
                id=str(uuid4()),
                type="HIGH_HR",
                severity="Critical",
                message="Heart rate is critically elevated.",
                timestamp=now,
            )
        )
    elif vitals.heart_rate >= 100:
        alerts.append(
            AlertItem(
                id=str(uuid4()),
                type="ELEVATED_HR",
                severity="Warning",
                message="Heart rate is above the preferred range.",
                timestamp=now,
            )
        )
    if vitals.spo2 <= 90:
        alerts.append(
            AlertItem(
                id=str(uuid4()),
                type="LOW_SPO2",
                severity="Critical",
                message="Oxygen saturation requires attention.",
                timestamp=now,
            )
        )
    if vitals.temperature >= 38.0:
        alerts.append(
            AlertItem(
                id=str(uuid4()),
                type="HIGH_TEMP",
                severity="Warning",
                message="Temperature is trending above baseline.",
                timestamp=now,
            )
        )
    if vitals.fall_detected == 1:
        alerts.append(
            AlertItem(
                id=str(uuid4()),
                type="FALL",
                severity="Critical",
                message="Potential fall detected. Check patient immediately.",
                timestamp=now,
            )
        )
    return alerts


def derive_status(alerts: list[AlertItem]) -> Literal["Stable", "Warning", "Critical"]:
    severities = {alert.severity for alert in alerts}
    if "Critical" in severities:
        return "Critical"
    if "Warning" in severities:
        return "Warning"
    return "Stable"
