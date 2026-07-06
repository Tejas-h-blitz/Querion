from fastapi import APIRouter, HTTPException, status, Query, Depends
from typing import List, Dict, Any, Optional
from datetime import datetime
from services.db import SessionLocal, QueryHistory, QueryFingerprint
from sqlalchemy.orm import Session
from pydantic import BaseModel

router = APIRouter(prefix="/api/history", tags=["history"])

class HistoryItemResponse(BaseModel):
    id: str
    fingerprint_hash: str
    raw_query: str
    optimized_query: Optional[str] = None
    execution_time_ms: Optional[float] = None
    optimized_exec_time_ms: Optional[float] = None
    improvement_pct: Optional[float] = None
    plan_json: Optional[str] = None
    issues_json: Optional[str] = None
    index_recommendations_json: Optional[str] = None
    user_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=List[HistoryItemResponse])
async def get_history(
    user_id: str = Query(..., description="The user's unique ID"),
    db: Session = Depends(get_db)
):
    try:
        items = db.query(QueryHistory)\
            .filter(QueryHistory.user_id == user_id)\
            .order_by(QueryHistory.created_at.desc())\
            .all()
        return items
    except Exception as e:
        print(f"Error fetching SQLite query history: {str(e)}")
        return []

@router.get("/recent", response_model=List[HistoryItemResponse])
async def get_recent_history(
    limit: int = Query(8, description="Number of items to fetch"),
    db: Session = Depends(get_db)
):
    try:
        # Fetch latest global queries
        items = db.query(QueryHistory)\
            .order_by(QueryHistory.created_at.desc())\
            .limit(limit)\
            .all()
        return items
    except Exception as e:
        print(f"Error fetching recent history: {str(e)}")
        return []

@router.delete("/{id}")
async def delete_history(id: str, db: Session = Depends(get_db)):
    try:
        item = db.query(QueryHistory).filter(QueryHistory.id == id).first()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="History log not found")
        db.delete(item)
        db.commit()
        return {"status": "success", "message": "Query history item deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database delete failed: {str(e)}"
        )

@router.get("/{fingerprint}/trend")
async def get_fingerprint_trend(fingerprint: str, db: Session = Depends(get_db)):
    """
    Returns time-series performance data for a specific query fingerprint.
    Flags execution regressions if execution time exceeds 1.2x (20% increase) of the running baseline.
    """
    runs = db.query(QueryHistory)\
        .filter(QueryHistory.fingerprint_hash == fingerprint)\
        .order_by(QueryHistory.created_at.asc())\
        .all()
        
    trend_runs = []
    total_time = 0.0
    count = 0
    
    for i, run in enumerate(runs):
        exec_time = run.execution_time_ms or 0.0
        regressed = False
        regression_pct = 0.0
        
        # We calculate the baseline as the average execution time of the previous runs
        if count > 0:
            baseline = total_time / count
            if baseline > 0 and exec_time > 1.2 * baseline:
                regressed = True
                regression_pct = ((exec_time - baseline) / baseline) * 100
        else:
            baseline = exec_time
            
        trend_runs.append({
            "id": run.id,
            "created_at": run.created_at,
            "execution_time_ms": exec_time,
            "optimized_exec_time_ms": run.optimized_exec_time_ms or 0.0,
            "baseline_ms": baseline,
            "regressed": regressed,
            "regression_pct": regression_pct
        })
        
        total_time += exec_time
        count += 1
        
    return {
        "fingerprint": fingerprint,
        "runs": trend_runs
    }
