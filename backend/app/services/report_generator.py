import os
import uuid
import datetime
from typing import Dict, Any
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.models.project import Project
from app.models.report import Report, AIPrediction

# Register Arial font from Windows system fonts if available to safely support Unicode (₹)
font_name = 'Helvetica'
font_path = r"C:\Windows\Fonts\arial.ttf"
if os.path.exists(font_path):
    try:
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        pdfmetrics.registerFont(TTFont('Arial', font_path))
        font_name = 'Arial'
    except Exception as e:
        print(f"Error registering Arial font: {e}")

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

class ReportGeneratorService:
    def __init__(self):
        BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.upload_dir = os.path.join(BASE_DIR, "static", "uploads")
        os.makedirs(self.upload_dir, exist_ok=True)

    def generate_project_report(self, project_id: int, report_type: str, db: Session) -> Dict[str, Any]:
        # Fetch project metrics
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return {"error": "Project not found"}

        # Look up AI blueprint estimation results saved in predictions
        pred = db.query(AIPrediction).filter(
            AIPrediction.project_id == project_id, 
            AIPrediction.prediction_type == "blueprint_analysis"
        ).first()

        if pred and isinstance(pred.prediction_results, dict):
            est = pred.prediction_results
        else:
            # Fallback estimation if not found
            from app.services.estimation_service import estimation_service
            est = estimation_service.estimate_project(
                project_name=project.name,
                client_name=project.client_name or "Client",
                location=project.location or "Location",
                building_type=project.building_type or "Residential",
                floors=project.floors or 1,
                material_quality=project.material_quality or "Standard",
                detected_rooms=[],
                detected_doors_count=8,
                detected_windows_count=12
            )

        # Get assigned users details
        pm_name = project.assigned_pm.full_name if project.assigned_pm else "Not Assigned"
        engineer_name = project.assigned_engineer.full_name if project.assigned_engineer else "Not Assigned"

        # Unique filename
        report_id = str(uuid.uuid4())
        pdf_filename = f"report_{report_type}_{report_id}.pdf"
        pdf_path = os.path.join(self.upload_dir, pdf_filename)

        # Build PDF Document
        doc = SimpleDocTemplate(pdf_path, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
        story = []
        
        # Styles
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'TitleStyle',
            fontName=font_name + '-Bold' if font_name == 'Helvetica' else font_name,
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#0F172A'),
            spaceAfter=10
        )
        subtitle_style = ParagraphStyle(
            'SubtitleStyle',
            fontName=font_name,
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#64748B'),
            spaceAfter=20
        )
        h2_style = ParagraphStyle(
            'H2Style',
            fontName=font_name + '-Bold' if font_name == 'Helvetica' else font_name,
            fontSize=13,
            leading=16,
            textColor=colors.HexColor('#1E3A8A'),
            spaceBefore=12,
            spaceAfter=8
        )
        body_style = ParagraphStyle(
            'BodyStyle',
            fontName=font_name,
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#334155'),
            spaceAfter=6
        )
        body_bold = ParagraphStyle(
            'BodyBold',
            parent=body_style,
            fontName=font_name + '-Bold' if font_name == 'Helvetica' else font_name
        )

        # Header Block
        story.append(Paragraph("BUILDWISE AI", ParagraphStyle('BWBrand', fontName=font_name + '-Bold' if font_name == 'Helvetica' else font_name, fontSize=11, textColor=colors.HexColor('#2563EB'), spaceAfter=4)))
        story.append(Paragraph(f"Project Performance Audit & Cost Report", title_style))
        story.append(Paragraph(f"Generated on {datetime.date.today().strftime('%B %d, %Y')} | Enterprise Sourcing Live Feed", subtitle_style))
        story.append(Spacer(1, 5))

        # Executive Summary Callout
        story.append(Paragraph("Executive Summary", h2_style))
        exec_summary_text = est.get("ai_review", {}).get("summary", "Summary details not loaded.")
        exec_table = Table([[Paragraph(f"<i>{exec_summary_text}</i>", body_style)]], colWidths=[530])
        exec_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING', (0,0), (-1,-1), 12),
            ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ]))
        story.append(exec_table)
        story.append(Spacer(1, 10))

        # Project Details Metadata Table
        story.append(Paragraph("Project Details & Assigned Personnel", h2_style))
        meta_data = [
            [Paragraph("<b>Project Name:</b>", body_style), Paragraph(project.name, body_style),
             Paragraph("<b>Client Name:</b>", body_style), Paragraph(project.client_name or "Not Specified", body_style)],
            [Paragraph("<b>Location:</b>", body_style), Paragraph(project.location or "Not Specified", body_style),
             Paragraph("<b>Building Type:</b>", body_style), Paragraph(project.building_type or "Not Specified", body_style)],
            [Paragraph("<b>Floors:</b>", body_style), Paragraph(str(project.floors or 1), body_style),
             Paragraph("<b>Material Quality:</b>", body_style), Paragraph(project.material_quality or "Standard", body_style)],
            [Paragraph("<b>Assigned PM:</b>", body_style), Paragraph(pm_name, body_style),
             Paragraph("<b>Assigned Engineer:</b>", body_style), Paragraph(engineer_name, body_style)]
        ]
        meta_table = Table(meta_data, colWidths=[110, 155, 110, 155])
        meta_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#F8FAFC')),
            ('BACKGROUND', (2,0), (2,-1), colors.HexColor('#F8FAFC')),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('TOPPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 10))

        # Blueprint Analysis Details
        story.append(Paragraph("AI Blueprint Layout Analysis", h2_style))
        room_det = est.get("room_details", {})
        blue_data = [
            [Paragraph("<b>Structural Division</b>", body_bold), Paragraph("<b>Detected Quantity</b>", body_bold), Paragraph("<b>Classification</b>", body_bold)],
            [Paragraph("Bedrooms / Cabin Areas", body_style), Paragraph(f"{room_det.get('bedrooms', 0)} Zones", body_style), Paragraph("Enclosure Space", body_style)],
            [Paragraph("Bathrooms / Plumbing", body_style), Paragraph(f"{room_det.get('bathrooms', 0)} Zones", body_style), Paragraph("Sanitary Block", body_style)],
            [Paragraph("Kitchen / Cafeteria", body_style), Paragraph(f"{room_det.get('kitchen', 0)} Zone", body_style), Paragraph("Services Block", body_style)],
            [Paragraph("Hall / Reception Zone", body_style), Paragraph(f"{room_det.get('hall', 0)} Zone", body_style), Paragraph("Common Area", body_style)],
            [Paragraph("Dining / Pantry Area", body_style), Paragraph(f"{room_det.get('dining_area', 0)} Zone", body_style), Paragraph("Amenity space", body_style)],
            [Paragraph("Balconies", body_style), Paragraph(f"{room_det.get('balcony', 0)} Zones", body_style), Paragraph("Open Air Extension", body_style)],
            [Paragraph("Parking Slots", body_style), Paragraph(f"{room_det.get('parking', 0)} Zone", body_style), Paragraph("Utility", body_style)],
            [Paragraph("Staircase / Lift Core", body_style), Paragraph(f"{room_det.get('staircase', 0)} Zone", body_style), Paragraph("Vertical Circulation", body_style)],
            [Paragraph("Doors Identified", body_style), Paragraph(f"{room_det.get('doors', 0)} Units", body_style), Paragraph("Apertures / Access", body_style)],
            [Paragraph("Windows Identified", body_style), Paragraph(f"{room_det.get('windows', 0)} Units", body_style), Paragraph("Apertures / Ventilation", body_style)],
            [Paragraph("Total Built-up Area", body_bold), Paragraph(f"{est.get('built_up_area_sqft', 0):,.0f} sqft", body_bold), Paragraph("Calculated Area", body_bold)]
        ]
        blue_table = Table(blue_data, colWidths=[200, 150, 180])
        blue_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#EFF6FF'))
        ]))
        story.append(blue_table)

        # Determine blueprint image path to include
        blueprint_image_path = None
        cv_img_url = est.get("image_url") if est else None
        if cv_img_url:
            blueprint_filename = os.path.basename(cv_img_url)
            candidate_path = os.path.join(self.upload_dir, blueprint_filename)
            if os.path.exists(candidate_path):
                blueprint_image_path = candidate_path
        
        if not blueprint_image_path and project.blueprint_path:
            blueprint_filename = os.path.basename(project.blueprint_path)
            candidate_path = os.path.join(self.upload_dir, blueprint_filename)
            if os.path.exists(candidate_path):
                blueprint_image_path = candidate_path
                
        # Default fallback
        if not blueprint_image_path:
            candidate_path = os.path.join(self.upload_dir, "blueprint_mock.png")
            if os.path.exists(candidate_path):
                blueprint_image_path = candidate_path

        if blueprint_image_path:
            story.append(Spacer(1, 10))
            story.append(Paragraph("<b>Project Blueprint Layout Drawing Reference:</b>", body_style))
            story.append(Spacer(1, 5))
            try:
                import cv2
                img_w, img_h = 450, 220
                temp_img = cv2.imread(blueprint_image_path)
                if temp_img is not None:
                    h_orig, w_orig, _ = temp_img.shape
                    aspect = h_orig / w_orig
                    img_w = 450
                    img_h = int(img_w * aspect)
                    # Limit height to ensure it fits beautifully
                    if img_h > 240:
                        img_h = 240
                        img_w = int(img_h / aspect)
                
                story.append(Image(blueprint_image_path, width=img_w, height=img_h))
            except Exception as img_err:
                print(f"Error drawing blueprint image in PDF: {img_err}")

        # Force a page break for the detailed material and cost tables
        story.append(PageBreak())

        # Page 2: Material & Cost Estimations
        story.append(Paragraph("AI Material Quantity & Sourcing Schedule", h2_style))
        mat_headers = [Paragraph("<b>Material Item</b>", body_bold), Paragraph("<b>Estimated Qty</b>", body_bold), Paragraph("<b>Unit</b>", body_bold), Paragraph("<b>Total Cost (INR)</b>", body_bold)]
        mat_table_data = [mat_headers]
        for m in est.get("material_estimations", []):
            mat_table_data.append([
                Paragraph(m.get("name", ""), body_style),
                Paragraph(f"{m.get('quantity', 0):,}", body_style),
                Paragraph(m.get("unit", ""), body_style),
                Paragraph(m.get("formatted_cost", ""), body_style),
            ])
        mat_table = Table(mat_table_data, colWidths=[200, 100, 90, 140])
        mat_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ('TOPPADDING', (0,0), (-1,-1), 3),
        ]))
        story.append(mat_table)
        story.append(Spacer(1, 10))

        # Financial cost breakdown summary
        story.append(Paragraph("Financial Summary & Cost Breakdown", h2_style))
        cb = est.get("cost_breakdown", {})
        cost_data = [
            [Paragraph("<b>Cost Category</b>", body_bold), Paragraph("<b>Estimated Cost (INR)</b>", body_bold),
             Paragraph("<b>Cost Category</b>", body_bold), Paragraph("<b>Estimated Cost (INR)</b>", body_bold)],
            [Paragraph("Materials Base Cost", body_style), Paragraph(cb.get("formatted_material_cost", "₹0"), body_style),
             Paragraph("Labor Cost", body_style), Paragraph(cb.get("formatted_labor_cost", "₹0"), body_style)],
            [Paragraph("Equipment & Machinery", body_style), Paragraph(cb.get("formatted_equipment_cost", "₹0"), body_style),
             Paragraph("Electrical Works", body_style), Paragraph(cb.get("formatted_electrical_cost", "₹0"), body_style)],
            [Paragraph("Plumbing & Sewerage", body_style), Paragraph(cb.get("formatted_plumbing_cost", "₹0"), body_style),
             Paragraph("Painting & Coatings", body_style), Paragraph(cb.get("formatted_painting_cost", "₹0"), body_style)],
            [Paragraph("Roofing Works", body_style), Paragraph(cb.get("formatted_roofing_cost", "₹0"), body_style),
             Paragraph("Finishing Works", body_style), Paragraph(cb.get("formatted_finishing_cost", "₹0"), body_style)],
            [Paragraph("Government Approvals", body_style), Paragraph(cb.get("formatted_gov_approval_charges", "₹0"), body_style),
             Paragraph("Miscellaneous Expenses", body_style), Paragraph(cb.get("formatted_misc_expenses", "₹0"), body_style)],
            [Paragraph("Contingency Amount (5%)", body_style), Paragraph(cb.get("formatted_contingency_amount", "₹0"), body_style),
             Paragraph("GST (18% applicable)", body_style), Paragraph(cb.get("formatted_gst_charges", "₹0"), body_style)],
            [Paragraph("<b>Grand Total Estimate</b>", body_bold), Paragraph(f"<b>{cb.get('formatted_grand_total', '₹0')}</b>", body_bold),
             Paragraph("", body_style), Paragraph("", body_style)]
        ]
        cost_table = Table(cost_data, colWidths=[150, 115, 150, 115])
        cost_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E3A8A')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('SPAN', (1,-1), (3,-1)),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BACKGROUND', (0,-1), (1,-1), colors.HexColor('#EFF6FF'))
        ]))
        for i in range(len(cost_data[0])):
            cost_table.setStyle(TableStyle([('TEXTCOLOR', (i,0), (i,0), colors.white)]))
        story.append(cost_table)

        # Force a page break for risks and recommendations
        story.append(PageBreak())

        # Page 3: Construction Timeline & Risk Analysis
        story.append(Paragraph("Construction Timeline & Project Schedule", h2_style))
        timeline_phases = est.get("timeline", {}).get("phases", [])
        time_headers = [Paragraph("<b>Construction Phase / Stage</b>", body_bold), Paragraph("<b>Estimated Duration (Weeks)</b>", body_bold)]
        time_table_data = [time_headers]
        for phase in timeline_phases:
            time_table_data.append([
                Paragraph(phase.get("phase", ""), body_style),
                Paragraph(str(phase.get("duration_weeks", 0)), body_style)
            ])
        time_table_data.append([
            Paragraph("<b>Overall Estimated Duration</b>", body_bold),
            Paragraph(f"<b>{est.get('timeline', {}).get('total_months', 12)} Months</b>", body_bold)
        ])
        time_table = Table(time_table_data, colWidths=[300, 230])
        time_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#EFF6FF'))
        ]))
        story.append(time_table)
        story.append(Spacer(1, 10))

        # Risk Analysis Table
        story.append(Paragraph("AI Construction Risk Scorecard", h2_style))
        risk_det = est.get("ai_review", {}).get("risk_analysis", {})
        risk_data = [
            [Paragraph("<b>Risk category</b>", body_bold), Paragraph("<b>Level</b>", body_bold), Paragraph("<b>Telemetry Diagnosis</b>", body_bold), Paragraph("<b>Mitigation Recommendation</b>", body_bold)],
            [Paragraph("Delay Risk", body_style), Paragraph(risk_det.get("delay_risk", {}).get("level", "Low"), body_style), Paragraph(risk_det.get("delay_risk", {}).get("reason", ""), body_style), Paragraph(risk_det.get("delay_risk", {}).get("recommendation", ""), body_style)],
            [Paragraph("Budget Risk", body_style), Paragraph(risk_det.get("budget_risk", {}).get("level", "Low"), body_style), Paragraph(risk_det.get("budget_risk", {}).get("reason", ""), body_style), Paragraph(risk_det.get("budget_risk", {}).get("recommendation", ""), body_style)],
            [Paragraph("Safety Risk", body_style), Paragraph(risk_det.get("safety_risk", {}).get("level", "Low"), body_style), Paragraph(risk_det.get("safety_risk", {}).get("reason", ""), body_style), Paragraph(risk_det.get("safety_risk", {}).get("recommendation", ""), body_style)],
            [Paragraph("Material Sourcing", body_style), Paragraph(risk_det.get("material_shortage_risk", {}).get("level", "Low"), body_style), Paragraph(risk_det.get("material_shortage_risk", {}).get("reason", ""), body_style), Paragraph(risk_det.get("material_shortage_risk", {}).get("recommendation", ""), body_style)],
            [Paragraph("Weather Risk", body_style), Paragraph(risk_det.get("weather_risk", {}).get("level", "Low"), body_style), Paragraph(risk_det.get("weather_risk", {}).get("reason", ""), body_style), Paragraph(risk_det.get("weather_risk", {}).get("recommendation", ""), body_style)]
        ]
        risk_table = Table(risk_data, colWidths=[110, 60, 180, 180])
        risk_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F8FAFC')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ('TOPPADDING', (0,0), (-1,-1), 3),
        ]))
        for idx in range(1, len(risk_data)):
            lvl = risk_data[idx][1].text
            if "High" in lvl:
                risk_table.setStyle(TableStyle([('BACKGROUND', (1,idx), (1,idx), colors.HexColor('#FEE2E2'))])) # light red
            elif "Medium" in lvl:
                risk_table.setStyle(TableStyle([('BACKGROUND', (1,idx), (1,idx), colors.HexColor('#FEF3C7'))])) # light yellow
            else:
                risk_table.setStyle(TableStyle([('BACKGROUND', (1,idx), (1,idx), colors.HexColor('#D1FAE5'))])) # light green
        story.append(risk_table)
        story.append(Spacer(1, 10))

        # AI Recommendations
        story.append(Paragraph("AI Sourcing & Value Optimization Recommendations", h2_style))
        recs = est.get("ai_review", {}).get("recommendations", {})
        recs_list = [
            f"<b>Suggested Workforce:</b> {recs.get('suggested_workforce', '')}",
            f"<b>Suggested Machinery:</b> {recs.get('suggested_machinery', '')}",
            f"<b>Cost Optimization:</b> {recs.get('cost_optimization', '')}",
            f"<b>Construction Sequence:</b> {recs.get('better_construction_sequence', '')}",
            f"<b>Material Sourcing Improvements:</b> {recs.get('material_improvements', '')}",
            f"<b>Safety Program:</b> {recs.get('safety_improvements', '')}"
        ]
        for r in recs_list:
            story.append(Paragraph(f"• {r}", body_style))
            
        story.append(Spacer(1, 15))
        story.append(Paragraph("<b>Final Conclusion:</b> This cost and quantity report is generated based on standard mechanical layouts and area bounding boxes detected from the building blueprint. The quantities and rates comply with current Central Public Works Department (CPWD) schedule indices in India and are ready for commercial execution review.", body_style))

        # Signatures
        story.append(Spacer(1, 15))
        sig_data = [
            [Paragraph("_____________________________<br/><b>Marcus Aurelius</b><br/>Project Manager", body_style),
             Paragraph("_____________________________<br/><b>Sarah Administrator</b><br/>Auditor Coordinator", body_style)]
        ]
        sig_table = Table(sig_data, colWidths=[260, 260])
        story.append(sig_table)

        # Build PDF
        doc.build(story)

        # Copy to a generic fallback file path (e.g., report_weekly.pdf) for frontend static download link compatibility
        import shutil
        fallback_pdf_filename = f"report_{report_type}.pdf"
        fallback_pdf_path = os.path.join(self.upload_dir, fallback_pdf_filename)
        try:
            shutil.copy2(pdf_path, fallback_pdf_path)
        except Exception as e:
            print(f"Error copying fallback PDF: {e}")

        # Save or update Report metadata to DB
        db_report = db.query(Report).filter(
            Report.project_id == project_id,
            Report.report_type == report_type
        ).first()
        
        if db_report:
            db_report.content = exec_summary_text
        else:
            db_report = Report(
                project_id=project_id,
                report_type=report_type,
                content=exec_summary_text,
                generated_by=None
            )
            db.add(db_report)
            
        db.commit()

        return {
            "report_id": db_report.id,
            "report_type": report_type,
            "pdf_url": f"/api/static/uploads/{pdf_filename}",
            "summary": exec_summary_text
        }

# Global singleton
report_generator = ReportGeneratorService()
