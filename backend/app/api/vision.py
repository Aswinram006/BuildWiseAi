from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.vision_service import vision_service
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.post("/blueprint")
async def analyze_blueprint(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    # Validate extension
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in ["jpg", "jpeg", "png", "pdf"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Upload PDF, PNG, or JPG blueprint files."
        )
        
    try:
        content = await file.read()
        results = vision_service.analyze_blueprint(content, file.filename)
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing blueprint: {str(e)}"
        )

@router.post("/inspect")
async def inspect_site_safety(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in ["jpg", "jpeg", "png"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Upload PNG or JPG images."
        )
        
    try:
        content = await file.read()
        results = vision_service.inspect_site_safety(content, file.filename)
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error running safety inspection: {str(e)}"
        )
