import asyncio
import uuid
import hashlib
import json
import re
import sqlglot
from sqlglot import exp
from datetime import datetime
from typing import Dict, Any, AsyncGenerator
from services.db_service import validate_query_safety, execute_explain_analyze
from services.explain_parser import parse_explain_output
from services.llm_service import LLMService
from services.db import SessionLocal, QueryFingerprint, QueryHistory

class JobManager:
    def __init__(self):
        self.jobs: Dict[str, asyncio.Queue] = {}
        self.results: Dict[str, Any] = {}

    def create_job(self) -> str:
        job_id = str(uuid.uuid4())
        self.jobs[job_id] = asyncio.Queue()
        return job_id

    async def update_job(self, job_id: str, stage: str, status: str, detail: str = "", data: Any = None):
        if job_id in self.jobs:
            payload = {
                "stage": stage,
                "status": status,
                "detail": detail
            }
            if data is not None:
                payload["data"] = data
            await self.jobs[job_id].put(payload)

    async def finish_job(self, job_id: str, result: Any):
        self.results[job_id] = result
        await self.update_job(job_id, "done", "completed", data=result)
        await self.jobs[job_id].put(None)

    async def fail_job(self, job_id: str, error_message: str):
        await self.update_job(job_id, "error", "failed", detail=error_message)
        await self.jobs[job_id].put(None)

    async def stream_job(self, job_id: str) -> AsyncGenerator[str, None]:
        if job_id not in self.jobs:
            yield f"data: {json.dumps({'stage': 'error', 'status': 'failed', 'detail': 'Job not found'})}\n\n"
            return

        queue = self.jobs[job_id]
        while True:
            item = await queue.get()
            if item is None:
                break
            yield f"data: {json.dumps(item)}\n\n"
            queue.task_done()

job_manager = JobManager()
llm_service = LLMService()

def compute_query_fingerprint(query: str) -> tuple[str, str]:
    """Normalizes whitespace, removes literals and comments to produce a stable query fingerprint."""
    sql_clean = re.sub(r"/\*.*?\*/", "", query, flags=re.DOTALL)
    
    # Strip comments line-by-line
    lines = []
    for line in sql_clean.splitlines():
        if "--" in line:
            # simple strip for standard query comments
            parts = line.split("--", 1)
            lines.append(parts[0])
        else:
            lines.append(line)
    sql_clean = "\n".join(lines).strip()
    
    try:
        parsed = sqlglot.parse_one(sql_clean, read="postgres")
        # Replace all literal nodes with placeholder "?"
        for literal in parsed.find_all(exp.Literal):
            literal.replace(exp.Literal.string("?"))
        normalized = parsed.sql()
    except Exception:
        # Robust regex-based fallback query normalization
        normalized = re.sub(r"'[^']*'", "'?'", sql_clean)
        normalized = re.sub(r'"[^"]*"', '"?"', normalized)
        normalized = re.sub(r'\b\d+\b', '?', normalized)
        normalized = re.sub(r"\s+", " ", normalized)
        normalized = normalized.strip().lower()
        
    fingerprint_hash = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
    return fingerprint_hash, normalized

