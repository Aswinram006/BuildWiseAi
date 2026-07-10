from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from typing import List, Optional
import os
import uuid
import shutil
import datetime
import math

from app.core.database import get_db
from app.models.project import Project, Task, Milestone
from app.models.budget import Budget
from app.schemas.project import (
    ProjectCreate, ProjectResponse, ProjectUpdate,
    TaskCreate, TaskResponse, TaskUpdate,
    MilestoneCreate, MilestoneResponse, MilestoneUpdate,
    BudgetCreate, BudgetResponse, BudgetUpdate
)
from app.api.deps import get_current_user, RoleChecker
from app.models.user import User
from app.services.vision_service import vision_service
from app.services.estimation_service import estimation_service
from app.services.report_generator import report_generator
from app.models.report import AIPrediction, Notification, Report
from app.models.inventory import Inventory, Material

router = APIRouter()

# --- Project Endpoints ---

@router.get("/", response_model=List[ProjectResponse])
def read_projects(
    status: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "name",
    sort_order: str = "asc",
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Project)
    
    # Filter by user's company (unless Admin)
    if current_user.role != "Administrator" and current_user.company_id:
        query = query.filter(Project.company_id == current_user.company_id)
        
    # Filtering
    if status:
        query = query.filter(Project.status == status)
        
    # Search
    if search:
        query = query.filter(
            or_(
                Project.name.ilike(f"%{search}%"),
                Project.description.ilike(f"%{search}%")
            )
        )
        
    # Sorting validation
    valid_cols = ["id", "name", "start_date", "end_date", "budget", "status", "created_at"]
    if sort_by not in valid_cols:
        sort_by = "name"
        
    col_attr = getattr(Project, sort_by)
    if sort_order.lower() == "desc":
        query = query.order_by(desc(col_attr))
    else:
        query = query.order_by(asc(col_attr))
        
    # Pagination
    return query.offset(skip).limit(limit).all()

@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "Company Owner", "Project Manager"]))
):
    db_project = Project(**project_in.model_dump())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)

    if db_project.budget and db_project.budget > 0:
        # Pre-populate default budget category allocations
        budgets = [
            Budget(project_id=db_project.id, category="material", allocated=db_project.budget * 0.43, spent=0.0),
            Budget(project_id=db_project.id, category="labor", allocated=db_project.budget * 0.35, spent=0.0),
            Budget(project_id=db_project.id, category="equipment", allocated=db_project.budget * 0.12, spent=0.0),
            Budget(project_id=db_project.id, category="permits", allocated=db_project.budget * 0.05, spent=0.0),
            Budget(project_id=db_project.id, category="overhead", allocated=db_project.budget * 0.05, spent=0.0),
        ]
        db.add_all(budgets)
        db.commit()
        db.refresh(db_project)

    return db_project

@router.get("/{project_id}", response_model=ProjectResponse)
def read_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # Check permissions
    if current_user.role != "Administrator" and project.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this project")
        
    return project

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "Company Owner", "Project Manager"]))
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    update_data = project_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
        
    db.commit()

    if "budget" in update_data:
        # Delete existing budget categories for this project
        db.query(Budget).filter(Budget.project_id == project_id).delete()
        
        # Add new ones if budget is greater than zero
        new_budget = update_data["budget"]
        if new_budget and new_budget > 0:
            budgets = [
                Budget(project_id=project_id, category="material", allocated=new_budget * 0.43, spent=0.0),
                Budget(project_id=project_id, category="labor", allocated=new_budget * 0.35, spent=0.0),
                Budget(project_id=project_id, category="equipment", allocated=new_budget * 0.12, spent=0.0),
                Budget(project_id=project_id, category="permits", allocated=new_budget * 0.05, spent=0.0),
                Budget(project_id=project_id, category="overhead", allocated=new_budget * 0.05, spent=0.0),
            ]
            db.add_all(budgets)
            db.commit()

    db.refresh(project)
    return project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "Company Owner", "Project Manager", "Site Engineer"]))
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    db.delete(project)
    db.commit()
    return None

# --- Task Endpoints ---

@router.get("/{project_id}/tasks", response_model=List[TaskResponse])
def read_project_tasks(
    project_id: int,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Task).filter(Task.project_id == project_id)
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    return query.all()

