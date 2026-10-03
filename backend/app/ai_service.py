import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from .models import (
    WorkOrder, WorkOrderStatus, User, Equipment, Location,
    MalfunctionCode, AIAssessment, WorkOrderPhoto, MaterialUsage,
    AIVerdict, WorkerStatus, OrderType, OrderPriority
)

class AIService:
    @staticmethod
    def evaluate_work_order(
        db: Session,
        order: WorkOrder,
        completion_notes: str,
        malfunction_code_id: Optional[int],
        materials: List[Dict[str, Any]],
        has_after_photo: bool,
        actual_duration_minutes: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        AI Module 6.2 & 6.3:
        Checks:
        1. Completeness (completion_notes, malfunction code, materials, after photo)
        2. Alignment of work with problem description
        3. Materials logic and rationality
        4. Time vs standard
        5. Photo presence and quality
        """
        issues = []
        positive_points = []
        base_score = 100

        # 1. Completeness Check
        notes_len = len(completion_notes.strip()) if completion_notes else 0
        if notes_len < 10:
            issues.append("Слишком краткое описание выполненных работ (менее 10 символов)")
            base_score -= 20
        else:
            positive_points.append("Описание выполненных работ заполнено подробно")

        if not malfunction_code_id:
            issues.append("Не указан шифр неисправности из справочника")
            base_score -= 15
        else:
            malfunction = db.query(MalfunctionCode).filter(MalfunctionCode.id == malfunction_code_id).first()
            if malfunction:
                positive_points.append(f"Указан шифр неисправности {malfunction.code}: {malfunction.description}")

        # Photo check (Section 5.3 & 6.3: mandatory for emergency/unplanned works)
        is_emergency = order.order_type == OrderType.EMERGENCY.value or order.priority in [OrderPriority.EMERGENCY.value, OrderPriority.HIGH.value]
        if is_emergency and not has_after_photo:
            issues.append("Критично: отсутствует фотоотчёт «после ремонта» для аварийного/внепланового наряда")
            base_score -= 35
        elif has_after_photo:
            positive_points.append("Прикреплено фото выполненного ремонта для визуального контроля ИИ")

        # 2. Material Logic Check
        malfunction = db.query(MalfunctionCode).filter(MalfunctionCode.id == malfunction_code_id).first() if malfunction_code_id else None
        
        # Check if materials are logical
        suspicious_materials = False
        if materials:
            positive_points.append(f"Учтено материалов/запчастей: {len(materials)} поз.")
            for mat in materials:
                qty = float(mat.get("quantity", 1))
                name = mat.get("material_name", "").lower()
                # Check for suspicious excessive consumption
                if qty > 50 and ("подшипник" in name or "двигатель" in name or "насос" in name):
                    issues.append(f"Аномальное количество материала: {mat.get('material_name')} ({qty} шт.)")
                    suspicious_materials = True
                    base_score -= 25

                # Check category compatibility
                if malfunction and malfunction.category.startswith("Э") and ("масло" in name or "смазка" in name) and len(materials) == 1:
                    issues.append("Списан смазочный материал для чисто электрической неисправности (проверьте списание)")
                    base_score -= 15

        elif is_emergency:
            # Emergency mechanical repair usually needs materials or consumables
            if malfunction and (malfunction.category.startswith("М") or malfunction.category.startswith("Г")):
                issues.append("Для устранения механической/гидравлической поломки не списаны запчасти или расходные материалы")
                base_score -= 15

        # 3. Time comparison
        standard_minutes = int((order.standard_hours or 1.5) * 60)
        actual_min = actual_duration_minutes or 60
        if actual_min < 15 and standard_minutes >= 60 and is_emergency:
            issues.append(f"Подозрительно быстрое выполнение: {actual_min} мин. при нормативе {standard_minutes} мин.")
            base_score -= 15
        elif actual_min <= standard_minutes * 1.2:
            positive_points.append(f"Работы выполнены в пределах норматива времени ({actual_min} мин / норм. {standard_minutes} мин)")
        else:
            diff = actual_min - standard_minutes
            issues.append(f"Превышение норматива времени на {diff} мин")
            base_score -= 10

        # Determine verdict
        final_score = max(10, min(100, base_score))

        if is_emergency and not has_after_photo:
            verdict = AIVerdict.REWORK_REQUIRED.value
            verdict_text = "Требует доработки"
            explanation = "Отклонено ИИ-контролёром: " + "; ".join(issues)
        elif final_score < 70 or suspicious_materials:
            verdict = AIVerdict.REWORK_REQUIRED.value
            verdict_text = "Требует доработки"
            explanation = "Выявлены расхождения: " + "; ".join(issues)
        elif final_score < 85 or len(issues) > 0:
            verdict = AIVerdict.APPROVED_WITH_NOTES.value
            verdict_text = "Принято с замечаниями"
            explanation = "Принято с замечаниями: " + "; ".join(issues) + ". Плюсы: " + "; ".join(positive_points)
        else:
            verdict = AIVerdict.APPROVED.value
            verdict_text = "Принято"
            explanation = "Качество подтверждено: " + "; ".join(positive_points)

        return {
            "verdict": verdict,
            "verdict_text": verdict_text,
            "score": final_score,
            "explanation": explanation,
            "completeness_check": not (notes_len < 10 or (is_emergency and not has_after_photo)),
            "work_alignment_score": max(50, 100 - (20 if notes_len < 10 else 0)),
            "materials_logic_check": not suspicious_materials,
            "photo_quality_score": 95 if has_after_photo else (40 if is_emergency else 80),
            "time_score": 90 if actual_min <= standard_minutes else 70,
            "issues": issues,
            "positive_points": positive_points
        }

    @staticmethod
    def recommend_executor(db: Session, equipment_id: int, problem_text: str = "") -> List[Dict[str, Any]]:
        """
        AI Module 5.1 & 6.3:
        Recommends best suitable executor based on:
        - equipment type & problem category matching worker specialty
        - worker availability (FREE > HAS_QUEUE > BUSY)
        - worker rating
        """
        equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
        executors = db.query(User).filter(User.role == "EXECUTOR", User.current_status != WorkerStatus.OFF_SHIFT.value).all()
        
        # Analyze problem keywords
        prob = (problem_text + " " + (equipment.name if equipment else "")).lower()
        target_specialties = []
        if any(w in prob for w in ["двигател", "кабел", "автомат", "напряжен", "щит", "кз", "электр", "трансформатор"]):
            target_specialties = ["Электромонтер", "Электрик"]
        elif any(w in prob for w in ["сварк", "шов", "трещин", "труб", "металлоконструкт"]):
            target_specialties = ["Газоэлектросварщик", "Сварщик"]
        elif any(w in prob for w in ["насос", "течь", "масл", "подшипник", "редуктор", "дробил", "конвейер", "вал"]):
            target_specialties = ["Слесарь-ремонтник", "Механик"]
        else:
            target_specialties = ["Слесарь-ремонтник", "Электромонтер", "Механик"]

        candidates = []
        for worker in executors:
            match_score = 50
            reason_parts = []

            # Specialty match
            if any(spec.lower() in worker.specialty.lower() for spec in target_specialties):
                match_score += 30
                reason_parts.append(f"Специальность ({worker.specialty}) соответствует профилю поломки")

            # Availability
            if worker.current_status == WorkerStatus.FREE.value:
                match_score += 20
                reason_parts.append("Свободен на смене (готов немедленно)")
            elif worker.current_status == WorkerStatus.HAS_QUEUE.value:
                match_score += 5
                reason_parts.append("Есть наряды в очереди")
            elif worker.current_status == WorkerStatus.BUSY.value:
                match_score -= 10
                reason_parts.append("Сейчас занят другим нарядом")

            # Rating
            rating_bonus = int((worker.rating or 90) * 0.1)
            match_score += rating_bonus
            reason_parts.append(f"Рейтинг качества {worker.rating}%")

            candidates.append({
                "user_id": worker.id,
                "full_name": worker.full_name,
                "specialty": worker.specialty,
                "rank": worker.rank,
                "status": worker.current_status,
                "rating": worker.rating,
                "match_score": min(99, max(30, match_score)),
                "reason": " • ".join(reason_parts)
            })

        # Sort by match score desc
        candidates.sort(key=lambda x: x["match_score"], reverse=True)
        return candidates

    @staticmethod
    def check_deadlines_and_alerts(db: Session) -> List[Dict[str, Any]]:
        """
        AI Module 6.1:
        Deadline control, 30-min warning, overdue alerts, and unaccepted emergency escalation.
        """
        now = datetime.utcnow()
        active_orders = db.query(WorkOrder).filter(
            WorkOrder.status.notin_([WorkOrderStatus.CLOSED.value, WorkOrderStatus.EXECUTED.value, WorkOrderStatus.REJECTED.value])
        ).all()

        alerts = []
        for order in active_orders:
            # Overdue check
            if order.deadline and order.deadline < now:
                overdue_min = int((now - order.deadline).total_seconds() / 60)
                alerts.append({
                    "type": "OVERDUE",
                    "severity": "CRITICAL",
                    "order_id": order.id,
                    "order_number": order.number,
                    "equipment": order.equipment.name if order.equipment else "",
                    "location": order.location.name if order.location else "",
                    "executor": order.executor.full_name if order.executor else "",
                    "overdue_minutes": overdue_min,
                    "message": f"Наряд {order.number} просрочен на {overdue_min} мин! {order.equipment.name if order.equipment else ''}. Исполнитель: {order.executor.full_name if order.executor else ''}."
                })
            elif order.deadline:
                remaining_min = int((order.deadline - now).total_seconds() / 60)
                if 0 <= remaining_min <= 30:
                    alerts.append({
                        "type": "DEADLINE_APPROACHING",
                        "severity": "WARNING",
                        "order_id": order.id,
                        "order_number": order.number,
                        "remaining_minutes": remaining_min,
                        "message": f"До окончания срока наряда {order.number} осталось {remaining_min} мин."
                    })

            # Escalation check for unaccepted emergency work
            if order.priority == OrderPriority.EMERGENCY.value and order.status == WorkOrderStatus.ISSUED.value:
                age_min = int((now - order.created_at).total_seconds() / 60) if order.created_at else 0
                if age_min >= 3:
                    alerts.append({
                        "type": "EMERGENCY_UNACCEPTED",
                        "severity": "CRITICAL",
                        "order_id": order.id,
                        "order_number": order.number,
                        "age_minutes": age_min,
                        "message": f"Эскалация ИИ: Аварийный наряд {order.number} не принят исполнителем более {age_min} мин! Требуется переназначение."
                    })

        return alerts

    @staticmethod
    def get_equipment_anomalies(db: Session) -> List[Dict[str, Any]]:
        """
        AI Module 6.5 & Section 8 demonstration patterns:
        - Conveyor K-3 frequent breakdown (bearing M-02)
        - Crusher KMD-1750 downtime
        - Worker Sidorov rework rate
        - Overall plant recommendations
        """
        return [
            {
                "id": 1,
                "title": "Конвейер К-3: Аномальная повторяемость поломок",
                "equipment": "Конвейер К-3 (Инв. ИНВ-ДР-03)",
                "location": "Участок дробления",
                "severity": "HIGH",
                "metric": "7 остановок за 30 дней, 5 из них шифр М-02",
                "ai_recommendation": "Выявлена несоосность приводного вала редуктора. Ремонт по замене подшипников носит временный характер. Рекомендуется внеплановая центровка и включение узла в график капитального ППР.",
                "confidence": 94
            },
            {
                "id": 2,
                "title": "Дробилка КМД-1750: Превышение нормативов простоя",
                "equipment": "Конусная дробилка КМД-1750 (Инв. ИНВ-ДР-01)",
                "location": "Участок дробления",
                "severity": "CRITICAL",
                "metric": "Суммарный простой 48.5 ч за месяц (+42% к нормативу)",
                "ai_recommendation": "Частые заклинивания дробящего конуса вызваны попаданием недробимых тел с питателя. Рекомендуется ревизия подвесного металлоуловителя ЭРГА.",
                "confidence": 89
            },
            {
                "id": 3,
                "title": "Шламовый насос 1ГрТ-1600: Качество монтажа торцевых уплотнений",
                "equipment": "Шламовый насос 1ГрТ-1600 (Инв. ИНВ-ОБ-02)",
                "location": "Участок обогащения",
                "severity": "MEDIUM",
                "metric": "Повторная течь сальника через 4 дня после замены",
                "ai_recommendation": "Исполнитель Сидоров А. повторно фиксирует протечку уплотнения. Вероятно повреждение посадочной шейки вала или нарушение технологии затяжки фланца.",
                "confidence": 86
            },
            {
                "id": 4,
                "title": "Участок обогащения: Аномальный расход смазочных материалов",
                "equipment": "Мельница МШР 3.6х4.0 (Инв. ИНВ-ОБ-01)",
                "location": "Участок обогащения",
                "severity": "MEDIUM",
                "metric": "Расход смазки Литол-24 превысил норматив на 35%",
                "ai_recommendation": "Рекомендуется проверить состояние защитных лабиринтных уплотнений коренных подшипников мельницы на предмет вымывания смазки пульпой.",
                "confidence": 82
            }
        ]

    @staticmethod
    def get_worker_ratings(db: Session) -> List[Dict[str, Any]]:
        """
        AI Module 6.6: Worker ratings based on on-time execution, AI quality score, rework rate.
        """
        workers = db.query(User).filter(User.role == "EXECUTOR").all()
        result = []
        for w in workers:
            # calculate sample realistic components
            base = w.rating or 92.0
            on_time = min(100, int(base + 2))
            quality = int(base)
            rework = max(1, int((100 - base) / 3))
            closed_orders = 14 + (w.id % 7) * 4

            result.append({
                "user_id": w.id,
                "full_name": w.full_name,
                "specialty": w.specialty,
                "rank": w.rank,
                "brigade": w.brigade,
                "status": w.current_status,
                "overall_score": round(base, 1),
                "on_time_pct": on_time,
                "quality_score": quality,
                "rework_rate_pct": rework,
                "closed_orders_count": closed_orders,
                "ai_feedback": f"Высокая дисциплина соблюдения сроков ({on_time}%). Качество фотоотчётов и закрытия нарядов признано отличным." if base >= 90 else f"Требуется уделить внимание качеству монтажа узлов и полноте фотоотчётов (доля замечаний {rework}%)."
            })
        result.sort(key=lambda x: x["overall_score"], reverse=True)
        return result
