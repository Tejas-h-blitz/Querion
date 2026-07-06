from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import Optional
from services.db_service import run_hypopg_simulation
from services.db import SessionLocal, HypotheticalIndexRun
from sqlalchemy.orm import Session
import uuid

router = APIRouter(prefix="/api/indexes", tags=["indexes"])

class SimulateIndexRequest(BaseModel):
    query: str = Field(..., description="The query to run EXPLAIN on")
    index_sql: str = Field(..., description="The CREATE INDEX statement recommended by AI")
    connection_string: str = Field(..., description="Target database connection string")
    query_history_id: Optional[str] = Field(None, description="Optional ID of the query history log link")

class SimulateIndexResponse(BaseModel):
    success: bool
    cost_before: float
    cost_after: float
    reduction_pct: float
    index_sql: str
    error: Optional[str] = None

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/simulate", response_model=SimulateIndexResponse)
async def simulate_index(payload: SimulateIndexRequest, db: Session = Depends(get_db)):
    result = await run_hypopg_simulation(
        query=payload.query,
        index_sql=payload.index_sql,
        connection_string=payload.connection_string
    )
    
    if not result["success"]:
        # We don't fail with HTTP 500/400 because we want to return a structured error status
        # to the frontend (e.g. telling the user hypopg is not installed).
        return SimulateIndexResponse(
            success=False,
            cost_before=0.0,
            cost_after=0.0,
            reduction_pct=0.0,
            index_sql=payload.index_sql,
            error=result.get("error", "Unknown simulation error")
        )
        
    # Persist the simulation run to database if linked to a history item
    if payload.query_history_id:
        try:
            run_log = HypotheticalIndexRun(
                id=str(uuid.uuid4()),
                query_history_id=payload.query_history_id,
                index_sql=payload.index_sql,
                estimated_cost_before=result["cost_before"],
                estimated_cost_after=result["cost_after"]
            )
            db.add(run_log)
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Failed to save index simulation run to database: {str(e)}")
            
    return SimulateIndexResponse(
        success=True,
        cost_before=result["cost_before"],
        cost_after=result["cost_after"],
        reduction_pct=result["reduction_pct"],
        index_sql=result["index_sql"]
    )
