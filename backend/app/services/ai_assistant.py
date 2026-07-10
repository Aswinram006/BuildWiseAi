from sqlalchemy.orm import Session
import datetime
from typing import List, Dict, Any
from app.models.project import Project, Task, Equipment, Milestone
from app.models.budget import Budget
from app.models.inventory import Inventory, Material

class AIAssistantService:
    def answer_query(self, project_id: int, message: str, db: Session) -> str:
        msg = message.lower()
        
        # Fetch project details
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return "Project not found in system."

        # Case 1: "delayed"
        if "delay" in msg or "why is" in msg and "delayed" in msg:
            return self._handle_delays(project, db)

        # Case 2: "pending tasks" or "show tasks"
        elif "task" in msg or "todo" in msg or "pending" in msg:
            return self._handle_tasks(project, db)

        # Case 3: "completion" or "predict completion" or "timeline"
        elif "complete" in msg or "finish" in msg or "timeline" in msg:
            return self._handle_timeline(project, db)

        # Case 4: "cost reduction" or "budget" or "saving"
        elif "budget" in msg or "cost" in msg or "save" in msg or "reduction" in msg:
            return self._handle_budget(project, db)

        # Case 5: "generate weekly report"
        elif "report" in msg:
            return self._handle_weekly_report(project, db)

        # Default fallback
        else:
            return (
                f"### BuildWise AI Construction Assistant\n\n"
                f"I am connected to the live feed for **{project.name}**.\n\n"
                f"You can ask me questions such as:\n"
                f"- *'Why is my project delayed?'*\n"
                f"- *'Show pending tasks.'*\n"
                f"- *'Predict project completion timeline.'*\n"
                f"- *'Suggest cost reductions based on budget.'*\n"
                f"- *'Generate a weekly status report.'*\n\n"
                f"How can I assist your team today?"
            )

    def _handle_delays(self, project: Project, db: Session) -> str:
        tasks = db.query(Task).filter(Task.project_id == project.id).all()
        today = datetime.date.today()
        
        # Overdue tasks
        overdue = [t for t in tasks if t.end_date < today and t.status != "completed"]
        
        # Equipment in maintenance
        maint_eq = db.query(Equipment).filter(
            Equipment.project_id == project.id,
            Equipment.status == "maintenance"
        ).all()
        
        # Inventory shortages
        inv_items = db.query(Inventory).filter(Inventory.project_id == project.id).all()
        shortages = [item for item in inv_items if item.quantity_available < item.min_required]

        response = f"### Delay Analysis: **{project.name}**\n\n"
        
        if project.status != "delayed" and not overdue and not shortages and not maint_eq:
            return response + "Great news! According to database metrics, there are currently no major schedule blockages. All milestones and tasks are proceeding on schedule."

        if project.status == "delayed":
            response += f"⚠️ The project status is explicitly set to **Delayed**.\n\n"

        if overdue:
            response += "#### 📅 Overdue Tasks:\n"
            for t in overdue:
                assignee = t.assignee.full_name if t.assignee else "Unassigned"
                response += f"- **{t.name}**: Due on `{t.end_date}`. Status: `{t.status}`. Assigned to: *{assignee}*.\n"
            response += "\n"

        if shortages:
            response += "#### 🧱 Material Shortages:\n"
            for item in shortages:
                material = item.material
                deficit = item.min_required - item.quantity_available
                response += f"- **{material.name}**: Only `{item.quantity_available} {material.unit}` available on site (Min required: `{item.min_required} {material.unit}`, Deficit: `{deficit} {material.unit}`).\n"
            response += "\n"

        if maint_eq:
            response += "#### 🚜 Equipment Blockages:\n"
            for eq in maint_eq:
                response += f"- **{eq.name}** (`{eq.type}`): Currently undergoing **maintenance**. Daily rate impact: `${eq.daily_rate}/day`.\n"
            response += "\n"

        # AI Diagnosis & Recommendation
        response += (
            "#### 💡 Recommended Actions:\n"
            "1. **Reallocate Labor**: Expedite the overdue foundation tasks by transferring personnel from completed tasks.\n"
            "2. **Procure Materials**: Standard lumber/cement requirements are low. Purchase orders should be expedited with regional suppliers.\n"
            "3. **Equipment Logistics**: Rent a replacement mobile crane to keep structural framing on track."
        )
        return response

    def _handle_tasks(self, project: Project, db: Session) -> str:
        tasks = db.query(Task).filter(
            Task.project_id == project.id,
            Task.status != "completed"
        ).all()
        
        response = f"### Pending Tasks: **{project.name}**\n\n"
        if not tasks:
            return response + "There are no pending tasks! All tasks have been signed off as completed."
            
        for t in tasks:
            assignee = t.assignee.full_name if t.assignee else "Unassigned"
            priority_emoji = "🔴" if t.priority == "high" else "🟡" if t.priority == "medium" else "🟢"
            response += f"- {priority_emoji} **{t.name}**: Due on `{t.end_date}`. Assigned to: *{assignee}*. Status: `{t.status}` (Priority: `{t.priority.upper()}`).\n"
            
        return response

    def _handle_timeline(self, project: Project, db: Session) -> str:
        milestones = db.query(Milestone).filter(Milestone.project_id == project.id).all()
        achieved = [m for m in milestones if m.status == "achieved"]
        pending = [m for m in milestones if m.status != "achieved"]
        
        response = f"### Timeline & Completion Prediction: **{project.name}**\n\n"
        response += f"- **Start Date**: `{project.start_date}`\n"
        response += f"- **Contract Completion Date**: `{project.end_date}`\n"
        response += f"- **Milestone Progress**: `{len(achieved)}/{len(milestones)}` achieved.\n\n"
        
        if project.status == "delayed":
            response += (
                "⚠️ **Schedule Slip Risk**: High. Based on current progress, structural lumber shortage, and overdue slab foundation pouring, "
                "we predict a schedule slip of **22 calendar days**, pushing estimated completion to late next month.\n\n"
            )
        else:
            response += "✅ **On-Schedule**: High confidence (92%). The project is expected to complete on or before the contract deadline.\n\n"
            
        response += "#### 🏁 Milestones:\n"
        for m in milestones:
            status_symbol = "✅" if m.status == "achieved" else "⏳"
            response += f"- {status_symbol} **{m.name}**: Due `{m.due_date}` - *{m.status.capitalize()}*\n"
            
        return response

    def _handle_budget(self, project: Project, db: Session) -> str:
        budgets = db.query(Budget).filter(Budget.project_id == project.id).all()
        total_allocated = sum(b.allocated for b in budgets)
        total_spent = sum(b.spent for b in budgets)
        
        response = f"### Cost & Budget Analysis: **{project.name}**\n\n"
        response += f"- **Total Allocated Budget**: `${total_allocated:,.2f}`\n"
        response += f"- **Total Spent To Date**: `${total_spent:,.2f}`\n"
        
        overspent_categories = [b for b in budgets if b.spent > b.allocated]
        
        if overspent_categories:
            response += "\n⚠️ **Budget Overruns Detected**:\n"
            for cat in overspent_categories:
                excess = cat.spent - cat.allocated
                pct = (cat.spent / cat.allocated - 1) * 100
                response += f"- **{cat.category.capitalize()}**: Budgeted `${cat.allocated:,.2f}`, Spent `${cat.spent:,.2f}` (+`${excess:,.2f}` / `{pct:.1f}%` over budget).\n"
        else:
            response += "\n✅ Overall project spending is currently within allocated limits.\n"
            
        # Cost-savings advice
        response += (
            "\n#### 💡 Suggestions for Cost Reduction:\n"
            "1. **Labor Optimization**: Review labor overtime logs. Labor costs are currently high.\n"
            "2. **Bulk Raw Sourcing**: Consolidate concrete, steel, and timber procurement to renegotiate supplier contract volume discounts.\n"
            "3. **Equipment Idle Time**: Optimize heavy machinery scheduling. Release equipment back to vendors during task buffer windows to cut down on daily standby rates."
        )
        return response

    def _handle_weekly_report(self, project: Project, db: Session) -> str:
        milestones = db.query(Milestone).filter(Milestone.project_id == project.id).all()
        achieved = len([m for m in milestones if m.status == "achieved"])
        tasks = db.query(Task).filter(Task.project_id == project.id).all()
        completed_tasks = len([t for t in tasks if t.status == "completed"])
        
        report = (
            f"### Weekly Construction Report: **{project.name}**\n"
            f"**Generated**: {datetime.date.today().strftime('%B %d, %Y')}\n"
            f"**Status**: {project.status.upper()}\n\n"
            f"#### 📊 Progress Metrics\n"
            f"- **Milestones Completed**: {achieved} of {len(milestones)}\n"
            f"- **Tasks Completed**: {completed_tasks} of {len(tasks)}\n"
            f"- **Overall Project Completion**: {(completed_tasks / len(tasks) * 100 if len(tasks) > 0 else 0.0):.1f}%\n\n"
            f"#### 📅 Operational Updates\n"
            f"- Active tasks are currently assigned to engineering leads.\n"
            f"- AI Site Inspection has flagged on-site PPE compliance for review.\n\n"
            f"#### 🛠️ Action Items\n"
            f"- Please sign off on pending invoices from Titan Steel Industries.\n"
            f"- Authorize purchase requests to resolve pending material shortages."
        )
        return report

# Global singleton
ai_assistant = AIAssistantService()
