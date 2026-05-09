from datetime import datetime, timezone
from typing import Any

from app.core.config import settings


def _build_prompt(batch: dict[str, Any]) -> str:
    timestamps = batch.get("hr_data", {}).get("timestamps", [])
    hr_vals = batch.get("hr_data", {}).get("values", [])
    spo2_vals = batch.get("spo2_data", {}).get("values", [])
    temp_vals = batch.get("temp_data", {}).get("values", [])
    fall_vals = batch.get("fall_data", {}).get("values", [])
    motion_vals = batch.get("motion_data", {}).get("values", [])

    def avg(vals):
        return round(sum(vals) / len(vals), 1) if vals else 0

    def mx(vals):
        return max(vals) if vals else 0

    def mn(vals):
        return min(vals) if vals else 0

    def trend(vals):
        clean = [v for v in vals if isinstance(v, (int, float))]
        if len(clean) < 2:
            return {"direction": "insufficient-data", "change": 0, "start": clean[0] if clean else 0, "end": clean[-1] if clean else 0}
        change = round(clean[-1] - clean[0], 1)
        direction = "stable"
        threshold = 1 if max(clean) <= 40 else 3
        if change >= threshold:
            direction = "increasing"
        elif change <= -threshold:
            direction = "decreasing"
        return {"direction": direction, "change": change, "start": clean[0], "end": clean[-1]}

    def paired_samples(vals):
        return [{"time": ts, "value": val} for ts, val in zip(timestamps, vals)]

    def motion_distribution(vals):
        counts: dict[str, int] = {}
        for value in vals:
            key = str(value or "Unknown")
            counts[key] = counts.get(key, 0) + 1
        return counts

    duration = "unknown"
    if len(timestamps) >= 2:
        duration = f"from {timestamps[0]} to {timestamps[-1]}"

    prompt = f"""You are a careful clinical monitoring assistant generating a concise caregiver-facing report from wearable telemetry.
Analyze patterns over time, not just isolated values. Use the timestamps to describe whether readings increased, decreased, recovered, stayed stable, or briefly spiked during the monitoring window. Do not diagnose disease. If data is noisy or limited, say that confidence is limited and recommend continued monitoring.

Monitoring window: {duration}
Sample count: {batch.get("batch_size", len(timestamps))}

Timestamped samples:
- Heart Rate bpm: {paired_samples(hr_vals)}
- SpO2 percent: {paired_samples(spo2_vals)}
- Temperature C: {paired_samples(temp_vals)}
- Fall flags: {paired_samples(fall_vals)}
- Motion states: {paired_samples(motion_vals)}

Computed statistics:
- Heart Rate: avg={avg(hr_vals)}, min={mn(hr_vals)}, max={mx(hr_vals)}, trend={trend(hr_vals)}
- SpO2: avg={avg(spo2_vals)}, min={mn(spo2_vals)}, max={mx(spo2_vals)}, trend={trend(spo2_vals)}
- Temperature: avg={avg(temp_vals)}, min={mn(temp_vals)}, max={mx(temp_vals)}, trend={trend(temp_vals)}
- Fall events: {sum(v for v in fall_vals if isinstance(v, (int, float))) if fall_vals else 0}
- Motion distribution: {motion_distribution(motion_vals)}

Clinical interpretation guidance:
- Mention meaningful time-based patterns, e.g. "heart rate rose from 72 to 96 bpm during the window" or "SpO2 stayed stable around 98%".
- Highlight concerning combinations: HR > 110 bpm, SpO2 < 94%, temperature > 37.5 C, any fall flag, or impact/emergency motion.
- If a value returns toward normal, mention recovery.
- Recommendations must be practical caregiver actions, not generic filler.
- Health score should reflect trend stability, oxygenation, fever risk, fall events, and motion context.

Respond ONLY with valid JSON (no markdown, no explanation):
{{
  "text_summary": "3-4 sentence paragraph summarizing vitals and time-based trends",
  "health_score": integer 0-100,
  "risk_level": "Low" or "Moderate" or "High",
  "recommendations": ["specific action 1", "specific action 2", "specific action 3"],
  "metrics_summary": {{
    "hr": {{"avg": number, "min": number, "max": number}},
    "spo2": {{"avg": number, "min": number, "max": number}},
    "temp": {{"avg": number, "min": number, "max": number}},
    "fall_count": number,
    "motion_distribution": {{"Walking": number, "Idle": number, "Emergency": number, "other": number}}
  }}
}}"""
    return prompt


