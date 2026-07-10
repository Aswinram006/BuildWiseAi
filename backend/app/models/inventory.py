from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import datetime
from app.core.database import Base

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    contact_name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    materials = relationship("Material", back_populates="supplier")


class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    category = Column(String, nullable=True) # cement, steel, wood, aggregate, etc.
    unit = Column(String, nullable=False) # bags, tons, sqft, m3, etc.
    unit_price = Column(Float, nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    supplier = relationship("Supplier", back_populates="materials")
    inventory_records = relationship("Inventory", back_populates="material")


class Inventory(Base):
    __tablename__ = "inventories"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id", ondelete="CASCADE"), nullable=False)
    quantity_available = Column(Float, default=0.0)
    quantity_reserved = Column(Float, default=0.0)
    min_required = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="inventory")
    material = relationship("Material", back_populates="inventory_records")
