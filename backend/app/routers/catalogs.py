from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import MalfunctionCode, Material
from ..schemas import MalfunctionCodeResponse, MaterialResponse

router = APIRouter(prefix="/api/catalogs", tags=["catalogs"])

@router.get("/malfunctions", response_model=List[MalfunctionCodeResponse])
def get_malfunction_codes(db: Session = Depends(get_db)):
    return db.query(MalfunctionCode).order_by(MalfunctionCode.code.asc()).all()

@router.get("/materials", response_model=List[MaterialResponse])
def get_materials(db: Session = Depends(get_db)):
    return db.query(Material).order_by(Material.category.asc(), Material.name.asc()).all()
