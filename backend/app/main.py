from contextlib import asynccontextmanager
import asyncio
import threading

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as api_router
from app.core.config import settings
from app.services.report_generator import report_generator
from app.services.runtime import runtime


@asynccontextmanager
async def lifespan(_: FastAPI):
    from app.services.migrations import ensure_tables
    migration_thread = threading.Thread(target=ensure_tables)
    migration_thread.start()
    migration_thread.join(timeout=30)
    await runtime.start()
    await report_generator.start()
    try:
        yield
    finally:
        await report_generator.stop()
        await runtime.stop()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.get("/api/ping")
async def ping() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
