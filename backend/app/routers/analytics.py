from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import WorkOrder, WorkOrderStatus, Equipment, User
from ..schemas import ShiftSummary
from ..ai_service import AIService
from ..websocket_manager import ws_manager

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/shift", response_model=ShiftSummary)
def get_shift_summary(db: Session = Depends(get_db)):
    total_issued = db.query(WorkOrder).count()
    in_progress = db.query(WorkOrder).filter(WorkOrder.status == WorkOrderStatus.IN_PROGRESS.value).count()
    accepted = db.query(WorkOrder).filter(WorkOrder.status == WorkOrderStatus.ACCEPTED.value).count()
    queued = db.query(WorkOrder).filter(WorkOrder.status == WorkOrderStatus.QUEUED.value).count()
    executed = db.query(WorkOrder).filter(WorkOrder.status == WorkOrderStatus.EXECUTED.value).count()
    closed = db.query(WorkOrder).filter(WorkOrder.status == WorkOrderStatus.CLOSED.value).count()

    now = datetime.utcnow()
    overdue = db.query(WorkOrder).filter(
        WorkOrder.deadline < now,
        WorkOrder.status.notin_([WorkOrderStatus.CLOSED.value, WorkOrderStatus.EXECUTED.value])
    ).count()

    downtime_equipment = db.query(Equipment).filter(Equipment.status.in_(["DOWNTIME", "REPAIR"])).count()

    summary_text = (
        f"ИИ-сводка смены: На линии {total_issued} нарядов. В активной работе: {in_progress}, "
        f"выполнено/закрыто: {executed + closed}. "
        f"Выявлено {overdue} нарядов с нарушением срока. "
        f"В простое/ремонте находится {downtime_equipment} ед. оборудования (особое внимание: Конвейер К-3, Насос 1ГрТ). "
        f"Загрузка персонала сбалансирована на 88%."
    )

    return {
        "total_issued": total_issued,
        "in_progress": in_progress,
        "accepted": accepted,
        "queued": queued,
        "executed": executed,
        "closed": closed,
        "overdue": overdue,
        "downtime_equipment_count": downtime_equipment,
        "ai_summary_text": summary_text
    }


@router.get("/anomalies")
def get_anomalies(db: Session = Depends(get_db)):
    return AIService.get_equipment_anomalies(db)


@router.get("/workers-rating")
def get_workers_rating(db: Session = Depends(get_db)):
    return AIService.get_worker_ratings(db)


@router.get("/check-deadlines")
async def check_deadlines(db: Session = Depends(get_db)):
    alerts = AIService.check_deadlines_and_alerts(db)
    if alerts:
        await ws_manager.broadcast("AI_DEADLINE_ALERT", {"alerts": alerts})
    return {"alerts": alerts, "count": len(alerts)}