@router.post("/{project_id}/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_project_task(
    project_id: int,
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "Company Owner", "Project Manager", "Site Engineer"]))
):
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    db_task = Task(**task_in.model_dump())
    db_task.project_id = project_id
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.put("/tasks/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_in: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user) # Anyone authenticated can update task status if authorized
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    # Extract update data
    update_data = task_in.model_dump(exclude_unset=True)
    
    # If the user is a Contractor or Client, restrict updates to status only
    if current_user.role in ["Contractor", "Client"]:
        if len(update_data) > 1 or "status" not in update_data:
            raise HTTPException(status_code=403, detail="Your role is only allowed to update task status.")
            
    for field, value in update_data.items():
        setattr(task, field, value)
        
    db.commit()
    db.refresh(task)
    return task

# --- Milestone Endpoints ---

@router.get("/{project_id}/milestones", response_model=List[MilestoneResponse])
def read_project_milestones(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Milestone).filter(Milestone.project_id == project_id).order_by(Milestone.due_date.asc()).all()

@router.post("/{project_id}/milestones", response_model=MilestoneResponse, status_code=status.HTTP_201_CREATED)
def create_project_milestone(
    project_id: int,
    milestone_in: MilestoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "Company Owner", "Project Manager"]))
):
    db_milestone = Milestone(**milestone_in.model_dump())
    db_milestone.project_id = project_id
    db.add(db_milestone)
    db.commit()
    db.refresh(db_milestone)
    return db_milestone

@router.put("/milestones/{milestone_id}", response_model=MilestoneResponse)
def update_milestone(
    milestone_id: int,
    milestone_in: MilestoneUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "Company Owner", "Project Manager", "Site Engineer"]))
):
    milestone = db.query(Milestone).filter(Milestone.id == milestone_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
        
    update_data = milestone_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(milestone, field, value)
        
    db.commit()
    db.refresh(milestone)
    return milestone

# --- Budget Endpoints ---

@router.get("/{project_id}/budgets", response_model=List[BudgetResponse])
def read_project_budgets(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Budget).filter(Budget.project_id == project_id).all()

@router.post("/{project_id}/budgets", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def create_project_budget(
    project_id: int,
    budget_in: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "Company Owner", "Project Manager"]))
):
    db_budget = Budget(**budget_in.model_dump())
    db_budget.project_id = project_id
    db.add(db_budget)
    db.commit()
    db.refresh(db_budget)
    return db_budget

@router.put("/budgets/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: int,
    budget_in: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "Company Owner", "Project Manager"]))
):
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget item not found")
        
    update_data = budget_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(budget, field, value)
        
    db.commit()
    db.refresh(budget)
    return budget