async def generate_report_with_gemini(batch: dict[str, Any]) -> dict[str, Any]:
    if not settings.gemini_api_key:
        return _fallback_report(batch)

    import google.generativeai as genai
    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")

    prompt = _build_prompt(batch)
    try:
        response = await model.generate_content_async(prompt)
        import json
        raw = response.text.strip()
        if raw.startswith("```"):
            raw = raw[raw.index("{"): raw.rindex("}") + 1]
        data = json.loads(raw)
        data["generated_at"] = datetime.now(timezone.utc).isoformat()
        return data
    except Exception:
        return _fallback_report(batch)


def _fallback_report(batch: dict[str, Any]) -> dict[str, Any]:
    hr_vals = batch.get("hr_data", {}).get("values", [])
    spo2_vals = batch.get("spo2_data", {}).get("values", [])
    temp_vals = batch.get("temp_data", {}).get("values", [])
    fall_vals = batch.get("fall_data", {}).get("values", [])
    motion_vals = batch.get("motion_data", {}).get("values", [])

    def avg(vals):
        return round(sum(vals) / len(vals), 1) if vals else 0

    def describe_trend(name: str, vals: list, unit: str, threshold: float) -> str:
        clean = [v for v in vals if isinstance(v, (int, float))]
        if len(clean) < 2:
            return f"{name} did not have enough samples for trend analysis."
        start = clean[0]
        end = clean[-1]
        change = round(end - start, 1)
        if change >= threshold:
            return f"{name} increased from {start} to {end}{unit} during the monitoring window."
        if change <= -threshold:
            return f"{name} decreased from {start} to {end}{unit} during the monitoring window."
        return f"{name} stayed relatively stable around {avg(clean)}{unit}."

    hr_avg = avg(hr_vals)
    spo2_avg = avg(spo2_vals)
    temp_avg = avg(temp_vals)
    fall_count = sum(fall_vals) if fall_vals else 0
    hr_trend = describe_trend("Heart rate", hr_vals, " bpm", 3)
    spo2_trend = describe_trend("SpO2", spo2_vals, "%", 2)
    temp_trend = describe_trend("Temperature", temp_vals, " C", 0.3)

    risk = "Low"
    if fall_count > 0 or spo2_avg < 94 or temp_avg > 37.5:
        risk = "High"
    elif spo2_avg < 97 or temp_avg > 37.0:
        risk = "Moderate"

    score = 100 - (fall_count * 20) - max(0, int(hr_avg - 80)) // 2
    score = max(0, min(100, score))

    motion_counts: dict[str, int] = {}
    for m in motion_vals:
        motion_counts[m] = motion_counts.get(m, 0) + 1

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "text_summary": (
            f"Patient monitored across {batch.get('batch_size', len(hr_vals))} samples. "
            f"{hr_trend} {spo2_trend} {temp_trend} "
            f"{'No fall events detected.' if fall_count == 0 else f'{fall_count} fall event(s) detected.'}"
        ),
        "health_score": score,
        "risk_level": risk,
        "recommendations": [
            "Continue monitoring if vitals are within normal range.",
            "Review any fall events with caregiver.",
            "Consult physician if SpO2 drops below 94% or HR exceeds 110 bpm.",
        ],
        "metrics_summary": {
            "hr": {"avg": hr_avg, "min": min(hr_vals) if hr_vals else 0, "max": max(hr_vals) if hr_vals else 0},
            "spo2": {"avg": spo2_avg, "min": min(spo2_vals) if spo2_vals else 0, "max": max(spo2_vals) if spo2_vals else 0},
            "temp": {"avg": temp_avg, "min": min(temp_vals) if temp_vals else 0, "max": max(temp_vals) if temp_vals else 0},
            "fall_count": fall_count,
            "motion_distribution": motion_counts,
        },
    }
