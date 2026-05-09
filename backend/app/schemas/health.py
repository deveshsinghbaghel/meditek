from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class VitalReading(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    heart_rate: int = Field(alias="HR")
    spo2: int = Field(alias="SpO2")
    temperature: float = Field(alias="Temp")
    steps: int = Field(default=0, alias="Steps")
    fall_detected: int = Field(alias="Fall")
    motion: str = Field(alias="Motion")


class AlertItem(BaseModel):
    id: str
    type: str
    severity: Literal["Info", "Warning", "Critical"]
    message: str
    timestamp: datetime
    resolved: bool = False


class Insight(BaseModel):
    generated_at: datetime
    summary: str
    recommendations: list[str]
    anomaly_detected: bool
    confidence: float


class VitalEnvelope(BaseModel):
    type: Literal["vital_update"] = "vital_update"
    timestamp: datetime
    data: VitalReading
    alerts: list[AlertItem]
    status: Literal["Stable", "Warning", "Critical"]
    insight: Insight | None = None
