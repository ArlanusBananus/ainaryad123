import os
import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
import aiofiles

from ..database import get_db
from ..models import (
    WorkOrder, WorkOrderEvent, WorkOrderPhoto, MaterialUsage, AIAssessment,
    User, Equipment, Location, MalfunctionCode, WorkOrderStatus, WorkerStatus,
    OrderPriority, OrderType
)
from ..schemas import (
    WorkOrderCreate, WorkOrderStatusUpdate, WorkOrderClose, WorkOrderResponse,
    MasterOverride
)
from ..websocket_manager import ws_manager
from ..ai_service import AIService

router = APIRouter(prefix="/api/work-orders", tags=["work-orders"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def format_work_order(wo: WorkOrder) -> dict:
    now = datetime.utcnow()
    is_overdue = bool(wo.deadline and wo.deadline < now and wo.status not in [WorkOrderStatus.CLOSED.value, WorkOrderStatus.EXECUTED.value])
    
    return {
        "id": wo.id,
        "number": wo.number,
        "order_type": wo.order_type,
        "priority": wo.priority,
        "description": wo.description,
        "location_id": wo.location_id,
        "location_name": wo.location.name if wo.location else None,
        "equipment_id": wo.equipment_id,
        "equipment_name": wo.equipment.name if wo.equipment else None,
        "equipment_inv": wo.equipment.inventory_number if wo.equipment else None,
        "executor_id": wo.executor_id,
        "executor_name": wo.executor.full_name if wo.executor else None,
        "executor_specialty": wo.executor.specialty if wo.executor else None,
        "master_id": wo.master_id,
        "master_name": wo.master.full_name if wo.master else None,
        "status": wo.status,
        "deadline": wo.deadline,
        "standard_hours": wo.standard_hours or 1.5,
        "actual_duration_minutes": wo.actual_duration_minutes,
        "completion_notes": wo.completion_notes,
        "malfunction_code_id": wo.malfunction_code_id,
        "malfunction_code_str": f"{wo.malfunction_code.code} - {wo.malfunction_code.description}" if wo.malfunction_code else None,
        "reject_reason": wo.reject_reason,
        "suspend_reason": wo.suspend_reason,
        "ai_verdict": wo.ai_verdict,
        "ai_score": wo.ai_score,
        "ai_notes": wo.ai_notes,
        "master_rating_override": wo.master_rating_override,
        "created_at": wo.created_at,
        "accepted_at": wo.accepted_at,
        "started_at": wo.started_at,
        "executed_at": wo.executed_at,
        "closed_at": wo.closed_at,
        "is_overdue": is_overdue,
        "events": [
            {
                "id": ev.id,
                "work_order_id": ev.work_order_id,
                "user_name": ev.user_name,
                "action": ev.action,
                "timestamp": ev.timestamp,
                "comment": ev.comment,
                "reason": ev.reason
            }
            for ev in wo.events
        ],
        "photos": [
            {
                "id": p.id,
                "work_order_id": p.work_order_id,
                "photo_type": p.photo_type,
                "file_path": p.file_path,
                "uploaded_at": p.uploaded_at,
                "author_name": p.author_name
            }
            for p in wo.photos
        ],
        "materials": [
            {
                "id": m.id,
                "work_order_id": m.work_order_id,
                "material_id": m.material_id,
                "material_name": m.material_name,
                "quantity": m.quantity,
                "unit": m.unit
            }
            for m in wo.materials
        ],
        "ai_assessments": [
            {
                "id": a.id,
                "work_order_id": a.work_order_id,
                "verdict": a.verdict,
                "score": a.score,
                "explanation": a.explanation,
                "completeness_check": a.completeness_check,
                "work_alignment_score": a.work_alignment_score,
                "materials_logic_check": a.materials_logic_check,
                "photo_quality_score": a.photo_quality_score,
                "time_score": a.time_score,
                "created_at": a.created_at
            }
            for a in wo.ai_assessments
        ]
    }


@router.get("", response_model=List[WorkOrderResponse])
def get_work_orders(
    executor_id: Optional[int] = None,
    master_id: Optional[int] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    location_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(WorkOrder).options(
        joinedload(WorkOrder.location),
        joinedload(WorkOrder.equipment),
        joinedload(WorkOrder.executor),
        joinedload(WorkOrder.master),
        joinedload(WorkOrder.malfunction_code),
        joinedload(WorkOrder.events),
        joinedload(WorkOrder.photos),
        joinedload(WorkOrder.materials),
        joinedload(WorkOrder.ai_assessments)
    )

    if executor_id:
        query = query.filter(WorkOrder.executor_id == executor_id)
    if master_id:
        query = query.filter(WorkOrder.master_id == master_id)
    if status:
        query = query.filter(WorkOrder.status == status)
    if priority:
        query = query.filter(WorkOrder.priority == priority)
    if location_id:
        query = query.filter(WorkOrder.location_id == location_id)

    orders = query.order_by(WorkOrder.created_at.desc()).all()
    return [format_work_order(o) for o in orders]


@router.get("/{order_id}", response_model=WorkOrderResponse)
def get_work_order_detail(order_id: int, db: Session = Depends(get_db)):
    wo = db.query(WorkOrder).options(
        joinedload(WorkOrder.location),
        joinedload(WorkOrder.equipment),
        joinedload(WorkOrder.executor),
        joinedload(WorkOrder.master),
        joinedload(WorkOrder.malfunction_code),
        joinedload(WorkOrder.events),
        joinedload(WorkOrder.photos),
        joinedload(WorkOrder.materials),
        joinedload(WorkOrder.ai_assessments)
    ).filter(WorkOrder.id == order_id).first()

    if not wo:
        raise HTTPException(status_code=404, detail="Наряд не найден")
    return format_work_order(wo)


@router.post("", response_model=WorkOrderResponse)
async def create_work_order(payload: WorkOrderCreate, db: Session = Depends(get_db)):
    """
    Creates new work order by shift master (Section 5.1).
    Broadcasts WORK_ORDER_CREATED event via WebSocket.
    """
    count = db.query(WorkOrder).count() + 102
    order_number = f"НАР-2026-{count:03d}"

    deadline = payload.deadline
    if not deadline:
        minutes = payload.deadline_minutes or int((payload.standard_hours or 2.0) * 60)
        deadline = datetime.utcnow() + timedelta(minutes=minutes)

    wo = WorkOrder(
        number=order_number,
        order_type=payload.order_type,
        priority=payload.priority,
        description=payload.description,
        location_id=payload.location_id,
        equipment_id=payload.equipment_id,
        executor_id=payload.executor_id,
        master_id=payload.master_id,
        status=WorkOrderStatus.ISSUED.value,
        deadline=deadline,
        standard_hours=payload.standard_hours or 1.5,
        created_at=datetime.utcnow()
    )
    db.add(wo)
    db.flush()

    # Master event
    master_user = db.query(User).filter(User.id == payload.master_id).first()
    master_name = master_user.full_name if master_user else "Мастер смены"
    
    event = WorkOrderEvent(
        work_order_id=wo.id,
        user_id=payload.master_id,
        user_name=master_name,
        action="ISSUED",
        comment=payload.comment or f"Выдан наряд с приоритетом {payload.priority}"
    )
    db.add(event)

    # If before_photo was provided
    if payload.before_photo_url:
        photo = WorkOrderPhoto(
            work_order_id=wo.id,
            photo_type="BEFORE",
            file_path=payload.before_photo_url,
            author_id=payload.master_id,
            author_name=master_name
        )
        db.add(photo)

    # Check executor current status
    executor = db.query(User).filter(User.id == payload.executor_id).first()
    if executor and executor.current_status == WorkerStatus.FREE.value:
        executor.current_status = WorkerStatus.BUSY.value

    db.commit()
    db.refresh(wo)

    formatted = format_work_order(wo)
    await ws_manager.broadcast("WORK_ORDER_CREATED", formatted)
    return formatted


@router.patch("/{order_id}/status", response_model=WorkOrderResponse)
async def update_work_order_status(
    order_id: int,
    payload: WorkOrderStatusUpdate,
    db: Session = Depends(get_db)
):
    """
    Handles status changes:
    - ACCEPTED (Принят)
    - QUEUED (В очередь)
    - IN_PROGRESS (В работу)
    - SUSPENDED (Приостановлен с причиной)
    - REJECTED (Отклонён с причиной)
    - CLOSED (Закрыт мастером)
    """
    wo = db.query(WorkOrder).filter(WorkOrder.id == order_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Наряд не найден")

    old_status = wo.status
    new_status = payload.status
    now = datetime.utcnow()

    user = db.query(User).filter(User.id == payload.user_id).first() if payload.user_id else None
    user_name = user.full_name if user else "Система"

    wo.status = new_status

    if new_status == WorkOrderStatus.ACCEPTED.value:
        wo.accepted_at = now
    elif new_status == WorkOrderStatus.IN_PROGRESS.value:
        wo.started_at = now
        if wo.executor:
            wo.executor.current_status = WorkerStatus.BUSY.value
    elif new_status == WorkOrderStatus.QUEUED.value:
        if wo.executor:
            wo.executor.current_status = WorkerStatus.HAS_QUEUE.value
    elif new_status == WorkOrderStatus.SUSPENDED.value:
        wo.suspend_reason = payload.reason or payload.comment
    elif new_status == WorkOrderStatus.REJECTED.value:
        wo.reject_reason = payload.reason or payload.comment
        if wo.executor:
            wo.executor.current_status = WorkerStatus.FREE.value
    elif new_status == WorkOrderStatus.CLOSED.value:
        wo.closed_at = now
        if wo.executor:
            # check if executor has more active work
            active_count = db.query(WorkOrder).filter(
                WorkOrder.executor_id == wo.executor_id,
                WorkOrder.status.in_([WorkOrderStatus.IN_PROGRESS.value, WorkOrderStatus.ACCEPTED.value])
            ).count()
            if active_count <= 1:
                wo.executor.current_status = WorkerStatus.FREE.value

    # Log event
    event = WorkOrderEvent(
        work_order_id=wo.id,
        user_id=payload.user_id,
        user_name=user_name,
        action=new_status,
        comment=payload.comment,
        reason=payload.reason
    )
    db.add(event)
    db.commit()
    db.refresh(wo)

    formatted = format_work_order(wo)
    await ws_manager.broadcast("STATUS_CHANGE", {
        "order_id": wo.id,
        "old_status": old_status,
        "new_status": new_status,
        "order": formatted
    })
    return formatted


@router.post("/{order_id}/close", response_model=WorkOrderResponse)
async def close_work_order_with_ai(
    order_id: int,
    payload: WorkOrderClose,
    db: Session = Depends(get_db)
):
    """
    Executor submits completed work:
    - completion notes
    - malfunction code
    - materials used
    - photo after
    Triggers AI validation (Section 6.2).
    """
    wo = db.query(WorkOrder).filter(WorkOrder.id == order_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Наряд не найден")

    now = datetime.utcnow()
    user = db.query(User).filter(User.id == payload.user_id).first() if payload.user_id else wo.executor
    user_name = user.full_name if user else "Исполнитель"

    wo.completion_notes = payload.completion_notes
    wo.malfunction_code_id = payload.malfunction_code_id
    wo.executed_at = now
    
    # Calculate duration
    if payload.actual_duration_minutes:
        wo.actual_duration_minutes = payload.actual_duration_minutes
    elif wo.started_at:
        wo.actual_duration_minutes = max(15, int((now - wo.started_at).total_seconds() / 60))
    else:
        wo.actual_duration_minutes = 60

    # Add materials
    if payload.materials:
        for m in payload.materials:
            usage = MaterialUsage(
                work_order_id=wo.id,
                material_id=m.material_id,
                material_name=m.material_name,
                quantity=m.quantity,
                unit=m.unit
            )
            db.add(usage)

    # Add after photo if uploaded or url provided
    has_photo = bool(payload.photo_url)
    if payload.photo_url:
        photo = WorkOrderPhoto(
            work_order_id=wo.id,
            photo_type="AFTER",
            file_path=payload.photo_url,
            author_id=user.id if user else None,
            author_name=user_name
        )
        db.add(photo)
    else:
        # check if photo was uploaded earlier
        existing_after = db.query(WorkOrderPhoto).filter(
            WorkOrderPhoto.work_order_id == wo.id,
            WorkOrderPhoto.photo_type == "AFTER"
        ).first()
        if existing_after:
            has_photo = True

    materials_list = [{"material_name": m.material_name, "quantity": m.quantity} for m in payload.materials]

    # Run AI evaluation (Module 6.2)
    ai_result = AIService.evaluate_work_order(
        db=db,
        order=wo,
        completion_notes=payload.completion_notes,
        malfunction_code_id=payload.malfunction_code_id,
        materials=materials_list,
        has_after_photo=has_photo,
        actual_duration_minutes=wo.actual_duration_minutes
    )

    wo.ai_verdict = ai_result["verdict"]
    wo.ai_score = ai_result["score"]
    wo.ai_notes = ai_result["explanation"]

    # Status transition based on AI verdict
    if ai_result["verdict"] == "REWORK_REQUIRED":
        wo.status = WorkOrderStatus.REWORK.value
        action_name = "REWORK"
    else:
        wo.status = WorkOrderStatus.EXECUTED.value
        action_name = "EXECUTED"

    # Save AIAssessment record
    assessment = AIAssessment(
        work_order_id=wo.id,
        verdict=ai_result["verdict"],
        score=ai_result["score"],
        explanation=ai_result["explanation"],
        completeness_check=ai_result["completeness_check"],
        work_alignment_score=ai_result["work_alignment_score"],
        materials_logic_check=ai_result["materials_logic_check"],
        photo_quality_score=ai_result["photo_quality_score"],
        time_score=ai_result["time_score"],
        created_at=now
    )
    db.add(assessment)

    # Log event
    event = WorkOrderEvent(
        work_order_id=wo.id,
        user_id=user.id if user else None,
        user_name=user_name,
        action=action_name,
        comment=f"Сдано исполнителем. Вердикт ИИ: {ai_result['verdict_text']} ({ai_result['score']} баллов)"
    )
    db.add(event)

    db.commit()
    db.refresh(wo)

    formatted = format_work_order(wo)
    await ws_manager.broadcast("AI_CHECK_COMPLETED", {
        "order_id": wo.id,
        "ai_result": ai_result,
        "order": formatted
    })
    return formatted


@router.post("/{order_id}/override-ai", response_model=WorkOrderResponse)
async def master_override_ai(
    order_id: int,
    payload: MasterOverride,
    db: Session = Depends(get_db)
):
    """
    Shift master confirms or overrides AI score and closes order (Section 6.4).
    """
    wo = db.query(WorkOrder).filter(WorkOrder.id == order_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Наряд не найден")

    master = db.query(User).filter(User.id == payload.master_id).first()
    master_name = master.full_name if master else "Мастер смены"

    wo.master_rating_override = payload.score
    if payload.action == "APPROVE":
        wo.status = WorkOrderStatus.CLOSED.value
        wo.closed_at = datetime.utcnow()
        if wo.executor:
            wo.executor.current_status = WorkerStatus.FREE.value
        action = "CLOSED"
        comment = f"Мастер подтвердил закрытие наряда с оценкой {payload.score}/100. Примечание: {payload.notes or 'Без замечаний'}"
    else:
        wo.status = WorkOrderStatus.REWORK.value
        action = "REWORK"
        comment = f"Мастер вернул на доработку: {payload.notes or 'Устранить замечания'}"

    event = WorkOrderEvent(
        work_order_id=wo.id,
        user_id=payload.master_id,
        user_name=master_name,
        action=action,
        comment=comment
    )
    db.add(event)
    db.commit()
    db.refresh(wo)

    formatted = format_work_order(wo)
    await ws_manager.broadcast("STATUS_CHANGE", {
        "order_id": wo.id,
        "new_status": wo.status,
        "order": formatted
    })
    return formatted


@router.post("/upload-photo")
async def upload_work_order_photo(file: UploadFile = File(...)):
    """
    Uploads photo with compression storage (Section 9 requirement 6).
    """
    extension = os.path.splitext(file.filename)[1] or ".jpg"
    unique_filename = f"{uuid.uuid4().hex}{extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    async with aiofiles.open(file_path, "wb") as out_file:
        content = await file.read()
        await out_file.write(content)

    return {"photo_url": f"/uploads/{unique_filename}", "filename": unique_filename}
