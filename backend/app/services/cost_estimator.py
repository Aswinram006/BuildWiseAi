import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from typing import Dict, Any, List

class CostEstimatorService:
    def __init__(self):
        # Build a scikit-learn regressor trained on synthetic historical construction project data
        self.model = RandomForestRegressor(n_estimators=50, random_state=42)
        self._train_model()

    def _train_model(self):
        # Synthesize historical data: 200 projects
        # Features: building_area_sqft, finish_type (0=economy, 1=standard, 2=luxury), labor_index
        np.random.seed(42)
        n_samples = 200
        
        area = np.random.uniform(1000, 100000, n_samples)
        finish = np.random.choice([0, 1, 2], n_samples, p=[0.3, 0.5, 0.2])
        labor = np.random.uniform(0.8, 1.5, n_samples)
        
        # Calculate a realistic cost with some random noise
        # Base cost: ₹2,500 per sqft in India.
        # Finish multiplier: economy=0.8, standard=1.2, luxury=1.8
        # Labor index multiplier
        finish_mults = np.array([0.8, 1.2, 1.8])
        base_cost_per_sqft = 2500.0
        
        total_cost = (area * base_cost_per_sqft) * finish_mults[finish] * labor
        # Add 10% random noise
        noise = np.random.normal(1.0, 0.08, n_samples)
        total_cost = total_cost * noise
        
        # Fit model
        X = pd.DataFrame({
            "area": area,
            "finish": finish,
            "labor": labor
        })
        y = total_cost
        
        self.model.fit(X, y)

    def estimate_project_cost(
        self,
        area_sqft: float,
        finish_type: str,
        labor_index: float
    ) -> Dict[str, Any]:
        # Map finish_type string to numerical category
        finish_map = {"economy": 0, "standard": 1, "luxury": 2}
        finish_val = finish_map.get(finish_type.lower(), 1)
        
        # Format input for prediction
        input_data = pd.DataFrame([{
            "area": area_sqft,
            "finish": finish_val,
            "labor": labor_index
        }])
        
        predicted_total = float(self.model.predict(input_data)[0])
        
        # Distribute into standard enterprise construction cost breakdowns
        material_pct = 0.43
        labor_pct = 0.35
        equipment_pct = 0.12
        permits_overhead_pct = 0.10
        
        material_estimate = predicted_total * material_pct
        labor_estimate = predicted_total * labor_pct * labor_index
        equipment_estimate = predicted_total * equipment_pct
        permits_overhead = predicted_total * permits_overhead_pct
        
        # Total cost is the sum of adjusted estimates
        total_estimated = material_estimate + labor_estimate + equipment_estimate + permits_overhead
        
        # Generate dynamic recommendations based on cost profile
        recommendations = [
            "Negotiate bulk discounts for major materials (cement & steel) to lower material costs.",
            f"Optimize labor scheduling. Labor constitutes {labor_pct*100:.0f}% of the base prediction.",
            "Consider leasing heavy equipment instead of long-term rentals if the schedule permits."
        ]
        
        if finish_type.lower() == "luxury":
            recommendations.append("Source premium materials from multiple regional suppliers to avoid finish-class delays.")
        elif finish_type.lower() == "economy":
            recommendations.append("Ensure material specs meet baseline structural certifications despite economy sourcing.")
            
        return {
            "material_estimate": round(material_estimate, 2),
            "labor_estimate": round(labor_estimate, 2),
            "equipment_estimate": round(equipment_estimate, 2),
            "permits_and_overhead": round(permits_overhead, 2),
            "total_estimated_cost": round(total_estimated, 2),
            "recommendations": recommendations
        }

# Global singleton
cost_estimator = CostEstimatorService()