@router.post("/create-with-blueprint/upload", status_code=status.HTTP_201_CREATED)
def create_project_with_blueprint(
    name: str = Form(...),
    client_name: str = Form(...),
    location: str = Form(...),
    building_type: str = Form(...),
    floors: int = Form(1),
    material_quality: str = Form("Standard"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "Company Owner", "Project Manager", "Site Engineer"]))
):
    # 1. Save uploaded blueprint file to disk
    input_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    if ext.lower() not in [".jpg", ".jpeg", ".png", ".pdf"]:
        ext = ".jpg"
        
    upload_dir = os.path.join("app", "static", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"blueprint_{input_id}{ext}"
    file_path = os.path.join(upload_dir, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # 2. Run CV Contour detection
    with open(file_path, "rb") as f:
        file_bytes = f.read()
    
    cv_results = vision_service.analyze_blueprint(file_bytes, filename)
    
    # 3. Call AI estimation service
    est_results = estimation_service.estimate_project(
        project_name=name,
        client_name=client_name,
        location=location,
        building_type=building_type,
        floors=floors,
        material_quality=material_quality,
        detected_rooms=cv_results["rooms"],
        detected_doors_count=len(cv_results["doors"]),
        detected_windows_count=len(cv_results["windows"])
    )
    
    # Attach OpenCV results back to est_results
    est_results["image_url"] = cv_results["image_url"]
    est_results["dimensions"] = cv_results["dimensions"]
    est_results["walls_detected"] = cv_results["walls_detected"]
    est_results["measurements"] = cv_results["measurements"]
    est_results["rooms"] = cv_results["rooms"]
    est_results["doors"] = cv_results["doors"]
    est_results["windows"] = cv_results["windows"]
    
    # 4. Find PM and Engineer to assign
    pm = db.query(User).filter(User.role == "Project Manager", User.company_id == (current_user.company_id or 1)).first()
    if not pm:
        pm = db.query(User).filter(User.role == "Project Manager").first()
        
    engineer = db.query(User).filter(User.role == "Site Engineer", User.company_id == (current_user.company_id or 1)).first()
    if not engineer:
        engineer = db.query(User).filter(User.role == "Site Engineer").first()
        
    pm_id = pm.id if pm else None
    engineer_id = engineer.id if engineer else None
    
    # Calculate dates
    start_dt = datetime.date.today()
    weeks_needed = est_results["timeline"]["total_weeks"]
    end_dt = start_dt + datetime.timedelta(weeks=weeks_needed)
    
    # 5. Create Project record
    db_project = Project(
        name=name,
        description=f"Project initialized from building plan blueprint analysis. Sourcing class: {material_quality}.",
        start_date=start_dt,
        end_date=end_dt,
        budget=est_results["cost_breakdown"]["grand_total"],
        status="active",
        company_id=current_user.company_id or 1,
        client_name=client_name,
        location=location,
        building_type=building_type,
        floors=floors,
        material_quality=material_quality,
        blueprint_path=f"/api/static/uploads/{filename}",
        assigned_pm_id=pm_id,
        assigned_engineer_id=engineer_id
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    # 6. Save AI predictions
    db_pred = AIPrediction(
        project_id=db_project.id,
        prediction_type="blueprint_analysis",
        prediction_results=est_results,
        confidence=est_results["project_assigned"]["ai_confidence_score"],
        recommendations=est_results["ai_review"]["recommendations"]["cost_optimization"]
    )
    db.add(db_pred)
    
    # 7. Pre-populate Budget breakdowns
    cb = est_results["cost_breakdown"]
    budgets = [
        Budget(project_id=db_project.id, category="material", allocated=cb["material_cost"], spent=0.0),
        Budget(project_id=db_project.id, category="labor", allocated=cb["labor_cost"], spent=0.0),
        Budget(project_id=db_project.id, category="equipment", allocated=cb["equipment_cost"], spent=0.0),
        Budget(project_id=db_project.id, category="permits", allocated=cb["gov_approval_charges"], spent=0.0),
        Budget(project_id=db_project.id, category="overhead", allocated=cb["misc_expenses"] + cb["contingency_amount"] + cb["gst_charges"], spent=0.0),
    ]
    db.add_all(budgets)
    
    # 8. Create standard timeline tasks
    phases = est_results["timeline"]["phases"]
    current_date = start_dt
    for phase in phases:
        duration_w = phase["duration_weeks"]
        phase_end = current_date + datetime.timedelta(weeks=duration_w)
        db_task = Task(
            name=phase["phase"],
            description=f"Phase: {phase['phase']} construction task.",
            start_date=current_date,
            end_date=phase_end,
            status="pending",
            priority="high" if phase["phase"] in ["Foundation", "Column Work", "Wall Construction"] else "medium",
            project_id=db_project.id,
            assigned_to=engineer_id
        )
        db.add(db_task)
        current_date = phase_end
        
    # 9. Pre-populate Project inventory quantities
    all_mats = db.query(Material).all()
    for mat_est in est_results["material_estimations"]:
        mat_record = None
        for m in all_mats:
            if m.name.lower() in mat_est["name"].lower() or mat_est["name"].lower() in m.name.lower():
                mat_record = m
                break
        
        if mat_record:
            db_inv = Inventory(
                project_id=db_project.id,
                material_id=mat_record.id,
                quantity_available=float(mat_est["quantity"]),
                quantity_reserved=0.0,
                min_required=float(math.ceil(mat_est["quantity"] * 0.6))
            )
            db.add(db_inv)
            
    # 10. Generate PDF Report automatically
    pdf_url = ""
    try:
        pdf_res = report_generator.generate_project_report(db_project.id, "blueprint", db)
        pdf_url = pdf_res.get("pdf_url", "")
    except Exception as pdf_err:
        print(f"Error generating PDF report automatically: {pdf_err}")
    est_results["pdf_url"] = pdf_url
        
    # 11. Dispatch notifications to user
    notifications = [
        Notification(user_id=current_user.id, title="Blueprint Analysis Complete", message=f"Building plan blueprint analyzed successfully for project '{name}'.", type="alert"),
        Notification(user_id=current_user.id, title="Cost Estimation Complete", message=f"Indian Rupees (₹) cost breakdown estimated for project '{name}'.", type="budget"),
        Notification(user_id=current_user.id, title="Project Review Ready", message=f"AI risk evaluation and construction sequence recommendations compiled.", type="alert"),
        Notification(user_id=current_user.id, title="Report Generation Complete", message=f"Downloadable PDF report generated for sharing with clients.", type="task"),
    ]
    db.add_all(notifications)
    db.commit()
    db.refresh(db_project)
    
    return {
        "project": jsonable_encoder(db_project),
        "blueprint_analysis": est_results
    }


@router.get("/{project_id}/blueprint-analysis")
def get_project_blueprint_analysis(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    pred = db.query(AIPrediction).filter(
        AIPrediction.project_id == project_id,
        AIPrediction.prediction_type == "blueprint_analysis"
    ).first()
    
    if not pred:
        raise HTTPException(status_code=404, detail="No blueprint analysis found for this project")
    
    return pred.prediction_results


@router.post("/{project_id}/blueprint-analysis/upload", status_code=status.HTTP_200_OK)
def upload_project_blueprint(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "Company Owner", "Project Manager", "Site Engineer"]))
):
    # 1. Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 2. Save uploaded blueprint file to disk
    input_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    if ext.lower() not in [".jpg", ".jpeg", ".png", ".pdf"]:
        ext = ".jpg"
        
    upload_dir = os.path.join("app", "static", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"blueprint_{input_id}{ext}"
    file_path = os.path.join(upload_dir, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # 3. Run CV Contour detection
    with open(file_path, "rb") as f:
        file_bytes = f.read()
    
    cv_results = vision_service.analyze_blueprint(file_bytes, filename)
    
    # 4. Call AI estimation service
    est_results = estimation_service.estimate_project(
        project_name=project.name,
        client_name=project.client_name or "",
        location=project.location or "",
        building_type=project.building_type or "Commercial",
        floors=project.floors or 1,
        material_quality=project.material_quality or "Standard",
        detected_rooms=cv_results["rooms"],
        detected_doors_count=len(cv_results["doors"]),
        detected_windows_count=len(cv_results["windows"])
    )
    
    # Attach OpenCV results back to est_results
    est_results["image_url"] = cv_results["image_url"]
    est_results["dimensions"] = cv_results["dimensions"]
    est_results["walls_detected"] = cv_results["walls_detected"]
    est_results["measurements"] = cv_results["measurements"]
    est_results["rooms"] = cv_results["rooms"]
    est_results["doors"] = cv_results["doors"]
    est_results["windows"] = cv_results["windows"]
    
    # 5. Update Project record
    project.blueprint_path = f"/api/static/uploads/{filename}"
    project.budget = est_results["cost_breakdown"]["grand_total"]
    
    # 6. Save or update AI predictions
    db_pred = db.query(AIPrediction).filter(
        AIPrediction.project_id == project_id,
        AIPrediction.prediction_type == "blueprint_analysis"
    ).first()
    
    if db_pred:
        db_pred.prediction_results = est_results
        db_pred.confidence = est_results["project_assigned"]["ai_confidence_score"]
        db_pred.recommendations = est_results["ai_review"]["recommendations"]["cost_optimization"]
    else:
        db_pred = AIPrediction(
            project_id=project_id,
            prediction_type="blueprint_analysis",
            prediction_results=est_results,
            confidence=est_results["project_assigned"]["ai_confidence_score"],
            recommendations=est_results["ai_review"]["recommendations"]["cost_optimization"]
        )
        db.add(db_pred)
        
    # 7. Update Budget breakdowns
    # Delete old budgets for this project
    db.query(Budget).filter(Budget.project_id == project_id).delete()
    
    cb = est_results["cost_breakdown"]
    budgets = [
        Budget(project_id=project_id, category="material", allocated=cb["material_cost"], spent=0.0),
        Budget(project_id=project_id, category="labor", allocated=cb["labor_cost"], spent=0.0),
        Budget(project_id=project_id, category="equipment", allocated=cb["equipment_cost"], spent=0.0),
        Budget(project_id=project_id, category="permits", allocated=cb["gov_approval_charges"], spent=0.0),
        Budget(project_id=project_id, category="overhead", allocated=cb["misc_expenses"] + cb["contingency_amount"] + cb["gst_charges"], spent=0.0),
    ]
    db.add_all(budgets)
    
    # 8. Pre-populate Project inventory quantities
    # Clear old inventory for this project first
    db.query(Inventory).filter(Inventory.project_id == project_id).delete()
    
    all_mats = db.query(Material).all()
    for mat_est in est_results["material_estimations"]:
        mat_record = None
        for m in all_mats:
            if m.name.lower() in mat_est["name"].lower() or mat_est["name"].lower() in m.name.lower():
                mat_record = m
                break
        
        if mat_record:
            db_inv = Inventory(
                project_id=project_id,
                material_id=mat_record.id,
                quantity_available=float(mat_est["quantity"]),
                quantity_reserved=0.0,
                min_required=float(math.ceil(mat_est["quantity"] * 0.6))
            )
            db.add(db_inv)
            
    # 9. Generate PDF Report automatically
    pdf_url = ""
    try:
        pdf_res = report_generator.generate_project_report(project_id, "blueprint", db)
        pdf_url = pdf_res.get("pdf_url", "")
    except Exception as pdf_err:
        print(f"Error generating PDF report automatically: {pdf_err}")
    est_results["pdf_url"] = pdf_url
        
    # 10. Dispatch notifications to user
    notifications = [
        Notification(user_id=current_user.id, title="Blueprint Analysis Complete", message=f"Building plan blueprint analyzed successfully for project '{project.name}'.", type="alert"),
        Notification(user_id=current_user.id, title="Cost Estimation Complete", message=f"Indian Rupees (₹) cost breakdown estimated for project '{project.name}'.", type="budget"),
        Notification(user_id=current_user.id, title="Project Review Ready", message=f"AI risk evaluation and construction sequence recommendations compiled.", type="alert"),
        Notification(user_id=current_user.id, title="Report Generation Complete", message=f"Downloadable PDF report generated for sharing with clients.", type="task"),
    ]
    db.add_all(notifications)
    db.commit()
    db.refresh(project)
    
    return {
        "project": jsonable_encoder(project),
        "blueprint_analysis": est_results
    }


@router.post("/{project_id}/blueprint-analysis/reanalyze")
def reanalyze_project_blueprint(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Administrator", "Company Owner", "Project Manager", "Site Engineer"]))
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.blueprint_path:
        raise HTTPException(status_code=400, detail="No blueprint file is associated with this project")
        
    filename = os.path.basename(project.blueprint_path)
    file_path = os.path.join("app", "static", "uploads", filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Stored blueprint file not found on disk")
        
    with open(file_path, "rb") as f:
        file_bytes = f.read()
        
    cv_results = vision_service.analyze_blueprint(file_bytes, filename)
    
    est_results = estimation_service.estimate_project(
        project_name=project.name,
        client_name=project.client_name,
        location=project.location,
        building_type=project.building_type,
        floors=project.floors,
        material_quality=project.material_quality,
        detected_rooms=cv_results["rooms"],
        detected_doors_count=len(cv_results["doors"]),
        detected_windows_count=len(cv_results["windows"])
    )
    
    # Attach OpenCV results back to est_results
    est_results["image_url"] = cv_results["image_url"]
    est_results["dimensions"] = cv_results["dimensions"]
    est_results["walls_detected"] = cv_results["walls_detected"]
    est_results["measurements"] = cv_results["measurements"]
    est_results["rooms"] = cv_results["rooms"]
    est_results["doors"] = cv_results["doors"]
    est_results["windows"] = cv_results["windows"]
    
    # Save/update PDF Report
    pdf_url = ""
    try:
        pdf_res = report_generator.generate_project_report(project_id, "blueprint", db)
        pdf_url = pdf_res.get("pdf_url", "")
    except Exception as pdf_err:
        print(f"Error generating PDF report automatically: {pdf_err}")
    est_results["pdf_url"] = pdf_url
    
    # Update AI predictions
    db_pred = db.query(AIPrediction).filter(
        AIPrediction.project_id == project_id,
        AIPrediction.prediction_type == "blueprint_analysis"
    ).first()
    
    if db_pred:
        db_pred.prediction_results = est_results
        db_pred.confidence = est_results["project_assigned"]["ai_confidence_score"]
        db_pred.recommendations = est_results["ai_review"]["recommendations"]["cost_optimization"]
    else:
        db_pred = AIPrediction(
            project_id=project_id,
            prediction_type="blueprint_analysis",
            prediction_results=est_results,
            confidence=est_results["project_assigned"]["ai_confidence_score"],
            recommendations=est_results["ai_review"]["recommendations"]["cost_optimization"]
        )
        db.add(db_pred)
        
    db.commit()
    return est_results
