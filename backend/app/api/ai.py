from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.ai import CostEstimateInput, CostEstimateResponse, RiskPredictionResponse, ChatRequest, ChatResponse
from app.services.cost_estimator import cost_estimator
from app.services.risk_predictor import risk_predictor
from app.services.ai_assistant import ai_assistant
from app.models.project import Project
from app.models.report import AIPrediction
from app.models.budget import Budget
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.post("/cost-estimate", response_model=CostEstimateResponse)
def estimate_cost(
    input_in: CostEstimateInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify project exists
    project = db.query(Project).filter(Project.id == input_in.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Run ML Estimation
    prediction_dict = cost_estimator.estimate_project_cost(
        area_sqft=input_in.building_area_sqft,
        finish_type=input_in.standard_of_finish,
        labor_index=input_in.local_labor_index
    )

    # Save prediction to DB
    db_pred = AIPrediction(
        project_id=input_in.project_id,
        prediction_type="cost",
        prediction_results={
            "building_area_sqft": input_in.building_area_sqft,
            "standard_of_finish": input_in.standard_of_finish,
            "local_labor_index": input_in.local_labor_index,
            "material_estimate": prediction_dict["material_estimate"],
            "labor_estimate": prediction_dict["labor_estimate"],
            "equipment_estimate": prediction_dict["equipment_estimate"],
            "permits_and_overhead": prediction_dict["permits_and_overhead"]
        },
        confidence=0.95,
        recommendations="\n".join(prediction_dict["recommendations"])
    )
    db.add(db_pred)

    # Update parent project budget
    project.budget = prediction_dict["total_estimated_cost"]

    # Delete existing budget categories for this project
    db.query(Budget).filter(Budget.project_id == input_in.project_id).delete()

    # Re-populate budget category allocations
    budgets = [
        Budget(project_id=input_in.project_id, category="material", allocated=prediction_dict["material_estimate"], spent=0.0),
        Budget(project_id=input_in.project_id, category="labor", allocated=prediction_dict["labor_estimate"], spent=0.0),
        Budget(project_id=input_in.project_id, category="equipment", allocated=prediction_dict["equipment_estimate"], spent=0.0),
        Budget(project_id=input_in.project_id, category="permits", allocated=prediction_dict["permits_and_overhead"] * 0.4, spent=0.0),
        Budget(project_id=input_in.project_id, category="overhead", allocated=prediction_dict["permits_and_overhead"] * 0.6, spent=0.0),
    ]
    db.add_all(budgets)

    db.commit()

    return CostEstimateResponse(
        project_id=input_in.project_id,
        material_estimate=prediction_dict["material_estimate"],
        labor_estimate=prediction_dict["labor_estimate"],
        equipment_estimate=prediction_dict["equipment_estimate"],
        permits_and_overhead=prediction_dict["permits_and_overhead"],
        total_estimated_cost=prediction_dict["total_estimated_cost"],
        recommendations=prediction_dict["recommendations"]
    )

@router.get("/cost-estimate/{project_id}", response_model=CostEstimateResponse)
def get_cost_estimate(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 1. Check if there is an existing prediction of type "cost"
    pred_cost = db.query(AIPrediction).filter(
        AIPrediction.project_id == project_id,
        AIPrediction.prediction_type == "cost"
    ).order_by(AIPrediction.created_at.desc()).first()

    if pred_cost:
        res = pred_cost.prediction_results
        recs = pred_cost.recommendations.split("\n") if pred_cost.recommendations else []
        return CostEstimateResponse(
            project_id=project_id,
            material_estimate=res.get("material_estimate", 0.0),
            labor_estimate=res.get("labor_estimate", 0.0),
            equipment_estimate=res.get("equipment_estimate", 0.0),
            permits_and_overhead=res.get("permits_and_overhead", 0.0),
            total_estimated_cost=res.get("material_estimate", 0.0) + res.get("labor_estimate", 0.0) + res.get("equipment_estimate", 0.0) + res.get("permits_and_overhead", 0.0),
            recommendations=recs
        )

    # 2. If not, check if there is an existing prediction of type "blueprint_analysis"
    pred_blueprint = db.query(AIPrediction).filter(
        AIPrediction.project_id == project_id,
        AIPrediction.prediction_type == "blueprint_analysis"
    ).first()

    if pred_blueprint:
        res = pred_blueprint.prediction_results
        cb = res.get("cost_breakdown", {})
        recs_dict = res.get("ai_review", {}).get("recommendations", {})
        recs = [
            f"Cost Optimization: {recs_dict.get('cost_optimization', '')}",
            f"Workforce: {recs_dict.get('suggested_workforce', '')}",
            f"Machinery: {recs_dict.get('suggested_machinery', '')}"
        ]
        
        # permits and overhead consists of gov approvals + misc + contingency + gst
        permits_and_overhead = (
            cb.get("gov_approval_charges", 0.0) +
            cb.get("misc_expenses", 0.0) +
            cb.get("contingency_amount", 0.0) +
            cb.get("gst_charges", 0.0)
        )
        
        return CostEstimateResponse(
            project_id=project_id,
            material_estimate=cb.get("material_cost", 0.0),
            labor_estimate=cb.get("labor_cost", 0.0),
            equipment_estimate=cb.get("equipment_cost", 0.0),
            permits_and_overhead=permits_and_overhead,
            total_estimated_cost=cb.get("grand_total", 0.0),
            recommendations=recs
        )

    # 3. If neither exists, generate one based on project budget or area
    area_sqft = 1500
    finish_type = "standard"
    if project.building_type and project.building_type.lower() == "commercial":
        area_sqft = 2500
    if project.material_quality:
        finish_type = project.material_quality.lower()
        if finish_type not in ["economy", "standard", "luxury"]:
            finish_type = "standard"

    prediction_dict = cost_estimator.estimate_project_cost(
        area_sqft=area_sqft,
        finish_type=finish_type,
        labor_index=1.0
    )

    return CostEstimateResponse(
        project_id=project_id,
        material_estimate=prediction_dict["material_estimate"],
        labor_estimate=prediction_dict["labor_estimate"],
        equipment_estimate=prediction_dict["equipment_estimate"],
        permits_and_overhead=prediction_dict["permits_and_overhead"],
        total_estimated_cost=prediction_dict["total_estimated_cost"],
        recommendations=prediction_dict["recommendations"]
    )

@router.get("/risk-prediction/{project_id}", response_model=RiskPredictionResponse)
def get_risk_prediction(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Run ML Prediction using database state
    pred_dict = risk_predictor.predict_project_risk(project_id, db)

    # Save/update prediction to DB
    db_pred = AIPrediction(
        project_id=project_id,
        prediction_type="risk",
        prediction_results=pred_dict["breakdown"],
        confidence=pred_dict["confidence"],
        recommendations="\n".join(pred_dict["recommendations"])
    )
    db.add(db_pred)
    db.commit()

    return RiskPredictionResponse(
        project_id=project_id,
        overall_risk_score=pred_dict["overall_risk_score"],
        risk_level=pred_dict["risk_level"],
        breakdown=pred_dict["breakdown"],
        confidence=pred_dict["confidence"],
        recommendations=pred_dict["recommendations"]
    )

@router.post("/chat", response_model=ChatResponse)
def chat_assistant(
    chat_in: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    answer = ai_assistant.answer_query(
        project_id=chat_in.project_id,
        message=chat_in.message,
        db=db
    )
    return ChatResponse(response=answer)

