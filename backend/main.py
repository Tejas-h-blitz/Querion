import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# Load environment variables from the absolute path relative to this file
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

# Import routers, DB init, and rate limiter
from routers.analyze import router as analyze_router
from routers.explain import router as explain_router
from routers.history import router as history_router
from routers.indexes import router as indexes_router
from routers.batch import router as batch_router
from services.db import init_db
from services.rate_limiter import limiter

app = FastAPI(
    title="Querion API",
    description="AI SQL Query Optimizer Backend",
    version="2.0.0"
)

# Initialize Database on Startup
@app.on_event("startup")
def on_startup():
    init_db()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure slowapi Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Include Routers
app.include_router(analyze_router)
app.include_router(explain_router)
app.include_router(history_router)
app.include_router(indexes_router)
app.include_router(batch_router)

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "Querion API",
        "description": "PostgreSQL AI query optimization engine with HypoPG, Job Queues, and SQLite fingerprint cache"
    }
