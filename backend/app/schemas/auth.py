from pydantic import BaseModel, EmailStr
from typing import Optional
import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "Client" # Administrator, Company Owner, Project Manager, Site Engineer, Contractor, Client

class UserCreate(UserBase):
    password: str
    company_name: Optional[str] = None  # If signing up as a new company owner

class UserResponse(UserBase):
    id: int
    is_active: bool
    is_verified: bool
    company_id: Optional[int] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    user_id: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None
