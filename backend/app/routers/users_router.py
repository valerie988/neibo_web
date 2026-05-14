# app/routers/users_router.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User
from app.schemas.schemas import UserOut, UserUpdate

users_router = APIRouter(prefix="/users", tags=["users"])

@users_router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@users_router.patch("/me", response_model=UserOut)
def update_me(
    body:         UserUpdate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user

@users_router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    return user


# ── Search users by name (for new chat modal) ─────────────────────────────────
@users_router.get("/search", response_model=List[UserOut])
def search_users(
    q:    str           = Query(..., min_length=1),
    role: Optional[str] = Query(None),
    db:   Session       = Depends(get_db),
    current_user: User  = Depends(get_current_user),
):
    """
    GET /api/users/search?q=name&role=farmer
    Find users by name to start a new conversation.
    Excludes the current user from results.
    """
    query = db.query(User).filter(
        User.id       != current_user.id,
        User.full_name.ilike(f"%{q}%"),
    )
    if role:
        query = query.filter(User.role == role)
    return query.limit(10).all()