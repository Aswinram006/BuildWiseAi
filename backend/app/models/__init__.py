from app.core.database import Base
from app.models.user import User, Company
from app.models.project import Project, Task, Milestone, Worker, Equipment
from app.models.budget import Budget
from app.models.inventory import Supplier, Material, Inventory
from app.models.document import Document
from app.models.report import Report, Notification, AuditLog, AIPrediction

# This list defines what is imported when from app.models import * is called.
# It also ensures all models are loaded onto the Base class for Alembic to auto-generate schema tables.
__all__ = [
    "Base",
    "User",
    "Company",
    "Project",
    "Task",
    "Milestone",
    "Worker",
    "Equipment",
    "Budget",
    "Supplier",
    "Material",
    "Inventory",
    "Document",
    "Report",
    "Notification",
    "AuditLog",
    "AIPrediction",
]
