from fastapi import APIRouter, HTTPException, status
from models.schemas import ExplainRequest
from services.db_service import validate_query_safety, execute_explain_analyze
from services.explain_parser import parse_explain_output

router = APIRouter(prefix="/api", tags=["explain"])

@router.post("/explain")
async def explain_queries(payload: ExplainRequest):
    # 1. Validate safety for BOTH original and optimized queries
    is_original_safe, orig_err = validate_query_safety(payload.original_query)
    if not is_original_safe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Original Query Error: {orig_err}"
        )
        
    is_optimized_safe, opt_err = validate_query_safety(payload.optimized_query)
    if not is_optimized_safe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Optimized Query Error: {opt_err}"
        )
        
    # 2. Execute explain analyze on original query
    try:
        raw_orig_plan = await execute_explain_analyze(
            payload.original_query,
            payload.connection_string
        )
        parsed_orig = parse_explain_output(raw_orig_plan)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to explain original query: {str(e)}"
        )
        
    # 3. Execute explain analyze on optimized query
    try:
        raw_opt_plan = await execute_explain_analyze(
            payload.optimized_query,
            payload.connection_string
        )
        parsed_opt = parse_explain_output(raw_opt_plan)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to explain optimized query: {str(e)}"
        )
        
    # 4. Return both plan details
    return {
        "original": parsed_orig,
        "optimized": parsed_opt
    }
