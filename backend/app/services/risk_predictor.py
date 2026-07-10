import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sqlalchemy.orm import Session
import datetime
from typing import Dict, Any, List
from app.models.project import Project, Task, Equipment
from app.models.budget import Budget
from app.models.inventory import Inventory

class RiskPredictorService:
    def __init__(self):
        # We will train a RandomForest classifier on synthetic project risk history
        self.model = RandomForestClassifier(n_estimators=50, random_state=42)
        self._train_model()

    def _train_model(self):
        # Synthesize historical data: 200 project audits
        # Features:
        # 1. budget_overrun_ratio (spent / allocated)
        # 2. overdue_task_ratio (overdue / total)
        # 3. material_shortage_ratio (low items / total items)
        # 4. equipment_failure_ratio (in maintenance / total)
        np.random.seed(42)
        n_samples = 200
        
        budget_overrun = np.random.uniform(0.5, 1.8, n_samples)
        overdue_tasks = np.random.uniform(0.0, 0.8, n_samples)
        material_shortage = np.random.uniform(0.0, 0.9, n_samples)
        equipment_failure = np.random.uniform(0.0, 0.5, n_samples)
        
        # Risk target class (0=Low, 1=Medium, 2=High)
        # We compute a risk index based on weighted features
        risk_index = (budget_overrun * 0.3) + (overdue_tasks * 0.4) + (material_shortage * 0.2) + (equipment_failure * 0.1)
        
        risk_class = np.zeros(n_samples, dtype=int)
        risk_class[risk_index > 0.45] = 1 # Medium
        risk_class[risk_index > 0.75] = 2 # High
        
        X = pd.DataFrame({
            "budget_overrun": budget_overrun,
            "overdue_tasks": overdue_tasks,
            "material_shortage": material_shortage,
            "equipment_failure": equipment_failure
        })
        y = risk_class
        
        self.model.fit(X, y)

    def predict_project_risk(self, project_id: int, db: Session) -> Dict[str, Any]:
        # 1. Calculate budget overrun ratio
        budgets = db.query(Budget).filter(Budget.project_id == project_id).all()
        total_allocated = sum(b.allocated for b in budgets)
        total_spent = sum(b.spent for b in budgets)
        budget_overrun_ratio = (total_spent / total_allocated) if total_allocated > 0 else 1.0
        
        # 2. Calculate overdue tasks ratio
        tasks = db.query(Task).filter(Task.project_id == project_id).all()
        total_tasks = len(tasks)
        today = datetime.date.today()
        overdue_tasks = sum(1 for t in tasks if t.end_date < today and t.status != "completed")
        overdue_task_ratio = (overdue_tasks / total_tasks) if total_tasks > 0 else 0.0
        
        # 3. Calculate material shortage ratio
        inventory_items = db.query(Inventory).filter(Inventory.project_id == project_id).all()
        total_materials = len(inventory_items)
        shortage_items = sum(1 for inv in inventory_items if inv.quantity_available < inv.min_required)
        material_shortage_ratio = (shortage_items / total_materials) if total_materials > 0 else 0.0
        
        # 4. Calculate equipment failure ratio (in maintenance)
        equipments = db.query(Equipment).filter(Equipment.project_id == project_id).all()
        total_equip = len(equipments)
        maintenance_equip = sum(1 for eq in equipments if eq.status == "maintenance")
        equipment_failure_ratio = (maintenance_equip / total_equip) if total_equip > 0 else 0.0

        # Features to feed ML model
        X_pred = pd.DataFrame([{
            "budget_overrun": budget_overrun_ratio,
            "overdue_tasks": overdue_task_ratio,
            "material_shortage": material_shortage_ratio,
            "equipment_failure": equipment_failure_ratio
        }])
        
        # Predict risk class probabilities
        probs = self.model.predict_proba(X_pred)[0]
        
        # Class probabilities map to overall score: 0 to 100
        # Score = sum(probability * class_weight) * 50
        overall_risk_score = float((probs[1] * 50) + (probs[2] * 100))
        
        if overall_risk_score < 30:
            risk_level = "Low"
        elif overall_risk_score < 70:
            risk_level = "Medium"
        else:
            risk_level = "High"

        # Calculate confidence: the probability of the predicted class
        pred_class = int(np.argmax(probs))
        confidence = float(probs[pred_class])

        # Compute specific sub-risk components
        schedule_delay_risk = min(100.0, overdue_task_ratio * 120.0 + (10.0 if equipment_failure_ratio > 0 else 0.0))
        budget_overrun_risk = min(100.0, max(0.0, (budget_overrun_ratio - 0.8) * 100.0))
        material_shortage_risk = min(100.0, material_shortage_ratio * 100.0)
        equipment_failure_risk = min(100.0, equipment_failure_ratio * 200.0)

        # Build recommendations list
        recommendations = []
        if budget_overrun_risk > 50:
            recommendations.append("Immediate review of project expenditures. Halt non-essential overhead costs.")
        if schedule_delay_risk > 40:
            recommendations.append("Reassign labor schedules to address critical path overdue tasks.")
        if material_shortage_risk > 30:
            recommendations.append("Purchase requests should be authorized for materials currently under their threshold values.")
        if equipment_failure_risk > 30:
            recommendations.append("Arrange backup equipment rental to minimize site inactivity due to maintenance.")
            
        if not recommendations:
            recommendations.append("Project health is optimal. Standard operations may proceed.")

        return {
            "overall_risk_score": round(overall_risk_score, 1),
            "risk_level": risk_level,
            "breakdown": {
                "schedule_delay_risk": round(schedule_delay_risk, 1),
                "budget_overrun_risk": round(budget_overrun_risk, 1),
                "material_shortage_risk": round(material_shortage_risk, 1),
                "equipment_failure_risk": round(equipment_failure_risk, 1)
            },
            "confidence": round(confidence, 2),
            "recommendations": recommendations
        }

# Global singleton
risk_predictor = RiskPredictorService()
