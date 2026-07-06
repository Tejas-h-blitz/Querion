import os
import uuid
from datetime import datetime
from sqlalchemy import create_engine, Column, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

DATABASE_URL = "sqlite:///backend/querion.db"

# Ensure the backend directory exists
os.makedirs("backend", exist_ok=True)

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class QueryFingerprint(Base):
    __tablename__ = "query_fingerprints"

    fingerprint_hash = Column(String, primary_key=True, index=True)
    normalized_query = Column(Text, nullable=False)
    first_seen = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    history_items = relationship("QueryHistory", back_populates="fingerprint")

class QueryHistory(Base):
    __tablename__ = "query_history"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    fingerprint_hash = Column(String, ForeignKey("query_fingerprints.fingerprint_hash"), nullable=False)
    raw_query = Column(Text, nullable=False)
    optimized_query = Column(Text, nullable=True)
    execution_time_ms = Column(Float, nullable=True)  # Holds original execution time
    optimized_exec_time_ms = Column(Float, nullable=True)
    improvement_pct = Column(Float, nullable=True)
    plan_json = Column(Text, nullable=True)  # Holds plan JSON string
    issues_json = Column(Text, nullable=True)  # Holds issues JSON string
    index_recommendations_json = Column(Text, nullable=True)  # Holds recommendations JSON string
    user_id = Column(String, nullable=True, default="anonymous")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    fingerprint = relationship("QueryFingerprint", back_populates="history_items")
    index_runs = relationship("HypotheticalIndexRun", back_populates="history_item", cascade="all, delete-orphan")

class HypotheticalIndexRun(Base):
    __tablename__ = "hypothetical_index_runs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    query_history_id = Column(String, ForeignKey("query_history.id"), nullable=False)
    index_sql = Column(Text, nullable=False)
    estimated_cost_before = Column(Float, nullable=False)
    estimated_cost_after = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    history_item = relationship("QueryHistory", back_populates="index_runs")

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
