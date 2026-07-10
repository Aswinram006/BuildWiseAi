from pydantic import BaseModel
from typing import Optional, Dict, Any, List

class CostEstimateInput(BaseModel):
    project_id: int
    building_area_sqft: float
    standard_of_finish: str = "standard"  # economy, standard, luxury
    local_labor_index: float = 1.0       # cost coefficient (e.g. 1.0 for national average)

class CostEstimateResponse(BaseModel):
    project_id: int
    material_estimate: float
    labor_estimate: float
    equipment_estimate: float
    permits_and_overhead: float
    total_estimated_cost: float
    recommendations: List[str]

class RiskPredictionResponse(BaseModel):
    project_id: int
    overall_risk_score: float  # 0 to 100
    risk_level: str           # Low, Medium, High
    breakdown: Dict[str, float]  # schedule, budget, material, equipment risk scores
    confidence: float          # 0.0 to 1.0
    recommendations: List[str]

class ChatMessage(BaseModel):
    role: str  # user, assistant
    content: str

class ChatRequest(BaseModel):
    project_id: int
    message: str
    history: List[ChatMessage] = []

class ChatResponse(BaseModel):
    response: str
