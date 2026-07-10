from pydantic import BaseModel
from typing import Optional, List
import datetime

# --- Company schemas (Minimal reference) ---
class CompanyResponse(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True

# --- User schemas (Minimal reference) ---
class UserMinResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    class Config:
        from_attributes = True

# --- Project Schemas ---
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: datetime.date
    end_date: datetime.date
    budget: float = 0.0
    status: str = "active" # active, delayed, completed
    client_name: Optional[str] = None
    location: Optional[str] = None
    building_type: Optional[str] = None
    floors: Optional[int] = 1
    material_quality: Optional[str] = "Standard"
    blueprint_path: Optional[str] = None
    assigned_pm_id: Optional[int] = None
    assigned_engineer_id: Optional[int] = None

class ProjectCreate(ProjectBase):
    company_id: int

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime.date] = None
    end_date: Optional[datetime.date] = None
    budget: Optional[float] = None
    status: Optional[str] = None
    client_name: Optional[str] = None
    location: Optional[str] = None
    building_type: Optional[str] = None
    floors: Optional[int] = None
    material_quality: Optional[str] = None
    blueprint_path: Optional[str] = None
    assigned_pm_id: Optional[int] = None
    assigned_engineer_id: Optional[int] = None

class ProjectResponse(ProjectBase):
    id: int
    company_id: int
    created_at: datetime.datetime
    class Config:
        from_attributes = True

# --- Task Schemas ---
class TaskBase(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: datetime.date
    end_date: datetime.date
    status: str = "pending" # pending, in_progress, completed
    priority: str = "medium" # low, medium, high
    assigned_to: Optional[int] = None

class TaskCreate(TaskBase):
    project_id: int

class TaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime.date] = None
    end_date: Optional[datetime.date] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[int] = None

class TaskResponse(TaskBase):
    id: int
    project_id: int
    created_at: datetime.datetime
    assignee: Optional[UserMinResponse] = None
    class Config:
        from_attributes = True

# --- Milestone Schemas ---
class MilestoneBase(BaseModel):
    name: str
    description: Optional[str] = None
    due_date: datetime.date
    status: str = "pending" # pending, achieved

class MilestoneCreate(MilestoneBase):
    project_id: int

class MilestoneUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime.date] = None
    status: Optional[str] = None

class MilestoneResponse(MilestoneBase):
    id: int
    project_id: int
    created_at: datetime.datetime
    class Config:
        from_attributes = True

# --- Budget Schemas ---
class BudgetBase(BaseModel):
    category: str # material, labor, equipment, permits, overhead
    allocated: float
    spent: float = 0.0

class BudgetCreate(BudgetBase):
    project_id: int

class BudgetUpdate(BaseModel):
    allocated: Optional[float] = None
    spent: Optional[float] = None

class BudgetResponse(BudgetBase):
    id: int
    project_id: int
    created_at: datetime.datetime
    class Config:
        from_attributes = True

# --- Supplier Schemas ---
class SupplierBase(BaseModel):
    name: str
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierResponse(SupplierBase):
    id: int
    created_at: datetime.datetime
    class Config:
        from_attributes = True

# --- Material Schemas ---
class MaterialBase(BaseModel):
    name: str
    category: Optional[str] = None
    unit: str
    unit_price: float
    supplier_id: Optional[int] = None

class MaterialCreate(MaterialBase):
    pass

class MaterialResponse(MaterialBase):
    id: int
    created_at: datetime.datetime
    supplier: Optional[SupplierResponse] = None
    class Config:
        from_attributes = True

# --- Inventory Schemas ---
class InventoryBase(BaseModel):
    quantity_available: float
    quantity_reserved: float = 0.0
    min_required: float = 0.0

class InventoryCreate(InventoryBase):
    project_id: int
    material_id: int

class InventoryUpdate(BaseModel):
    quantity_available: Optional[float] = None
    quantity_reserved: Optional[float] = None
    min_required: Optional[float] = None

class InventoryResponse(InventoryBase):
    id: int
    project_id: int
    material_id: int
    created_at: datetime.datetime
    material: Optional[MaterialResponse] = None
    class Config:
        from_attributes = True

# --- Worker Schemas ---
class WorkerBase(BaseModel):
    name: str
    role: str # engineer, laborer, foreman, safety
    hourly_rate: float
    status: str = "active" # active, inactive

class WorkerCreate(WorkerBase):
    project_id: Optional[int] = None

class WorkerUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    hourly_rate: Optional[float] = None
    project_id: Optional[int] = None
    status: Optional[str] = None

class WorkerResponse(WorkerBase):
    id: int
    project_id: Optional[int] = None
    created_at: datetime.datetime
    class Config:
        from_attributes = True

# --- Equipment Schemas ---
class EquipmentBase(BaseModel):
    name: str
    type: str
    daily_rate: float
    status: str = "available" # available, in_use, maintenance

class EquipmentCreate(EquipmentBase):
    project_id: Optional[int] = None

class EquipmentUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    daily_rate: Optional[float] = None
    project_id: Optional[int] = None
    status: Optional[str] = None

class EquipmentResponse(EquipmentBase):
    id: int
    project_id: Optional[int] = None
    created_at: datetime.datetime
    class Config:
        from_attributes = True


# --- Notification Schemas ---
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    is_read: bool
    type: str
    created_at: datetime.datetime
    class Config:
        from_attributes = True
