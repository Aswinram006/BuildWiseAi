import math
from typing import Dict, Any, List

def format_inr(number: float) -> str:
    if number is None:
        return "₹0"
    is_negative = number < 0
    num_str = f"{abs(int(round(number)))}"
    if len(num_str) <= 3:
        val = f"₹{num_str}"
    else:
        last_three = num_str[-3:]
        remaining = num_str[:-3]
        out = []
        while len(remaining) > 2:
            out.append(remaining[-2:])
            remaining = remaining[:-2]
        if remaining:
            out.append(remaining)
        out.reverse()
        val = "₹" + ",".join(out) + "," + last_three
    return f"-{val}" if is_negative else val

class EstimationService:
    def estimate_project(
        self,
        project_name: str,
        client_name: str,
        location: str,
        building_type: str,
        floors: int,
        material_quality: str,
        detected_rooms: List[Dict[str, Any]],
        detected_doors_count: int,
        detected_windows_count: int
    ) -> Dict[str, Any]:
        
        # 1. Determine Area and Multipliers
        detected_area = sum(r.get("area_sqft", 0) for r in detected_rooms)
        base_area_per_floor = max(1200.0, detected_area)
        total_built_up_area = base_area_per_floor * floors

        # Map quality standard to prices and multipliers
        quality_lower = material_quality.lower()
        if quality_lower == "luxury":
            base_cost_per_sqft = 4500.0
            quality_label = "Luxury"
            waste_pct = 5.0
            pm_wages_multiplier = 1.3
        elif quality_lower == "premium":
            base_cost_per_sqft = 2800.0
            quality_label = "Premium"
            waste_pct = 7.0
            pm_wages_multiplier = 1.15
        else:
            base_cost_per_sqft = 1800.0
            quality_label = "Standard"
            waste_pct = 8.5
            pm_wages_multiplier = 1.0

        # Estimate Room types from count
        room_count = len(detected_rooms) if detected_rooms else 5
        bedrooms = max(1, math.ceil(room_count * 0.4))
        bathrooms = max(1, math.ceil(room_count * 0.3))
        kitchens = 1
        halls = 1
        dining_areas = 1 if room_count > 4 else 0
        balconies = max(1, floors)
        parking = 1
        staircase = 1 if floors > 1 else 0
        doors = max(4 * floors, detected_doors_count)
        windows = max(6 * floors, detected_windows_count)

        # 2. Material Estimation (Indian Rates & Sourcing)
        cement_qty = math.ceil(total_built_up_area * 0.4)
        cement_unit_price = 380.0 if quality_lower == "standard" else (430.0 if quality_lower == "premium" else 480.0)
        cement_cost = cement_qty * cement_unit_price

        steel_qty_tons = round(total_built_up_area * 0.004, 2)
        steel_unit_price = 62000.0 if quality_lower == "standard" else (72000.0 if quality_lower == "premium" else 82000.0)
        steel_cost = steel_qty_tons * steel_unit_price

        bricks_qty = math.ceil(total_built_up_area * 22)
        bricks_unit_price = 8.0 if quality_lower == "standard" else (10.0 if quality_lower == "premium" else 12.0)
        bricks_cost = bricks_qty * bricks_unit_price

        sand_qty_tons = math.ceil(total_built_up_area * 0.08)
        sand_unit_price = 1200.0 if quality_lower == "standard" else (1500.0 if quality_lower == "premium" else 1800.0)
        sand_cost = sand_qty_tons * sand_unit_price

        blue_metal_qty_tons = math.ceil(total_built_up_area * 0.06)
        blue_metal_unit_price = 1400.0 if quality_lower == "standard" else (1700.0 if quality_lower == "premium" else 2000.0)
        blue_metal_cost = blue_metal_qty_tons * blue_metal_unit_price

        gravel_qty_tons = math.ceil(total_built_up_area * 0.04)
        gravel_unit_price = 1000.0 if quality_lower == "standard" else (1200.0 if quality_lower == "premium" else 1400.0)
        gravel_cost = gravel_qty_tons * gravel_unit_price

        concrete_qty_cum = math.ceil(total_built_up_area * 0.03)
        concrete_unit_price = 4500.0 if quality_lower == "standard" else (5500.0 if quality_lower == "premium" else 6500.0)
        concrete_cost = concrete_qty_cum * concrete_unit_price

        paint_qty_liters = math.ceil(total_built_up_area * 0.16)
        paint_unit_price = 260.0 if quality_lower == "standard" else (360.0 if quality_lower == "premium" else 520.0)
        paint_cost = paint_qty_liters * paint_unit_price

        tiles_qty_sqft = math.ceil(total_built_up_area * 1.15)
        tiles_unit_price = 65.0 if quality_lower == "standard" else (130.0 if quality_lower == "premium" else 260.0)
        tiles_cost = tiles_qty_sqft * tiles_unit_price

        electrical_cost = total_built_up_area * (90.0 if quality_lower == "standard" else (160.0 if quality_lower == "premium" else 320.0))
        plumbing_cost = total_built_up_area * (80.0 if quality_lower == "standard" else (140.0 if quality_lower == "premium" else 260.0))
        roofing_cost = total_built_up_area * (130.0 if quality_lower == "standard" else (240.0 if quality_lower == "premium" else 420.0))

        doors_cost = doors * (6000.0 if quality_lower == "standard" else (12000.0 if quality_lower == "premium" else 25000.0))
        windows_cost = windows * (4000.0 if quality_lower == "standard" else (8000.0 if quality_lower == "premium" else 18000.0))

        labor_days = math.ceil(total_built_up_area * 0.85)
        labor_unit_rate = 550.0 if quality_lower == "standard" else (750.0 if quality_lower == "premium" else 950.0)
        labor_cost = labor_days * labor_unit_rate

        materials_list = [
            {"name": "Cement", "quantity": cement_qty, "unit": "bags", "cost": cement_cost, "formatted_cost": format_inr(cement_cost)},
            {"name": "Steel Rebar", "quantity": steel_qty_tons, "unit": "tons", "cost": steel_cost, "formatted_cost": format_inr(steel_cost)},
            {"name": "Bricks", "quantity": bricks_qty, "unit": "pcs", "cost": bricks_cost, "formatted_cost": format_inr(bricks_cost)},
            {"name": "Sand", "quantity": sand_qty_tons, "unit": "tons", "cost": sand_cost, "formatted_cost": format_inr(sand_cost)},
            {"name": "Blue Metal Aggregate", "quantity": blue_metal_qty_tons, "unit": "tons", "cost": blue_metal_cost, "formatted_cost": format_inr(blue_metal_cost)},
            {"name": "Gravel / Soling", "quantity": gravel_qty_tons, "unit": "tons", "cost": gravel_cost, "formatted_cost": format_inr(gravel_cost)},
            {"name": "Ready-Mix Concrete", "quantity": concrete_qty_cum, "unit": "cum", "cost": concrete_cost, "formatted_cost": format_inr(concrete_cost)},
            {"name": "Paint", "quantity": paint_qty_liters, "unit": "liters", "cost": paint_cost, "formatted_cost": format_inr(paint_cost)},
            {"name": "Flooring Tiles", "quantity": tiles_qty_sqft, "unit": "sqft", "cost": tiles_cost, "formatted_cost": format_inr(tiles_cost)},
            {"name": "Electrical Conduit & Wiring", "quantity": 1, "unit": "lump-sum", "cost": electrical_cost, "formatted_cost": format_inr(electrical_cost)},
            {"name": "Plumbing Pipes & Fixtures", "quantity": 1, "unit": "lump-sum", "cost": plumbing_cost, "formatted_cost": format_inr(plumbing_cost)},
            {"name": "Roofing/Slab Concrete reinforcement", "quantity": 1, "unit": "lump-sum", "cost": roofing_cost, "formatted_cost": format_inr(roofing_cost)},
            {"name": "Doors", "quantity": doors, "unit": "units", "cost": doors_cost, "formatted_cost": format_inr(doors_cost)},
            {"name": "Windows", "quantity": windows, "unit": "units", "cost": windows_cost, "formatted_cost": format_inr(windows_cost)},
            {"name": "Labor Sourcing Requirement", "quantity": labor_days, "unit": "man-days", "cost": labor_cost, "formatted_cost": format_inr(labor_cost)},
        ]

        # 3. Cost Breakdown Summarization
        raw_material_total = sum(item["cost"] for item in materials_list if item["name"] != "Labor Sourcing Requirement")
        raw_labor_total = labor_cost
        equipment_cost = total_built_up_area * (200.0 if quality_lower == "standard" else (350.0 if quality_lower == "premium" else 600.0))
        finishing_cost = tiles_cost + paint_cost + doors_cost + windows_cost
        
        gov_approvals = 150000.0 if quality_lower == "standard" else (300000.0 if quality_lower == "premium" else 500000.0)
        misc_expenses = (raw_material_total + raw_labor_total) * 0.04
        
        subtotal = (
            raw_material_total +
            raw_labor_total +
            equipment_cost +
            electrical_cost +
            plumbing_cost +
            paint_cost +
            roofing_cost +
            finishing_cost +
            gov_approvals +
            misc_expenses
        )
        
        contingency_amount = subtotal * 0.05
        gst_amount = (subtotal + contingency_amount) * 0.18
        grand_total = subtotal + contingency_amount + gst_amount

        cost_breakdown = {
            "material_cost": raw_material_total,
            "labor_cost": raw_labor_total,
            "equipment_cost": equipment_cost,
            "electrical_cost": electrical_cost,
            "plumbing_cost": plumbing_cost,
            "painting_cost": paint_cost,
            "roofing_cost": roofing_cost,
            "finishing_cost": finishing_cost,
            "gov_approval_charges": gov_approvals,
            "misc_expenses": misc_expenses,
            "contingency_amount": contingency_amount,
            "gst_charges": gst_amount,
            "grand_total": grand_total,
            
            # Formatted in INR strings
            "formatted_material_cost": format_inr(raw_material_total),
            "formatted_labor_cost": format_inr(raw_labor_total),
            "formatted_equipment_cost": format_inr(equipment_cost),
            "formatted_electrical_cost": format_inr(electrical_cost),
            "formatted_plumbing_cost": format_inr(plumbing_cost),
            "formatted_painting_cost": format_inr(paint_cost),
            "formatted_roofing_cost": format_inr(roofing_cost),
            "formatted_finishing_cost": format_inr(finishing_cost),
            "formatted_gov_approval_charges": format_inr(gov_approvals),
            "formatted_misc_expenses": format_inr(misc_expenses),
            "formatted_contingency_amount": format_inr(contingency_amount),
            "formatted_gst_charges": format_inr(gst_amount),
            "formatted_grand_total": format_inr(grand_total),
        }

        # 4. Construction Timeline Planning
        site_prep_w = max(1, math.ceil(floors * 0.8))
        foundation_w = max(2, math.ceil(floors * 2.0))
        column_w = max(2, math.ceil(floors * 1.5))
        wall_w = max(2, math.ceil(floors * 1.8))
        roofing_w = max(1, math.ceil(floors * 1.2))
        electrical_w = max(1, math.ceil(floors * 1.0))
        plumbing_w = max(1, math.ceil(floors * 0.8))
        flooring_w = max(1, math.ceil(floors * 1.1))
        painting_w = max(1, math.ceil(floors * 0.9))
        finishing_w = max(1, math.ceil(floors * 1.2))

        timeline_phases = [
            {"phase": "Site Preparation", "duration_weeks": site_prep_w},
            {"phase": "Foundation", "duration_weeks": foundation_w},
            {"phase": "Column Work", "duration_weeks": column_w},
            {"phase": "Wall Construction", "duration_weeks": wall_w},
            {"phase": "Roofing", "duration_weeks": roofing_w},
            {"phase": "Electrical Work", "duration_weeks": electrical_w},
            {"phase": "Plumbing", "duration_weeks": plumbing_w},
            {"phase": "Flooring", "duration_weeks": flooring_w},
            {"phase": "Painting", "duration_weeks": painting_w},
            {"phase": "Finishing", "duration_weeks": finishing_w},
        ]
        
        structural_sum = site_prep_w + foundation_w + column_w + wall_w + roofing_w
        finishing_sum = max(electrical_w, plumbing_w) + flooring_w + painting_w + finishing_w
        total_weeks = structural_sum + finishing_sum
        total_months = max(3, math.ceil(total_weeks / 4.2))

        # 5. AI Project Review Generation
        summary_text = (
            f"This is a {building_type} building with {room_count} structural divisions, "
            f"including {bedrooms} bedrooms, {bathrooms} bathrooms, {kitchens} kitchen, and {halls} hall. "
            f"Based on the uploaded blueprint, the estimated construction cost is {format_inr(grand_total)} "
            f"using {quality_label} quality specifications. The estimated completion time is {total_months} months."
        )

        complexity = "Moderate"
        complexity_reason = "Standard framed structure with G+1 dimensions. Soil loads and concrete casting column placements are within standard structural limits."
        if floors >= 5:
            complexity = "Highly Complex"
            complexity_reason = f"High-rise structure with {floors} floors requiring earthquake-resistant deep foundations, pile caps, and heavy shear wall calculations."
        elif floors >= 3:
            complexity = "Complex"
            complexity_reason = f"Multi-story framework ({floors} floors) with wind load stress constraints and fire escape layout partitions."
        elif floors == 1:
            complexity = "Easy" if building_type.lower() == "residential" else "Moderate"
            complexity_reason = "Single story structural envelope. Extremely quick excavation and basic columns framework."

        budget_level = "Reasonable"
        budget_recs = [
            "Source sand and aggregates from local regional mines to decrease transport fees.",
            "Deploy precast concrete blocks for non-load-bearing walls to cut down brickwork costs.",
            "Schedule steel procurement during price dips in market cycles."
        ]

        material_recs = [
            f"Ensure {quality_label} material standard checks are conducted at site delivery.",
            f"Mitigate the estimated {waste_pct}% material wastage by using standardized block sizes.",
            "Store cement bags on raised platforms away from damp walls to prevent premature curing."
        ]

        delay_risk = "Medium" if floors > 2 else "Low"
        budget_risk = "Medium" if quality_lower == "luxury" else "Low"
        safety_risk = "High" if floors > 4 else ("Medium" if floors > 1 else "Low")
        material_shortage_risk = "Medium"
        weather_risk = "Low"

        workforce_rec = max(8, math.ceil(total_built_up_area * 0.008))
        machinery_recs = ["Concrete Mixer Machine", "Slab Vibrator", "JCB Excavator"]
        if floors > 3:
            machinery_recs.extend(["Tower Crane", "Passenger Hoist Lift"])
        
        confidence_score = round(0.85 + (0.01 * min(10, len(detected_rooms))), 2)

        return {
            "building_type": building_type,
            "floors": floors,
            "material_quality": quality_label,
            "built_up_area_sqft": total_built_up_area,
            "room_details": {
                "bedrooms": bedrooms,
                "bathrooms": bathrooms,
                "kitchen": kitchens,
                "hall": halls,
                "dining_area": dining_areas,
                "balcony": balconies,
                "parking": parking,
                "staircase": staircase,
                "doors": doors,
                "windows": windows,
                "total_rooms": room_count,
            },
            "material_estimations": materials_list,
            "cost_breakdown": cost_breakdown,
            "timeline": {
                "phases": timeline_phases,
                "total_weeks": total_weeks,
                "total_months": total_months,
            },
            "ai_review": {
                "summary": summary_text,
                "complexity": complexity,
                "complexity_reason": complexity_reason,
                "budget_analysis": {
                    "evaluation": budget_level,
                    "recommendations": budget_recs,
                },
                "material_analysis": {
                    "quality_level": quality_label,
                    "estimated_waste_pct": waste_pct,
                    "recommendations": material_recs,
                },
                "risk_analysis": {
                    "delay_risk": {"level": delay_risk, "reason": "Slight logistical supply delay risks or approval buffer slip.", "recommendation": "Maintain a 14-day schedule buffer."},
                    "budget_risk": {"level": budget_risk, "reason": "Market steel price volatility.", "recommendation": "Procure major materials at project kickoff."},
                    "safety_risk": {"level": safety_risk, "reason": "Scaffolding falls and heavy vehicle movements.", "recommendation": "Enforce mandatory hard-hats and harness usage."},
                    "material_shortage_risk": {"level": material_shortage_risk, "reason": "Sourcing delays for premium finishes.", "recommendation": "Source from multiple supplier agreements."},
                    "weather_risk": {"level": weather_risk, "reason": "Seasonal monsoon rainfall interruptions.", "recommendation": "Perform roofing concrete pours before peak rainy season."},
                },
                "recommendations": {
                    "suggested_workforce": f"{workforce_rec} active workers (skilled & unskilled)",
                    "suggested_machinery": ", ".join(machinery_recs),
                    "cost_optimization": "Optimize cut-lists for steel rebar to minimize waste below 5%.",
                    "better_construction_sequence": "Run electrical conduiting concurrently with brick laying partitions.",
                    "material_improvements": "Use fly-ash blended OPC cement for columns foundation slab to lower footprint.",
                    "safety_improvements": "Conduct safety toolboxes each morning for working-at-height laborers."
                }
            },
            "project_assigned": {
                "project_name": project_name,
                "client_name": client_name,
                "project_type": building_type,
                "location": location,
                "estimated_cost": format_inr(grand_total),
                "estimated_completion_time": f"{total_months} Months",
                "current_status": "Active",
                "recommended_workers": workforce_rec,
                "material_quality": quality_label,
                "project_priority": "High" if floors > 2 else "Medium",
                "overall_risk_level": "Medium" if floors > 2 else "Low",
                "ai_confidence_score": confidence_score
            }
        }

estimation_service = EstimationService()
