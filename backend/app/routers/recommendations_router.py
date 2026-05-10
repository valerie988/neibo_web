from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, ViewEvent
from app.schemas.schemas import ProductOut
from app.services.recommendations import engine

recommendations_router = APIRouter(prefix="/recommendations", tags=["recommendations"])


class RecommendedProduct(BaseModel):
    product: ProductOut
    score:   float
    reason:  str
    model_config = {"from_attributes": True}


class TrackViewRequest(BaseModel):
    product_id:    str
    dwell_seconds: Optional[int] = 0


@recommendations_router.post("/view", status_code=204)
def track_view(body: TrackViewRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(ViewEvent).filter(ViewEvent.user_id == current_user.id, ViewEvent.product_id == body.product_id).first()
    if existing:
        existing.dwell_seconds += (body.dwell_seconds or 0)
        existing.viewed_at      = datetime.utcnow()
    else:
        db.add(ViewEvent(user_id=current_user.id, product_id=body.product_id, dwell_seconds=body.dwell_seconds or 0))
    db.commit()


@recommendations_router.get("/me", response_model=List[RecommendedProduct])
def get_recommendations(
    context_product_id: Optional[str] = Query(None),
    limit: int = Query(12, ge=1, le=30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return engine.recommend(db=db, user_id=current_user.id, context_product_id=context_product_id, limit=limit)
