from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey
from sqlalchemy.orm import relationship
import datetime
from app.core.database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(String, nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    budget = Column(Float, default=0.0)
    status = Column(String, default="active", nullable=False) # active, delayed, completed
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    client_name = Column(String, nullable=True)
    location = Column(String, nullable=True)
    building_type = Column(String, nullable=True)
    floors = Column(Integer, default=1, nullable=True)
    material_quality = Column(String, default="Standard", nullable=True)
    blueprint_path = Column(String, nullable=True)
    assigned_pm_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_engineer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    company = relationship("Company", back_populates="projects")
    assigned_pm = relationship("User", foreign_keys=[assigned_pm_id])
    assigned_engineer = relationship("User", foreign_keys=[assigned_engineer_id])
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    milestones = relationship("Milestone", back_populates="project", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="project", cascade="all, delete-orphan")
    inventory = relationship("Inventory", back_populates="project", cascade="all, delete-orphan")
    workers = relationship("Worker", back_populates="project")
    equipment = relationship("Equipment", back_populates="project")
    documents = relationship("Document", back_populates="project", cascade="all, delete-orphan")
    predictions = relationship("AIPrediction", back_populates="project", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="project", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(String, nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String, default="pending", nullable=False) # pending, in_progress, completed
    priority = Column(String, default="medium", nullable=False) # low, medium, high
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    assigned_to = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="tasks")
    assignee = relationship("User", back_populates="assigned_tasks")


class Milestone(Base):
    __tablename__ = "milestones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    due_date = Column(Date, nullable=False)
    status = Column(String, default="pending", nullable=False) # pending, achieved
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="milestones")


class Worker(Base):
    __tablename__ = "workers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    role = Column(String, nullable=False) # engineer, laborer, foreman, safety
    hourly_rate = Column(Float, nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    status = Column(String, default="active", nullable=False) # active, inactive
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="workers")


class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    type = Column(String, nullable=False)
    daily_rate = Column(Float, nullable=False)
    status = Column(String, default="available", nullable=False) # available, in_use, maintenance
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="equipment")
