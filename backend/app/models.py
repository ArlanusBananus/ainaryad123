import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class WorkOrderStatus(str, enum.Enum):
    ISSUED = "ISSUED"                  # 1. Выдан
    ACCEPTED = "ACCEPTED"              # 2. Принят в работу
    QUEUED = "QUEUED"                  # 3. В очереди
    IN_PROGRESS = "IN_PROGRESS"        # 4. В работе
    SUSPENDED = "SUSPENDED"            # 5. Приостановлен
    REJECTED = "REJECTED"              # 6. Отклонён
    EXECUTED = "EXECUTED"              # 7. Исполнено
    AI_CHECK = "AI_CHECK"              # 8. Проверка ИИ
    REWORK = "REWORK"                  # 9. На доработку
    CLOSED = "CLOSED"                  # 10. Закрыт

class UserRole(str, enum.Enum):
    MASTER = "MASTER"                  # Мастер смены
    EXECUTOR = "EXECUTOR"              # Исполнитель (слесарь, электрик и т.д.)
    MANAGER = "MANAGER"                # Руководитель (начальник участка / главный механик)
    ADMIN = "ADMIN"                    # Администратор

class WorkerStatus(str, enum.Enum):
    FREE = "FREE"                      # Зелёный — свободен
    BUSY = "BUSY"                      # Жёлтый — в работе
    HAS_QUEUE = "HAS_QUEUE"            # Синий — есть очередь
    OFF_SHIFT = "OFF_SHIFT"            # Серый — не на смене

class OrderPriority(str, enum.Enum):
    EMERGENCY = "EMERGENCY"            # Аварийный — срочно в работу
    HIGH = "HIGH"                      # Высокий
    NORMAL = "NORMAL"                  # Обычный — в порядке очереди
    PLANNED = "PLANNED"                # Плановый

class OrderType(str, enum.Enum):
    PLANNED = "PLANNED"                # Плановый
    EMERGENCY = "EMERGENCY"            # Внеплановый (аварийный)

class AIVerdict(str, enum.Enum):
    APPROVED = "APPROVED"                          # Принято
    APPROVED_WITH_NOTES = "APPROVED_WITH_NOTES"    # Принято с замечаниями
    REWORK_REQUIRED = "REWORK_REQUIRED"            # Требует доработки


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    code = Column(String(50), nullable=True)
    description = Column(String(255), nullable=True)

    equipment = relationship("Equipment", back_populates="location")
    work_orders = relationship("WorkOrder", back_populates="location")


class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    inventory_number = Column(String(50), unique=True, nullable=False, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    equipment_type = Column(String(100), nullable=False)
    criticality = Column(String(50), default="Средняя")  # Критическое, Высокая, Средняя, Низкая
    status = Column(String(50), default="WORKING")       # WORKING, DOWNTIME, REPAIR

    location = relationship("Location", back_populates="equipment")
    work_orders = relationship("WorkOrder", back_populates="equipment")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(120), nullable=False)
    specialty = Column(String(100), nullable=False)      # Слесарь, Электрик, Сварщик, Механик, Мастер смены
    rank = Column(Integer, default=4)                    # Разряд: 3-6
    brigade = Column(String(50), nullable=True)          # Бригада №1, №2, №3
    role = Column(String(50), default=UserRole.EXECUTOR.value)
    shift = Column(String(50), default="Дневная смена 1")
    current_status = Column(String(50), default=WorkerStatus.FREE.value) # FREE, BUSY, HAS_QUEUE, OFF_SHIFT
    phone = Column(String(30), nullable=True)
    pin_code = Column(String(10), default="1234")
    rating = Column(Float, default=95.0)                 # Рейтинг 0-100%

    assigned_orders = relationship("WorkOrder", foreign_keys="WorkOrder.executor_id", back_populates="executor")
    issued_orders = relationship("WorkOrder", foreign_keys="WorkOrder.master_id", back_populates="master")


class MalfunctionCode(Base):
    __tablename__ = "malfunction_codes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False) # e.g. М-01, Э-02
    category = Column(String(50), nullable=False)          # М - механика, Э - электрика, Г - гидравлика, П - пневматика, С - смазка
    description = Column(String(255), nullable=False)
    standard_hours = Column(Float, default=1.5)


