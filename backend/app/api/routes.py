from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from app.services.ai_analysis import generate_insight
from app.services.gemini_service import answer_reports_question
from app.services.migrations import ensure_tables
from app.services.report_generator import report_generator
from app.services.runtime import runtime

router = APIRouter()


class RawVitalsPayload(BaseModel):
    raw: str


class ReportsChatPayload(BaseModel):
    question: str


@router.get("/reports/status")
async def get_report_status():
    return {
        "buffer_size": report_generator.buffer_size,
        "ready": report_generator.has_data(),
    }


@router.get("/vitals/history")
async def get_vitals_history(limit: int = 60):
    history = list(runtime.history)[-max(1, min(limit, len(runtime.history) or 1)) :]
    return history


@router.get("/vitals/source")
async def get_vitals_source():
    return runtime.status()


@router.post("/vitals/ingest")
async def ingest_vitals(payload: RawVitalsPayload):
    try:
        return await runtime.ingest_raw(payload.raw)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/alerts")
async def get_alerts(limit: int = 20):
    return list(runtime.alert_log)[: max(1, min(limit, len(runtime.alert_log) or 1))]


@router.get("/ai/latest")
async def get_latest_ai_summary():
    return runtime.latest_insight or generate_insight(runtime.history)


@router.post("/ai/analyze")
async def analyze_now():
    runtime.latest_insight = generate_insight(runtime.history)
    return runtime.latest_insight


@router.post("/reports/generate")
async def generate_report():
    report = await report_generator.generate()
    if report is None:
        return {"error": "No data accumulated yet. Wait for 20 seconds of vitals data."}
    return report


@router.get("/reports/history")
async def get_reports_history():
    try:
        from app.services.supabase_client import table
        result = table("reports").select("id,generated_at,text_summary,health_score,risk_level,recommendations,metrics_summary").order("generated_at", desc=True).limit(5).execute()
        return result.data
    except Exception as e:
        return {"error": str(e)}


@router.get("/reports/{report_id}")
async def get_report(report_id: str):
    try:
        from app.services.supabase_client import table
        result = table("reports").select("id,generated_at,text_summary,health_score,risk_level,recommendations,metrics_summary").eq("id", report_id).execute()
        if not result.data:
            return {"error": "Report not found"}
        return result.data[0]
    except Exception as e:
        return {"error": str(e)}


@router.post("/reports/chat")
async def chat_with_reports(payload: ReportsChatPayload):
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    try:
        from app.services.supabase_client import table
        result = table("reports").select("id,generated_at,text_summary,health_score,risk_level,recommendations,metrics_summary").order("generated_at", desc=True).limit(25).execute()
        reports = result.data or []
        return await answer_reports_question(question, reports)
    except Exception as e:
        return {"error": str(e)}


@router.post("/migrate")
async def migrate(background: BackgroundTasks):
    def _do():
        ensure_tables()
    background.add_task(_do)
    return {"status": "Migration started."}
