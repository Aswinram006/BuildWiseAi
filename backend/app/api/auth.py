from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.user import User, Company
from app.schemas.auth import (
    UserCreate, UserResponse, UserLogin, Token, ProfileUpdate, ForgotPasswordRequest
)
from app.api.deps import get_current_user
import datetime

router = APIRouter()

@router.get("/users", response_model=List[UserResponse])
def list_company_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.company_id is None:
        return [current_user]
    return db.query(User).filter(User.company_id == current_user.company_id).all()

@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists in the system."
        )

    # Handle company creation if company_name is provided
    company_id = None
    if user_in.company_name:
        company = Company(
            name=user_in.company_name,
            industry="Construction",
            address="Not specified"
        )
        db.add(company)
        db.commit()
        db.refresh(company)
        company_id = company.id
    
    # Create the user
    hashed_password = get_password_hash(user_in.password)
    user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        full_name=user_in.full_name,
        role=user_in.role,
        company_id=company_id,
        is_active=True,
        is_verified=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=Token)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_in.email).first()
    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is deactivated"
        )
        
    access_token = create_access_token(subject=user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserResponse)
def update_me(
    profile_in: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if profile_in.email and profile_in.email != current_user.email:
        # Check if email is already taken
        db_user = db.query(User).filter(User.email == profile_in.email).first()
        if db_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered by another user"
            )
        current_user.email = profile_in.email

    if profile_in.full_name:
        current_user.full_name = profile_in.full_name

    if profile_in.new_password:
        if not profile_in.current_password or not verify_password(profile_in.current_password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password must be provided and correct to change password."
            )
        current_user.hashed_password = get_password_hash(profile_in.new_password)

    current_user.updated_at = datetime.datetime.utcnow()
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        # Avoid user enumeration, but return a success message
        return {"message": "If this email exists in our system, a password reset link has been sent."}
    
    # In a real environment, send mail. Here, simulate.
    return {"message": f"Password reset instructions successfully sent to {req.email}"}
