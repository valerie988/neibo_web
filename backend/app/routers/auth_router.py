from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.core.config import settings
from app.models.models import User
from app.schemas.schemas import SignupRequest, LoginRequest, TokenResponse, RefreshRequest

auth_router = APIRouter(prefix="/auth", tags=["auth"])


@auth_router.post("/signup", response_model=TokenResponse, status_code=201)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(400, "Email already registered")
    user = User(
        full_name       = body.full_name,
        email           = body.email,
        hashed_password = hash_password(body.password),
        phone           = body.phone,
        role            = body.role,
        location        = body.location,
    )
    db.add(user)
    db.commit()
    return TokenResponse(
        access_token  = create_access_token(user.id, user.role),
        refresh_token = create_refresh_token(user.id),
        role          = user.role,
        user_id       = user.id,
    )


@auth_router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email, User.role == body.role).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    return TokenResponse(
        access_token  = create_access_token(user.id, user.role),
        refresh_token = create_refresh_token(user.id),
        role          = user.role,
        user_id       = user.id,
    )


@auth_router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(body.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(401, "Invalid refresh token")
        user = db.query(User).filter(User.id == payload["sub"]).first()
        if not user:
            raise HTTPException(401, "User not found")
    except JWTError:
        raise HTTPException(401, "Invalid refresh token")
    return TokenResponse(
        access_token  = create_access_token(user.id, user.role),
        refresh_token = create_refresh_token(user.id),
        role          = user.role,
        user_id       = user.id,
    )
