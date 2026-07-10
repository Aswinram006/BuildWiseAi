from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.report import Report, Notification
from app.models.user import User
from app.api.deps import get_current_user
from app.services.report_generator import report_generator
from pydantic import BaseModel
from app.schemas.project import NotificationResponse

class ReportCreate(BaseModel):
    project_id: int
    report_type: str
    content: str

router = APIRouter()

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_custom_report(
    report_in: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_report = Report(
        project_id=report_in.project_id,
        report_type=report_in.report_type,
        content=report_in.content,
        generated_by=current_user.id
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)

    # Notify Site Engineer or Project Manager
    site_manager = db.query(User).filter(
        User.company_id == current_user.company_id,
        User.role == "Site Engineer"
    ).first()
    
    if not site_manager:
        site_manager = db.query(User).filter(
            User.company_id == current_user.company_id,
            User.role == "Project Manager"
        ).first()

    if site_manager:
        db_notif = Notification(
            user_id=site_manager.id,
            title="New Blueprint Cost Report",
            message=f"A blueprint estimation report for project ID {report_in.project_id} has been submitted by {current_user.full_name}.",
            type="task"
        )
        db.add(db_notif)
        db.commit()

    return db_report

@router.post("/generate")
def generate_report(
    project_id: int,
    report_type: str, # daily, weekly, monthly, safety, budget
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if report_type not in ["daily", "weekly", "monthly", "safety", "budget"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid report type. Allowed: daily, weekly, monthly, safety, budget"
        )
        
    try:
        res = report_generator.generate_project_report(project_id, report_type, db)
        if "error" in res:
            raise HTTPException(status_code=404, detail=res["error"])
        return res
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF report: {str(e)}"
        )

@router.get("/")
def list_reports(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Report).filter(Report.project_id == project_id).order_by(Report.created_at.desc()).all()


@router.get("/notifications", response_model=List[NotificationResponse])
def get_user_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).all()


@router.put("/notifications/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif
