from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, WorkOrder, WorkOrderStatus
from ..schemas import UserResponse, UserStatusUpdate, ExecutorRecommendation
from ..websocket_manager import ws_manager
from ..ai_service import AIService

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("", response_model=List[UserResponse])
def get_users(role: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    users = query.all()

    result = []
    for u in users:
        active_count = db.query(WorkOrder).filter(
            WorkOrder.executor_id == u.id,
            WorkOrder.status.in_([WorkOrderStatus.IN_PROGRESS.value, WorkOrderStatus.ACCEPTED.value])
        ).count()
        queued_count = db.query(WorkOrder).filter(
            WorkOrder.executor_id == u.id,
            WorkOrder.status == WorkOrderStatus.QUEUED.value
        ).count()

        result.append({
            "id": u.id,
            "full_name": u.full_name,
            "specialty": u.specialty,
            "rank": u.rank,
            "brigade": u.brigade,
            "role": u.role,
            "shift": u.shift,
            "current_status": u.current_status,
            "phone": u.phone,
            "rating": u.rating or 95.0,
            "active_orders_count": active_count,
            "queued_orders_count": queued_count
        })
    return result


@router.patch("/{user_id}/status")
async def update_user_status(user_id: int, payload: UserStatusUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Сотрудник не найден")

    user.current_status = payload.status
    db.commit()
    db.refresh(user)

    await ws_manager.broadcast("WORKER_STATUS_CHANGED", {
        "user_id": user.id,
        "new_status": user.current_status
    })

    return {"status": "ok", "user_id": user.id, "current_status": user.current_status}


@router.get("/recommendations", response_model=List[ExecutorRecommendation])
def get_executor_recommendations(
    equipment_id: int = Query(..., description="ID оборудования"),
    problem_text: str = Query("", description="Текст проблемы"),
    db: Session = Depends(get_db)
):
    """
    AI recommendation engine for 1-minute work order creation (Section 5.1).
    """
    recommendations = AIService.recommend_executor(db, equipment_id, problem_text)
    return recommendations
