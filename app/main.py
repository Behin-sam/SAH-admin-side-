"""Trauma-Informed AI Support System — API Entry Point.

Run with: uvicorn app.main:app --reload --port 8000

OpenAPI docs at: http://localhost:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import survivors, consent, checkins, counselor, sync, veterans, tasks, gps, groups, admin, chat
from app.database import engine, Base

app = FastAPI(
    title="SAH — Trauma-Informed Support System",
    description=(
        "AI-powered mental health and wellness system for veterans. "
        "Features daily tasks, GPS tracking, group activities, points system, "
        "and admin analytics. All signals are opt-in and veteran-controlled. "
    ),
    version="0.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow frontend dev server + mobile app
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8099",
        "http://localhost:19006",
        "http://127.0.0.1:8099",
        "http://127.0.0.1:19006",
        "*",  # Allow all for mobile/Expo
    ],
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

# Gamified veteran wellness routers
app.include_router(veterans.router)
app.include_router(tasks.router)
app.include_router(gps.router)
app.include_router(groups.router)
app.include_router(admin.router)
app.include_router(chat.router)


@app.on_event("startup")
async def startup():
    """Create tables on startup (dev only — use Alembic in production)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/")
async def root():
    return {
        "name": "SAH — Veteran Wellness System",
        "version": "0.2.0",
        "status": "prototype",
        "features": [
            "Daily mental & physical tasks",
            "GPS tracking for activities",
            "Veteran groups & social activities",
            "Points & rewards system",
            "Admin dashboard & analytics",
        ],
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
