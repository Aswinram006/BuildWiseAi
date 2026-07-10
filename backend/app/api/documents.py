from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
import os
import uuid
from app.core.database import get_db
from app.models.document import Document
from app.models.project import Project
from app.services.doc_intel import doc_intel
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()
upload_dir = os.path.join("app", "static", "uploads")
os.makedirs(upload_dir, exist_ok=True)

@router.post("/upload")
async def upload_document(
    project_id: int = Form(...),
    file_type: str = Form(...),  # contract, invoice, report, drawing
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Generate filename
    doc_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1] or ".pdf"
    filename = f"doc_{doc_id}{ext}"
    file_path = os.path.join(upload_dir, filename)

    try:
        # Save file
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        # Process OCR summary & extraction results
        parsed = doc_intel.extract_document_info(content, file.filename, file_type)

        # Write to Database
        db_doc = Document(
            name=file.filename,
            file_path=f"/api/static/uploads/{filename}",
            file_type=file_type,
            ocr_text=parsed["ocr_text"],
            summary=parsed["summary"],
            extraction_results=parsed["extraction_results"],
            project_id=project_id,
            uploaded_by=current_user.id
        )
        db.add(db_doc)
        db.commit()
        db.refresh(db_doc)

        return db_doc
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading/processing document: {str(e)}"
        )

@router.get("/")
def list_documents(
    project_id: int,
    file_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Document).filter(Document.project_id == project_id)
    if file_type:
        query = query.filter(Document.file_type == file_type)
    return query.all()

@router.get("/search")
def search_documents(
    project_id: int,
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Document).filter(
        Document.project_id == project_id,
        or_(
            Document.name.ilike(f"%{q}%"),
            Document.summary.ilike(f"%{q}%"),
            Document.ocr_text.ilike(f"%{q}%")
        )
    ).all()