async def run_analysis_job(job_id: str, query: str, connection_string: str, user_id: str = "anonymous"):
    try:
        # Stage 1: Parsing
        await job_manager.update_job(job_id, "parsing", "active", "Validating query syntax and safety sandboxing...")
        is_safe, error_msg = validate_query_safety(query)
        if not is_safe:
            await job_manager.fail_job(job_id, error_msg)
            return

        fingerprint_hash, normalized_query = compute_query_fingerprint(query)
        
        # Check SQLite db cache for fingerprint
        db = SessionLocal()
        try:
            cached_fingerprint = db.query(QueryFingerprint).filter(QueryFingerprint.fingerprint_hash == fingerprint_hash).first()
            if cached_fingerprint:
                latest_history = db.query(QueryHistory).filter(QueryHistory.fingerprint_hash == fingerprint_hash).order_by(QueryHistory.created_at.desc()).first()
                if latest_history and latest_history.optimized_query:
                    # Stream cached progress updates immediately
                    await job_manager.update_job(job_id, "parsing", "completed", "Loaded from cache!")
                    await job_manager.update_job(job_id, "explain", "completed", "Loaded from cache!")
                    await job_manager.update_job(job_id, "ai", "completed", "Loaded from cache!")
                    await job_manager.update_job(job_id, "recommendations", "completed", "Loaded from cache!")
                    
                    issues = json.loads(latest_history.issues_json or "[]")
                    recs = json.loads(latest_history.index_recommendations_json or "[]")
                    
                    explain_data = None
                    try:
                        explain_data = json.loads(latest_history.plan_json)
                    except Exception:
                        pass
                        
                    response_data = {
                        "issues": issues,
                        "optimized_query": latest_history.optimized_query,
                        "changes": ["Optimized query retrieved from local cache."],
                        "index_recommendations": recs,
                        "summary": "This query was previously optimized. Reused cached plan tree and index insights.",
                        "fingerprint": fingerprint_hash,
                        "history_id": latest_history.id,
                        "original_exec_time_ms": latest_history.execution_time_ms,
                        "optimized_exec_time_ms": latest_history.optimized_exec_time_ms,
                        "improvement_pct": latest_history.improvement_pct,
                        "explain_data": explain_data
                    }
                    await job_manager.finish_job(job_id, response_data)
                    return
        finally:
            db.close()

        await job_manager.update_job(job_id, "parsing", "completed")

        # Stage 2: EXPLAIN ANALYZE
        await job_manager.update_job(job_id, "explain", "active", "Executing EXPLAIN ANALYZE on your database...")
        try:
            raw_plan = await execute_explain_analyze(query, connection_string)
        except Exception as e:
            await job_manager.fail_job(job_id, f"Database Explain Error: {str(e)}")
            return
            
        try:
            parsed_plan = parse_explain_output(raw_plan)
        except Exception as e:
            await job_manager.fail_job(job_id, f"Failed to parse PostgreSQL explain plan: {str(e)}")
            return

        await job_manager.update_job(job_id, "explain", "completed")

        # Stage 3: AI Analysis
        await job_manager.update_job(job_id, "ai", "active", "Sending query plan to Gemini AI model...")
        try:
            optimization_result = await llm_service.optimize_query(
                query=query,
                explain_plan=parsed_plan["tree"]
            )
        except Exception as e:
            await job_manager.fail_job(job_id, f"AI Optimization Service Error: {str(e)}")
            return

        await job_manager.update_job(job_id, "ai", "completed")

        # Stage 4: Recommendations
        await job_manager.update_job(job_id, "recommendations", "active", "Executing explain plan for optimized query...")
        
        opt_query = optimization_result.get("optimized_query", query)
        opt_parsed_plan = None
        opt_exec_time = 0.0
        
        if opt_query.strip().upper() != query.strip().upper():
            try:
                opt_raw_plan = await execute_explain_analyze(opt_query, connection_string)
                opt_parsed_plan = parse_explain_output(opt_raw_plan)
                opt_exec_time = opt_parsed_plan.get("execution_time", 0.0)
            except Exception as e:
                print(f"Failed to explain optimized query: {str(e)}")
                opt_exec_time = 0.0

        orig_exec_time = parsed_plan.get("execution_time", 0.0)
        improvement_pct = 0.0
        if orig_exec_time > 0:
            improvement_pct = ((orig_exec_time - opt_exec_time) / orig_exec_time) * 100

        # Save to SQLite database
        db = SessionLocal()
        try:
            fingerprint = db.query(QueryFingerprint).filter(QueryFingerprint.fingerprint_hash == fingerprint_hash).first()
            if not fingerprint:
                fingerprint = QueryFingerprint(
                    fingerprint_hash=fingerprint_hash,
                    normalized_query=normalized_query,
                    first_seen=datetime.utcnow(),
                    last_seen=datetime.utcnow()
                )
                db.add(fingerprint)
            else:
                fingerprint.last_seen = datetime.utcnow()
                
            history_item = QueryHistory(
                fingerprint_hash=fingerprint_hash,
                raw_query=query,
                optimized_query=opt_query,
                execution_time_ms=orig_exec_time,
                optimized_exec_time_ms=opt_exec_time,
                improvement_pct=max(0.0, improvement_pct),
                plan_json=json.dumps(parsed_plan),
                issues_json=json.dumps(optimization_result.get("issues", [])),
                index_recommendations_json=json.dumps(optimization_result.get("index_recommendations", [])),
                user_id=user_id,
                created_at=datetime.utcnow()
            )
            db.add(history_item)
            db.commit()
            db.refresh(history_item)
            
            history_id = history_item.id
        except Exception as db_err:
            db.rollback()
            print(f"Failed to save history in local DB: {str(db_err)}")
            history_id = str(uuid.uuid4())
        finally:
            db.close()

        await job_manager.update_job(job_id, "recommendations", "completed")

        # Package results
        result_response = {
            "issues": optimization_result.get("issues", []),
            "optimized_query": opt_query,
            "changes": optimization_result.get("changes", []),
            "index_recommendations": optimization_result.get("index_recommendations", []),
            "summary": optimization_result.get("summary", ""),
            "fingerprint": fingerprint_hash,
            "history_id": history_id,
            "original_exec_time_ms": orig_exec_time,
            "optimized_exec_time_ms": opt_exec_time,
            "improvement_pct": max(0.0, improvement_pct),
            "explain_data": {
                "original": parsed_plan,
                "optimized": opt_parsed_plan or {"tree": {}, "planning_time": 0.0, "execution_time": 0.0}
            }
        }
        await job_manager.finish_job(job_id, result_response)
        
    except Exception as e:
        await job_manager.fail_job(job_id, f"Unexpected error during job execution: {str(e)}")
