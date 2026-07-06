from fastapi import APIRouter, HTTPException, BackgroundTasks, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from services.jobs import job_manager, run_analysis_job
from services.db_service import validate_query_safety

router = APIRouter(prefix="/api", tags=["analyze"])

class AnalyzeRequest(BaseModel):
    query: str = Field(..., description="The SELECT SQL query to analyze")
    connection_string: str = Field(..., description="PostgreSQL connection string")
    user_id: str = Field("anonymous", description="User ID for saving history")

class AnalyzeSubmitResponse(BaseModel):
    job_id: str = Field(..., description="The ID of the background analysis job")

@router.post("/analyze", response_model=AnalyzeSubmitResponse)
async def submit_analyze_query(payload: AnalyzeRequest, background_tasks: BackgroundTasks):
    # Perform a quick pre-validation of the query safety to fail early
    is_safe, error_msg = validate_query_safety(payload.query)
    if not is_safe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
        
    job_id = job_manager.create_job()
    
    # Enqueue background execution task
    background_tasks.add_task(
        run_analysis_job,
        job_id=job_id,
        query=payload.query,
        connection_string=payload.connection_string,
        user_id=payload.user_id
    )
    
    return AnalyzeSubmitResponse(job_id=job_id)

@router.get("/analyze/stream/{job_id}")
async def stream_analysis_progress(job_id: str):
    return StreamingResponse(
        job_manager.stream_job(job_id),
        media_type="text/event-stream"
    )
