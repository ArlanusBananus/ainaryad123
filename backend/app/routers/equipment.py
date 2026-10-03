from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Location, Equipment
from ..schemas import LocationResponse, EquipmentResponse

router = APIRouter(prefix="/api", tags=["equipment-and-locations"])

@router.get("/locations", response_model=List[LocationResponse])
def get_locations(db: Session = Depends(get_db)):
    locations = db.query(Location).all()
    return locations

@router.get("/equipment", response_model=List[EquipmentResponse])
def get_equipment(location_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Equipment)
    if location_id:
        query = query.filter(Equipment.location_id == location_id)
    items = query.all()
    
    return [
        {
            "id": eq.id,
            "name": eq.name,
            "inventory_number": eq.inventory_number,
            "location_id": eq.location_id,
            "location_name": eq.location.name if eq.location else "",
            "equipment_type": eq.equipment_type,
            "criticality": eq.criticality,
            "status": eq.status
        }
        for eq in items
    ]
