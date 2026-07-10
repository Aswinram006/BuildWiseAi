from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import pytest
import os

# Set testing DATABASE_URL to a local sqlite in-memory database to run tests securely without affecting PostgreSQL data!
# SQLAlchemy handles SQLite perfectly for clean unit tests.
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_password_hash

# Set up test database engine
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def db_session():
    # Create tables
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="module")
def client(db_session):
    # Override database dependency in FastAPI
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

def test_api_root(client):
    response = client.get("/")
    assert response.status_code == 200
    content_type = response.headers.get("content-type", "")
    if "text/html" in content_type:
        assert "<html" in response.text or "<!DOCTYPE" in response.text.upper()
    else:
        assert response.json()["message"] == "Welcome to BuildWise AI API Gateway"

def test_user_registration(client):
    # Register a PM user
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "pm_test@buildwise.ai",
            "password": "password123",
            "full_name": "Diana Prince",
            "role": "Project Manager",
            "company_name": "Apex Test Group"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "pm_test@buildwise.ai"
    assert data["role"] == "Project Manager"

def test_user_login(client):
    # Login as PM
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "pm_test@buildwise.ai",
            "password": "password123"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "pm_test@buildwise.ai"

def test_rbac_restriction(client):
    # Register a Client user
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "client_test@buildwise.ai",
            "password": "password123",
            "full_name": "Bruce Wayne",
            "role": "Client"
        }
    )
    
    # Login as Client
    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "client_test@buildwise.ai",
            "password": "password123"
        }
    )
    token = login_response.json()["access_token"]
    
    # Try to create a project as Client (Should return 403 Forbidden)
    response = client.post(
        "/api/v1/projects/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Wayne Manor Refit",
            "description": "Secret cave structural reinforcement",
            "start_date": "2026-08-01",
            "end_date": "2027-08-01",
            "budget": 2000000.0,
            "status": "active",
            "company_id": 1
        }
    )
    assert response.status_code == 403
    assert "Operation not permitted" in response.json()["detail"]
