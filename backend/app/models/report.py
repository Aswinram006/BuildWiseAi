from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
import datetime
from app.core.database import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    report_type = Column(String, nullable=False) # daily, weekly, monthly, safety, budget
    content = Column(String, nullable=False)
    generated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="reports")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)
    type = Column(String, default="alert", nullable=False) # alert, task, budget
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    action = Column(String, nullable=False, index=True)
    details = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="audit_logs")


class AIPrediction(Base):
    __tablename__ = "ai_predictions"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    prediction_type = Column(String, nullable=False) # risk, cost
    prediction_results = Column(JSON, nullable=False)
    confidence = Column(Float, default=1.0)
    recommendations = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="predictions")
