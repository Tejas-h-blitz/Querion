from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
import sqlglot
from sqlglot import exp
import asyncpg
import json
from services.db_service import strip_sql_comments
from typing import List, Dict, Any

router = APIRouter(prefix="/api/batch", tags=["batch"])

@router.post("/analyze")
async def batch_analyze_sql_file(
    connection_string: str = Form(..., description="PostgreSQL connection string"),
    file: UploadFile = File(..., description="Upload SQL file containing queries")
):
    if not connection_string.startswith("postgresql://") and not connection_string.startswith("postgres://"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid connection string format. Must start with postgresql:// or postgres://"
        )

    try:
        content = await file.read()
        sql_text = content.decode("utf-8")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read file: {str(e)}"
        )
    
    # Clean SQL comments
    sql_clean = strip_sql_comments(sql_text)
    
    try:
        statements = sqlglot.parse(sql_clean, read="postgres")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse SQL file statements: {str(e)}"
        )
        
    report = []
    
    for idx, stmt in enumerate(statements):
        if not stmt:
            continue
            
        query_sql = stmt.sql()
        query_type = type(stmt).__name__.upper()
        
        # We only check Select, Union, or standard query classes
        if not isinstance(stmt, (exp.Select, exp.Union, exp.Query)):
            report.append({
                "index": idx,
                "query": query_sql,
                "type": query_type,
                "eligible": False,
                "cost": 0.0,
                "severity": "info",
                "message": f"Skipped: Command is of type '{query_type}' (not a SELECT)."
            })
            continue
            
        try:
            # Connect to database and run quick EXPLAIN (FORMAT JSON)
            conn = await asyncpg.connect(connection_string, timeout=10)
            try:
                tr = conn.transaction()
                await tr.start()
                try:
                    await conn.execute("SET LOCAL statement_timeout = 3000")
                    # Ensure query does not have trailing semicolon for explain execution
                    explain_stmt = query_sql.strip()
                    if explain_stmt.endswith(';'):
                        explain_stmt = explain_stmt[:-1].strip()
                        
                    explain_query = f"EXPLAIN (FORMAT JSON) {explain_stmt}"
                    raw_plan = await conn.fetchval(explain_query)
                    
                    plan = json.loads(raw_plan) if isinstance(raw_plan, str) else raw_plan
                    cost = plan[0]["Plan"]["Total Cost"]
                    
                    # Analyze severity metrics
                    severity = "success"
                    message = "Query is optimal."
                    
                    # Check plan contents for seq scan
                    plan_str = json.dumps(plan).upper()
                    if "SEQ SCAN" in plan_str:
                        severity = "warning"
                        message = "Sequential scan detected. Recommending an index."
                    
                    if cost > 1000:
                        severity = "warning"
                        message = f"High cost warning: Planner cost is {cost}."
                    
                    if cost > 10000:
                        severity = "danger"
                        message = f"Critical performance alert: Total cost is {cost}."
                        
                    report.append({
                        "index": idx,
                        "query": query_sql,
                        "type": "SELECT",
                        "eligible": True,
                        "cost": cost,
                        "severity": severity,
                        "message": message
                    })
                finally:
                    await tr.rollback()
            finally:
                await conn.close()
                
        except Exception as e:
            report.append({
                "index": idx,
                "query": query_sql,
                "type": "SELECT",
                "eligible": True,
                "cost": 0.0,
                "severity": "danger",
                "message": f"Database Error: {str(e)}"
            })
            
    return {
        "filename": file.filename,
        "total_statements": len(statements),
        "queries_analyzed": len([r for r in report if r["eligible"]]),
        "report": report
    }