class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(150), nullable=False)
    unit = Column(String(20), default="шт")                # шт, кг, м, л, комплект
    category = Column(String(50), nullable=True)
    standard_cost = Column(Float, default=0.0)


class WorkOrder(Base):
    __tablename__ = "work_orders"

    id = Column(Integer, primary_key=True, index=True)
    number = Column(String(50), unique=True, nullable=False, index=True) # e.g. НАР-101
    order_type = Column(String(50), default=OrderType.PLANNED.value)     # PLANNED, EMERGENCY
    priority = Column(String(50), default=OrderPriority.NORMAL.value)   # EMERGENCY, HIGH, NORMAL, PLANNED
    description = Column(Text, nullable=False)

    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=False)
    executor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    master_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    status = Column(String(50), default=WorkOrderStatus.ISSUED.value, index=True)

    deadline = Column(DateTime, nullable=False)
    standard_hours = Column(Float, default=1.5)
    actual_duration_minutes = Column(Integer, nullable=True)

    completion_notes = Column(Text, nullable=True)
    malfunction_code_id = Column(Integer, ForeignKey("malfunction_codes.id"), nullable=True)
    reject_reason = Column(Text, nullable=True)
    suspend_reason = Column(Text, nullable=True)

    # AI assessment summary
    ai_verdict = Column(String(50), nullable=True) # APPROVED, APPROVED_WITH_NOTES, REWORK_REQUIRED
    ai_score = Column(Integer, nullable=True)      # 0-100
    ai_notes = Column(Text, nullable=True)
    master_rating_override = Column(Integer, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    accepted_at = Column(DateTime, nullable=True)
    started_at = Column(DateTime, nullable=True)
    executed_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)

    # Relationships
    location = relationship("Location", back_populates="work_orders")
    equipment = relationship("Equipment", back_populates="work_orders")
    executor = relationship("User", foreign_keys=[executor_id], back_populates="assigned_orders")
    master = relationship("User", foreign_keys=[master_id], back_populates="issued_orders")
    malfunction_code = relationship("MalfunctionCode")

    events = relationship("WorkOrderEvent", back_populates="work_order", cascade="all, delete-orphan", order_by="WorkOrderEvent.timestamp.asc()")
    photos = relationship("WorkOrderPhoto", back_populates="work_order", cascade="all, delete-orphan")
    materials = relationship("MaterialUsage", back_populates="work_order", cascade="all, delete-orphan")
    ai_assessments = relationship("AIAssessment", back_populates="work_order", cascade="all, delete-orphan")


class WorkOrderEvent(Base):
    __tablename__ = "work_order_events"

    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_name = Column(String(120), nullable=True)
    action = Column(String(100), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    comment = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)

    work_order = relationship("WorkOrder", back_populates="events")


class WorkOrderPhoto(Base):
    __tablename__ = "work_order_photos"

    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
    photo_type = Column(String(20), default="AFTER") # BEFORE, AFTER
    file_path = Column(String(255), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    author_name = Column(String(120), nullable=True)

    work_order = relationship("WorkOrder", back_populates="photos")


class MaterialUsage(Base):
    __tablename__ = "material_usages"

    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=True)
    material_name = Column(String(150), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String(20), default="шт")

    work_order = relationship("WorkOrder", back_populates="materials")


class AIAssessment(Base):
    __tablename__ = "ai_assessments"

    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
    verdict = Column(String(50), nullable=False)          # APPROVED, APPROVED_WITH_NOTES, REWORK_REQUIRED
    score = Column(Integer, default=90)                    # 0-100
    explanation = Column(Text, nullable=False)
    completeness_check = Column(Boolean, default=True)
    work_alignment_score = Column(Integer, default=95)
    materials_logic_check = Column(Boolean, default=True)
    photo_quality_score = Column(Integer, default=90)
    time_score = Column(Integer, default=90)
    created_at = Column(DateTime, default=datetime.utcnow)

    work_order = relationship("WorkOrder", back_populates="ai_assessments")
