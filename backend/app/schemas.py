from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

# Location Schemas
class LocationBase(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None

class LocationResponse(LocationBase):
    id: int
    class Config:
        from_attributes = True

# Equipment Schemas
class EquipmentBase(BaseModel):
    name: str
    inventory_number: str
    location_id: int
    equipment_type: str
    criticality: str = "Средняя"
    status: str = "WORKING"

class EquipmentResponse(EquipmentBase):
    id: int
    location_name: Optional[str] = None
    class Config:
        from_attributes = True

# User Schemas
class UserBase(BaseModel):
    full_name: str
    specialty: str
    rank: int = 4
    brigade: Optional[str] = "Бригада №1"
    role: str = "EXECUTOR"
    shift: str = "Дневная смена 1"
    current_status: str = "FREE"
    phone: Optional[str] = None
    rating: float = 95.0

class UserResponse(UserBase):
    id: int
    active_orders_count: int = 0
    queued_orders_count: int = 0
    class Config:
        from_attributes = True

class UserStatusUpdate(BaseModel):
    status: str # FREE, BUSY, HAS_QUEUE, OFF_SHIFT

# Catalogs
class MalfunctionCodeResponse(BaseModel):
    id: int
    code: str
    category: str
    description: str
    standard_hours: float
    class Config:
        from_attributes = True

class MaterialResponse(BaseModel):
    id: int
    code: str
    name: str
    unit: str
    category: Optional[str] = None
    standard_cost: float = 0.0
    class Config:
        from_attributes = True

class MaterialUsageItem(BaseModel):
    material_id: Optional[int] = None
    material_name: str
    quantity: float
    unit: str = "шт"

class MaterialUsageResponse(MaterialUsageItem):
    id: int
    work_order_id: int
    class Config:
        from_attributes = True

class PhotoResponse(BaseModel):
    id: int
    work_order_id: int
    photo_type: str
    file_path: str
    uploaded_at: datetime
    author_name: Optional[str] = None
    class Config:
        from_attributes = True

class EventResponse(BaseModel):
    id: int
    work_order_id: int
    user_name: Optional[str] = None
    action: str
    timestamp: datetime
    comment: Optional[str] = None
    reason: Optional[str] = None
    class Config:
        from_attributes = True

class AIAssessmentResponse(BaseModel):
    id: int
    work_order_id: int
    verdict: str
    score: int
    explanation: str
    completeness_check: bool
    work_alignment_score: int
    materials_logic_check: bool
    photo_quality_score: int
    time_score: int
    created_at: datetime
    class Config:
        from_attributes = True

# Work Order Schemas
class WorkOrderCreate(BaseModel):
    order_type: str = "PLANNED" # PLANNED, EMERGENCY
    priority: str = "NORMAL"    # EMERGENCY, HIGH, NORMAL, PLANNED
    description: str
    location_id: int
    equipment_id: int
    executor_id: int
    master_id: int
    deadline_minutes: Optional[int] = 120 # default 2 hours from now
    deadline: Optional[datetime] = None
    standard_hours: Optional[float] = 2.0
    before_photo_url: Optional[str] = None
    comment: Optional[str] = None

class WorkOrderStatusUpdate(BaseModel):
    status: str
    reason: Optional[str] = None
    comment: Optional[str] = None
    user_id: Optional[int] = None

class WorkOrderClose(BaseModel):
    completion_notes: str
    malfunction_code_id: Optional[int] = None
    materials: List[MaterialUsageItem] = []
    comment: Optional[str] = None
    photo_url: Optional[str] = None
    actual_duration_minutes: Optional[int] = None
    user_id: Optional[int] = None

class MasterOverride(BaseModel):
    master_id: int
    score: int
    notes: Optional[str] = None
    action: str = "APPROVE" # APPROVE, REWORK

class WorkOrderResponse(BaseModel):
    id: int
    number: str
    order_type: str
    priority: str
    description: str
    location_id: int
    location_name: Optional[str] = None
    equipment_id: int
    equipment_name: Optional[str] = None
    equipment_inv: Optional[str] = None
    executor_id: int
    executor_name: Optional[str] = None
    executor_specialty: Optional[str] = None
    master_id: int
    master_name: Optional[str] = None
    status: str
    deadline: datetime
    standard_hours: float
    actual_duration_minutes: Optional[int] = None
    completion_notes: Optional[str] = None
    malfunction_code_id: Optional[int] = None
    malfunction_code_str: Optional[str] = None
    reject_reason: Optional[str] = None
    suspend_reason: Optional[str] = None
    ai_verdict: Optional[str] = None
    ai_score: Optional[int] = None
    ai_notes: Optional[str] = None
    master_rating_override: Optional[int] = None
    created_at: datetime
    accepted_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    executed_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    is_overdue: bool = False
    events: List[EventResponse] = []
    photos: List[PhotoResponse] = []
    materials: List[MaterialUsageResponse] = []
    ai_assessments: List[AIAssessmentResponse] = []
    class Config:
        from_attributes = True

# AI Recommendation Schema
class ExecutorRecommendation(BaseModel):
    user_id: int
    full_name: str
    specialty: str
    rank: int
    status: str
    rating: float
    match_score: int
    reason: str

# Shift Analytics Schema
class ShiftSummary(BaseModel):
    total_issued: int
    in_progress: int
    accepted: int
    queued: int
    executed: int
    closed: int
    overdue: int
    downtime_equipment_count: int
    ai_summary_text: str
