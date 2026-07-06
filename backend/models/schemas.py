from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class AnalyzeRequest(BaseModel):
    query: str = Field(..., description="The SELECT SQL query to analyze")
    connection_string: str = Field(..., description="PostgreSQL connection string")

class ExplainRequest(BaseModel):
    original_query: str = Field(..., description="The original SQL query")
    optimized_query: str = Field(..., description="The optimized SQL query")
    connection_string: str = Field(..., description="PostgreSQL connection string")

class Issue(BaseModel):
    type: str = Field(..., description="Type of issue, e.g., missing index, seq scan")
    description: str = Field(..., description="Explanation of the issue")
    severity: str = Field(..., description="Severity level: low, medium, high")
    node: str = Field(..., description="The query plan node where it occurs")
    confidence: str = Field("medium", description="Confidence score: low, medium, high")

class IndexRecommendation(BaseModel):
    sql: str = Field(..., description="SQL command to create the index")
    reason: str = Field(..., description="Explanation of why this index helps")

class AnalyzeResponse(BaseModel):
    issues: List[Issue]
    optimized_query: str
    changes: List[str]
    index_recommendations: List[IndexRecommendation]
    summary: str

class HistoryCreate(BaseModel):
    user_id: str
    original_query: str
    optimized_query: str
    issues: Any
    index_recommendations: Any
    original_exec_time_ms: Optional[float] = None
    optimized_exec_time_ms: Optional[float] = None
    improvement_pct: Optional[float] = None

class HistoryItem(HistoryCreate):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True
