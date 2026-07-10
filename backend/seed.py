import datetime
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models import (
    Company, User, Project, Task, Milestone, Budget,
    Supplier, Material, Inventory, Worker, Equipment,
    AIPrediction, Notification, AuditLog, Document, Report
)

import sys

def seed_db():
    # Handle resetting database to fix duplicate mock data
    if "--reset" in sys.argv:
        print("Resetting database (dropping and recreating all tables)...")
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
    else:
        print("Initializing database tables...")
        Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(User).first():
            print("Database already contains data. Skipping seeding.")
            return

        # If running in production/real-time mode, create all user roles but no mock projects/tasks
        if "--production" in sys.argv or "--clean" in sys.argv:
            print("Running in clean production/real-time mode. Seeding all user accounts...")
            company = Company(
                name="Apex Construction Group",
                industry="Commercial & Residential Construction",
                address="100 Enterprise Way, Suite 500, Tech City, TC 94016"
            )
            db.add(company)
            db.commit()
            db.refresh(company)
            
            hashed_pw = get_password_hash("password123")
            users = [
                User(email="admin@buildwise.ai", hashed_password=hashed_pw, full_name="Sarah Administrator", role="Administrator", is_active=True, is_verified=True, company_id=company.id),
                User(email="owner@buildwise.ai", hashed_password=hashed_pw, full_name="Robert Vance", role="Company Owner", is_active=True, is_verified=True, company_id=company.id),
                User(email="pm@buildwise.ai", hashed_password=hashed_pw, full_name="Marcus Aurelius", role="Project Manager", is_active=True, is_verified=True, company_id=company.id),
                User(email="engineer@buildwise.ai", hashed_password=hashed_pw, full_name="Diana Prince", role="Site Engineer", is_active=True, is_verified=True, company_id=company.id),
                User(email="contractor@buildwise.ai", hashed_password=hashed_pw, full_name="Bob Builder", role="Contractor", is_active=True, is_verified=True, company_id=company.id),
                User(email="client@buildwise.ai", hashed_password=hashed_pw, full_name="Wayne Enterprises", role="Client", is_active=True, is_verified=True, company_id=company.id),
            ]
            db.add_all(users)
            db.commit()
            print("Production user accounts created successfully (password: password123):")
            for u in users:
                print(f"  - {u.email} ({u.role})")
            return

        print("Seeding Company...")
        company = Company(
            name="Apex Construction Group",
            industry="Commercial & Residential Construction",
            address="100 Enterprise Way, Suite 500, Tech City, TC 94016"
        )
        db.add(company)
        db.commit()
        db.refresh(company)

        print("Seeding Users...")
        # Hash common password
        hashed_pw = get_password_hash("password123")
        
        users = [
            User(email="admin@buildwise.ai", hashed_password=hashed_pw, full_name="Sarah Administrator", role="Administrator", is_active=True, is_verified=True, company_id=company.id),
            User(email="owner@buildwise.ai", hashed_password=hashed_pw, full_name="Robert Vance", role="Company Owner", is_active=True, is_verified=True, company_id=company.id),
            User(email="pm@buildwise.ai", hashed_password=hashed_pw, full_name="Marcus Aurelius", role="Project Manager", is_active=True, is_verified=True, company_id=company.id),
            User(email="engineer@buildwise.ai", hashed_password=hashed_pw, full_name="Diana Prince", role="Site Engineer", is_active=True, is_verified=True, company_id=company.id),
            User(email="contractor@buildwise.ai", hashed_password=hashed_pw, full_name="Bob Builder", role="Contractor", is_active=True, is_verified=True, company_id=company.id),
            User(email="client@buildwise.ai", hashed_password=hashed_pw, full_name="Wayne Enterprises", role="Client", is_active=True, is_verified=True, company_id=company.id),
        ]
        db.add_all(users)
        db.commit()
        
        # Get PM and Engineer for task mapping
        pm_user = db.query(User).filter(User.role == "Project Manager").first()
        engineer_user = db.query(User).filter(User.role == "Site Engineer").first()

        print("Seeding Projects...")
        projects = [
            Project(
                name="Downtown Heights Plaza",
                description="A 15-story mixed-use commercial office and retail building with underground parking.",
                start_date=datetime.date(2026, 1, 10),
                end_date=datetime.date(2027, 6, 30),
                budget=450000000.0,
                status="active",
                company_id=company.id,
                client_name="Municipal Development Corp",
                location="Connaught Place, New Delhi",
                building_type="Commercial",
                floors=15,
                material_quality="Luxury",
                assigned_pm_id=pm_user.id if pm_user else None,
                assigned_engineer_id=engineer_user.id if engineer_user else None
            ),
            Project(
                name="Oakridge Residential Estate",
                description="A suburban community G+1 construction project consisting of townhouses.",
                start_date=datetime.date(2025, 8, 15),
                end_date=datetime.date(2026, 11, 20),
                budget=4850000.0,
                status="delayed",
                company_id=company.id,
                client_name="Wayne Enterprises",
                location="Whitefield, Bengaluru",
                building_type="Residential",
                floors=2,
                material_quality="Premium",
                assigned_pm_id=pm_user.id if pm_user else None,
                assigned_engineer_id=engineer_user.id if engineer_user else None
            ),
            Project(
                name="Metropolitan Transit Hub",
                description="Modernization of the central subway and bus interchange station, linking high-speed rail lines.",
                start_date=datetime.date(2024, 3, 1),
                end_date=datetime.date(2026, 5, 15),
                budget=1200000000.0,
                status="completed",
                company_id=company.id,
                client_name="Indian Railways",
                location="Mumbai Central, Mumbai",
                building_type="Infrastructure",
                floors=3,
                material_quality="Standard",
                assigned_pm_id=pm_user.id if pm_user else None,
                assigned_engineer_id=engineer_user.id if engineer_user else None
            )
        ]
        db.add_all(projects)
        db.commit()
        for p in projects:
            db.refresh(p)
            
        p_active = projects[0]
        p_delayed = projects[1]
        p_completed = projects[2]

        print("Seeding Milestones...")
        milestones = [
            # Active Project Milestones
            Milestone(name="Excavation and Site Prep", description="Clear site and complete excavation", due_date=datetime.date(2026, 4, 15), status="achieved", project_id=p_active.id),
            Milestone(name="Foundation Pouring", description="Lay concrete footings and retaining walls", due_date=datetime.date(2026, 8, 1), status="pending", project_id=p_active.id),
            Milestone(name="Structural Framing", description="Erect steel columns and concrete decks", due_date=datetime.date(2026, 12, 15), status="pending", project_id=p_active.id),
            Milestone(name="Enclosure & Dry-in", description="Façade panel cladding and roofing", due_date=datetime.date(2027, 3, 1), status="pending", project_id=p_active.id),
            
            # Delayed Project Milestones
            Milestone(name="Land Permitting", description="Acquire zoning approval from municipality", due_date=datetime.date(2025, 9, 30), status="achieved", project_id=p_delayed.id),
            Milestone(name="Civil Grading", description="Site clearing and utility piping", due_date=datetime.date(2025, 12, 15), status="achieved", project_id=p_delayed.id),
            Milestone(name="Foundation Work", description="Slab pouring for blocks A-E", due_date=datetime.date(2026, 3, 10), status="pending", project_id=p_delayed.id),  # Overdue
            Milestone(name="Framing & Drywall", description="Structural framing of townhouse units", due_date=datetime.date(2026, 7, 30), status="pending", project_id=p_delayed.id),
            
            # Completed Project Milestones
            Milestone(name="Subway Platform Extension", description="Expand concrete terminal platforms", due_date=datetime.date(2024, 11, 1), status="achieved", project_id=p_completed.id),
            Milestone(name="Bus Terminal Canopy", description="Install steel tensile overhead canopy", due_date=datetime.date(2025, 9, 20), status="achieved", project_id=p_completed.id),
            Milestone(name="Final Systems Testing", description="Signoff electrical, signals, ventilation", due_date=datetime.date(2026, 5, 10), status="achieved", project_id=p_completed.id)
        ]
        db.add_all(milestones)
        db.commit()

        print("Seeding Tasks...")
        tasks = [
            # Active Project Tasks
            Task(name="Site Boundary Fencing", description="Erect temporary safety fences and signs", start_date=datetime.date(2026, 1, 15), end_date=datetime.date(2026, 1, 30), status="completed", priority="low", project_id=p_active.id, assigned_to=pm_user.id),
            Task(name="Dirt Excavation", description="Haul 15,000 cubic yards of earth", start_date=datetime.date(2026, 2, 1), end_date=datetime.date(2026, 4, 10), status="completed", priority="high", project_id=p_active.id, assigned_to=engineer_user.id),
            Task(name="Install Rebar Grid", description="Lay steel rebar grids for main slab", start_date=datetime.date(2026, 4, 15), end_date=datetime.date(2026, 6, 30), status="in_progress", priority="high", project_id=p_active.id, assigned_to=engineer_user.id),
            Task(name="Pour Concrete Foundation", description="Continuous concrete pour for core slab", start_date=datetime.date(2026, 7, 1), end_date=datetime.date(2026, 7, 30), status="pending", priority="high", project_id=p_active.id, assigned_to=pm_user.id),
            Task(name="Utility Hookups", description="Connect main water and sewage feeds", start_date=datetime.date(2026, 8, 1), end_date=datetime.date(2026, 9, 15), status="pending", priority="medium", project_id=p_active.id, assigned_to=pm_user.id),
            
            # Delayed Project Tasks
            Task(name="Site Leveling & Drainage", description="Grading land and laying drainage basins", start_date=datetime.date(2025, 8, 20), end_date=datetime.date(2025, 11, 30), status="completed", priority="medium", project_id=p_delayed.id, assigned_to=pm_user.id),
            Task(name="Retaining Wall Pour", description="Build block A-C concrete retention barriers", start_date=datetime.date(2025, 12, 1), end_date=datetime.date(2026, 1, 15), status="completed", priority="high", project_id=p_delayed.id, assigned_to=engineer_user.id),
            Task(name="Pour Foundation Slabs", description="Pour slab foundations for townhouses", start_date=datetime.date(2026, 1, 16), end_date=datetime.date(2026, 4, 15), status="in_progress", priority="high", project_id=p_delayed.id, assigned_to=engineer_user.id),  # Delayed! End date passed but in_progress
            Task(name="Lumber Procurement Delay", description="Awaiting premium SPF wood framing shipments", start_date=datetime.date(2026, 4, 1), end_date=datetime.date(2026, 5, 20), status="in_progress", priority="high", project_id=p_delayed.id, assigned_to=pm_user.id),
            Task(name="Framing Layouts", description="Assemble wall partitions and trusses", start_date=datetime.date(2026, 5, 1), end_date=datetime.date(2026, 7, 15), status="pending", priority="medium", project_id=p_delayed.id, assigned_to=engineer_user.id),
        ]
        db.add_all(tasks)
        db.commit()

        print("Seeding Budgets...")
        budgets = [
            # Active Project Budget (Total: 45 Crore INR)
            Budget(project_id=p_active.id, category="material", allocated=180000000.0, spent=55000000.0),
            Budget(project_id=p_active.id, category="labor", allocated=150000000.0, spent=40000000.0),
            Budget(project_id=p_active.id, category="equipment", allocated=60000000.0, spent=20000000.0),
            Budget(project_id=p_active.id, category="permits", allocated=20000000.0, spent=15000000.0),
            Budget(project_id=p_active.id, category="overhead", allocated=40000000.0, spent=10000000.0),
            
            # Delayed Project Budget (Total: 48.5 Lakh INR)
            Budget(project_id=p_delayed.id, category="material", allocated=2000000.0, spent=650000.0),
            Budget(project_id=p_delayed.id, category="labor", allocated=1500000.0, spent=1620000.0), # Overspent
            Budget(project_id=p_delayed.id, category="equipment", allocated=600000.0, spent=550000.0),
            Budget(project_id=p_delayed.id, category="permits", allocated=250000.0, spent=220000.0), 
            Budget(project_id=p_delayed.id, category="overhead", allocated=500000.0, spent=580000.0), # Overspent
            
            # Completed Project Budget (Total: 120 Crore INR)
            Budget(project_id=p_completed.id, category="material", allocated=500000000.0, spent=490000000.0),
            Budget(project_id=p_completed.id, category="labor", allocated=400000000.0, spent=395000000.0),
            Budget(project_id=p_completed.id, category="equipment", allocated=150000000.0, spent=148000000.0),
            Budget(project_id=p_completed.id, category="permits", allocated=50000000.0, spent=48000000.0),
            Budget(project_id=p_completed.id, category="overhead", allocated=100000000.0, spent=98000000.0),
        ]
        db.add_all(budgets)
        db.commit()

        print("Seeding Suppliers...")
        suppliers = [
            Supplier(name="Summit Concrete Corp", contact_name="Jerry Stone", email="jerry@summitconcrete.com", phone="555-0123"),
            Supplier(name="Titan Steel Industries", contact_name="Sarah Irons", email="sarah@titansteel.com", phone="555-4567"),
            Supplier(name="Evergreen Lumber & Supply", contact_name="Woody Green", email="sales@evergreenlumber.com", phone="555-8910"),
            Supplier(name="Vanguard Electricals", contact_name="Tesla Watt", email="support@vanguardelec.com", phone="555-9080")
        ]
        db.add_all(suppliers)
        db.commit()
        for s in suppliers:
            db.refresh(s)

        print("Seeding Materials...")
        materials = [
            Material(name="Premium Grade Concrete", category="cement", unit="bags", unit_price=8.5, supplier_id=suppliers[0].id),
            Material(name="High-Tensile Steel Rebar", category="steel", unit="tons", unit_price=820.0, supplier_id=suppliers[1].id),
            Material(name="SPF Structural Lumber 2x4", category="wood", unit="sqft", unit_price=4.25, supplier_id=suppliers[2].id),
            Material(name="Copper Wiring 12 AWG", category="copper", unit="meters", unit_price=12.5, supplier_id=suppliers[3].id),
            Material(name="Fine Coarse Aggregate", category="gravel", unit="tons", unit_price=35.0, supplier_id=suppliers[0].id),
        ]
        db.add_all(materials)
        db.commit()
        for m in materials:
            db.refresh(m)

        print("Seeding Inventory...")
        inventories = [
            # Active Project Inventory (Healthy levels)
            Inventory(project_id=p_active.id, material_id=materials[0].id, quantity_available=2500, quantity_reserved=1000, min_required=1500),
            Inventory(project_id=p_active.id, material_id=materials[1].id, quantity_available=85, quantity_reserved=40, min_required=50),
            Inventory(project_id=p_active.id, material_id=materials[4].id, quantity_available=600, quantity_reserved=200, min_required=300),
            
            # Delayed Project Inventory (SHORTAGES!)
            Inventory(project_id=p_delayed.id, material_id=materials[2].id, quantity_available=120, quantity_reserved=100, min_required=800), # Shortage! Available < min_required
            Inventory(project_id=p_delayed.id, material_id=materials[0].id, quantity_available=200, quantity_reserved=180, min_required=500), # Shortage!
            Inventory(project_id=p_delayed.id, material_id=materials[3].id, quantity_available=50, quantity_reserved=10, min_required=150),  # Shortage!
        ]
        db.add_all(inventories)
        db.commit()

        print("Seeding Workers...")
        workers = [
            Worker(name="Bruce Wayne", role="foreman", hourly_rate=65.0, project_id=p_active.id, status="active"),
            Worker(name="Clark Kent", role="laborer", hourly_rate=32.0, project_id=p_active.id, status="active"),
            Worker(name="Diana Prince", role="engineer", hourly_rate=80.0, project_id=p_active.id, status="active"),
            
            Worker(name="Hal Jordan", role="laborer", hourly_rate=35.0, project_id=p_delayed.id, status="active"),
            Worker(name="Barry Allen", role="laborer", hourly_rate=35.0, project_id=p_delayed.id, status="active"),
            Worker(name="Arthur Curry", role="foreman", hourly_rate=60.0, project_id=p_delayed.id, status="active")
        ]
        db.add_all(workers)
        db.commit()

        print("Seeding Equipment...")
        equipments = [
            Equipment(name="Heavy Excavator CAT-320", type="Excavator", daily_rate=380.0, status="in_use", project_id=p_active.id),
            Equipment(name="Tower Crane Liebherr 280", type="Crane", daily_rate=650.0, status="available", project_id=p_active.id),
            Equipment(name="Concrete Pump Putzmeister", type="Concrete Mixer", daily_rate=250.0, status="available", project_id=p_active.id),
            
            Equipment(name="Bulldozer CAT-D6", type="Bulldozer", daily_rate=320.0, status="in_use", project_id=p_delayed.id),
            Equipment(name="Mobile Crane Grove-300", type="Crane", daily_rate=550.0, status="maintenance", project_id=p_delayed.id), # Crane broken, delays!
        ]
        db.add_all(equipments)
        db.commit()

        print("Seeding AI Predictions...")
        predictions = [
            # Predictions for Active Project
            AIPrediction(
                project_id=p_active.id,
                prediction_type="risk",
                prediction_results={
                    "overall_risk_score": 18.5,
                    "risk_level": "Low",
                    "breakdown": {
                        "schedule_delay_risk": 15.0,
                        "budget_overrun_risk": 12.0,
                        "material_shortage_risk": 8.0,
                        "equipment_failure_risk": 20.0
                    }
                },
                confidence=0.92,
                recommendations="Project is running on track. Maintain standard weekly inspection schedules and reconfirm upcoming concrete supply lines."
            ),
            # Predictions for Delayed Project
            AIPrediction(
                project_id=p_delayed.id,
                prediction_type="risk",
                prediction_results={
                    "overall_risk_score": 78.4,
                    "risk_level": "High",
                    "breakdown": {
                        "schedule_delay_risk": 85.0,
                        "budget_overrun_risk": 74.0,
                        "material_shortage_risk": 90.0,
                        "equipment_failure_risk": 65.0
                    }
                },
                confidence=0.88,
                recommendations="1. Expeditiously address Lumber shortage of 680 sqft. Contact backup supplier.\n2. Reallocate labor resources to Foundation Slab Tasks to recover 15 lost calendar days.\n3. Mobilize the spare Crane from Downtown Heights to replace Mobile Crane Grove-300 under maintenance."
            )
        ]
        db.add_all(predictions)
        db.commit()

        print("Seeding Audit Logs & Notifications...")
        notifications = [
            Notification(user_id=pm_user.id, title="Material Shortage Warning", message="Oakridge project is running low on SPF Structural Lumber. Required: 800 sqft, Available: 120 sqft.", type="alert"),
            Notification(user_id=pm_user.id, title="Overdue Task Alert", message="Task 'Pour Foundation Slabs' for Oakridge is past its target end date (2026-04-15).", type="task"),
            Notification(user_id=engineer_user.id, title="New Blueprint Uploaded", message="Site drawing 'DT-GroundFloor-Rev2.dwg' has been uploaded.", type="task"),
        ]
        audit_logs = [
            AuditLog(user_id=pm_user.id, action="PROJECT_UPDATE", details="Updated status of Oakridge Residential Estate to 'delayed'", ip_address="192.168.1.50"),
            AuditLog(user_id=users[0].id, action="USER_LOGIN", details="Sarah Administrator logged in", ip_address="192.168.1.1"),
        ]
        db.add_all(notifications)
        db.add_all(audit_logs)
        db.commit()

        print("Database seeded successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
