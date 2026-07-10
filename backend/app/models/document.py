from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
import datetime
from app.core.database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False) # contract, invoice, report, drawing
    ocr_text = Column(String, nullable=True)
    summary = Column(String, nullable=True)
    extraction_results = Column(JSON, nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="documents")
    uploader = relationship("User", back_populates="documents")
