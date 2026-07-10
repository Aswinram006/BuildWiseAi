from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.inventory import Material, Supplier, Inventory
from app.models.project import Worker, Equipment, Project
from app.schemas.project import (
    MaterialCreate, MaterialResponse,
    SupplierCreate, SupplierResponse,
    InventoryCreate, InventoryResponse, InventoryUpdate,
    WorkerCreate, WorkerResponse, WorkerUpdate,
    EquipmentCreate, EquipmentResponse, EquipmentUpdate
)
from app.api.deps import get_current_user, RoleChecker
from app.models.user import User

router = APIRouter()

# --- Material Endpoints ---

@router.get("/materials", response_model=List[MaterialResponse])
def read_materials(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Material)
    if category:
        query = query.filter(Material.category == category)
    return query.all()

@router.post("/materials", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
def create_material(
    material_in: MaterialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "Company Owner", "Project Manager", "Contractor"]))
):
    db_material = Material(**material_in.model_dump())
    db.add(db_material)
    db.commit()
    db.refresh(db_material)
    return db_material

# --- Supplier Endpoints ---

@router.get("/suppliers", response_model=List[SupplierResponse])
def read_suppliers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Supplier).all()

@router.post("/suppliers", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(
    supplier_in: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "Company Owner", "Project Manager"]))
):
    db_supplier = Supplier(**supplier_in.model_dump())
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    return db_supplier

# --- Inventory Endpoints ---

@router.get("/projects/{project_id}/inventory", response_model=List[InventoryResponse])
def read_project_inventory(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return db.query(Inventory).filter(Inventory.project_id == project_id).all()

@router.post("/inventory", response_model=InventoryResponse, status_code=status.HTTP_201_CREATED)
def add_inventory_item(
    inventory_in: InventoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "Company Owner", "Project Manager", "Contractor", "Site Engineer"]))
):
    # Check if this material is already tracked in project inventory
    existing = db.query(Inventory).filter(
        Inventory.project_id == inventory_in.project_id,
        Inventory.material_id == inventory_in.material_id
    ).first()
    
    if existing:
        # Update existing stock
        existing.quantity_available += inventory_in.quantity_available
        existing.min_required = inventory_in.min_required
        db.commit()
        db.refresh(existing)
        return existing
        
    db_inventory = Inventory(**inventory_in.model_dump())
    db.add(db_inventory)
    db.commit()
    db.refresh(db_inventory)
    return db_inventory

@router.put("/inventory/{inventory_id}", response_model=InventoryResponse)
def update_inventory_item(
    inventory_id: int,
    inventory_in: InventoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "Company Owner", "Project Manager", "Site Engineer", "Contractor"]))
):
    inventory = db.query(Inventory).filter(Inventory.id == inventory_id).first()
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory item not found")
        
    update_data = inventory_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(inventory, field, value)
        
    db.commit()
    db.refresh(inventory)
    return inventory

# --- Worker Endpoints ---

@router.get("/projects/{project_id}/workers", response_model=List[WorkerResponse])
def read_project_workers(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Worker).filter(Worker.project_id == project_id).all()

@router.post("/workers", response_model=WorkerResponse, status_code=status.HTTP_201_CREATED)
def create_worker(
    worker_in: WorkerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "Company Owner", "Project Manager"]))
):
    db_worker = Worker(**worker_in.model_dump())
    db.add(db_worker)
    db.commit()
    db.refresh(db_worker)
    return db_worker

@router.put("/workers/{worker_id}", response_model=WorkerResponse)
def update_worker(
    worker_id: int,
    worker_in: WorkerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "Company Owner", "Project Manager", "Site Engineer"]))
):
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
        
    update_data = worker_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(worker, field, value)
        
    db.commit()
    db.refresh(worker)
    return worker

# --- Equipment Endpoints ---

@router.get("/projects/{project_id}/equipment", response_model=List[EquipmentResponse])
def read_project_equipment(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Equipment).filter(Equipment.project_id == project_id).all()

@router.post("/equipment", response_model=EquipmentResponse, status_code=status.HTTP_201_CREATED)
def create_equipment(
    equipment_in: EquipmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "Company Owner", "Project Manager"]))
):
    db_equipment = Equipment(**equipment_in.model_dump())
    db.add(db_equipment)
    db.commit()
    db.refresh(db_equipment)
    return db_equipment

@router.put("/equipment/{equipment_id}", response_model=EquipmentResponse)
def update_equipment(
    equipment_id: int,
    equipment_in: EquipmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "Company Owner", "Project Manager", "Site Engineer", "Contractor"]))
):
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
        
    update_data = equipment_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(equipment, field, value)
        
    db.commit()
    db.refresh(equipment)
    return equipment
