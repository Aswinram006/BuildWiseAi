from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.core.database import engine, Base
from app.api import auth, projects, materials, ai, vision, documents, reports

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Ensure upload directory exists
os.makedirs(os.path.join(BASE_DIR, "static", "uploads"), exist_ok=True)

# Initialize FastAPI App
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Set CORS middleware origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to the domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static folder to serve CV bounding boxes and PDF reports
app.mount("/api/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
app.mount("/assets", StaticFiles(directory=os.path.join(BASE_DIR, "static", "assets")), name="assets")

# Create tables on startup (in case Alembic hasn't been run)
@app.on_event("startup")
def startup_db_setup():
    Base.metadata.create_all(bind=engine)

# Include API Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(projects.router, prefix=f"{settings.API_V1_STR}/projects", tags=["Project Management"])
app.include_router(materials.router, prefix=f"{settings.API_V1_STR}/resources", tags=["Resource Management"])
app.include_router(ai.router, prefix=f"{settings.API_V1_STR}/ai", tags=["AI Engineering"])
app.include_router(vision.router, prefix=f"{settings.API_V1_STR}/vision", tags=["Computer Vision"])
app.include_router(documents.router, prefix=f"{settings.API_V1_STR}/documents", tags=["Document Intelligence"])
app.include_router(reports.router, prefix=f"{settings.API_V1_STR}/reports", tags=["Reporting Engine"])

from fastapi.responses import HTMLResponse

@app.get("/{catchall:path}")
def read_root(catchall: str = ""):
    # If the request is for an API route or documentation, return a standard 404
    if catchall.startswith("api") or catchall.startswith("docs") or catchall.startswith("openapi.json") or catchall.startswith("redoc"):
        raise HTTPException(status_code=404, detail="Not Found")
        
    static_index = os.path.join(BASE_DIR, "static", "index.html")
    if os.path.exists(static_index):
        with open(static_index, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return {"message": "Welcome to BuildWise AI API Gateway", "version": "v1.0.0"}
