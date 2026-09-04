"""Trauma-Informed AI Support System — API Entry Point.

Run with: uvicorn app.main:app --reload --port 8000

OpenAPI docs at: http://localhost:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import survivors, consent, checkins, counselor, sync
from app.database import engine, Base

app = FastAPI(
    title="SAH — Trauma-Informed Support System",
    description=(
        "AI-powered mental health distress-prediction backend for survivors. "
        "This is a prototype/hackathon project — NOT a diagnostic or "
        "surveillance system. All signals are opt-in and survivor-controlled."
    ),
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(survivors.router)
app.include_router(consent.router)
app.include_router(checkins.router)
app.include_router(counselor.router)
app.include_router(sync.router)


@app.on_event("startup")
async def startup():
    """Create tables on startup (dev only — use Alembic in production)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/")
async def root():
    return {
        "name": "SAH — Trauma-Informed Support System",
        "version": "0.1.0",
        "status": "prototype",
        "docs": "/docs",
        "warning": "This is a hackathon prototype. NOT for clinical use.",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
