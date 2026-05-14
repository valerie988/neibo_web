# app/schemas/schemas.py
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

class Role(str, Enum):
    farmer   = "farmer"
    customer = "customer"

class OrderStatus(str, Enum):
    processing = "processing"
    confirmed  = "confirmed"
    in_transit = "in_transit"
    delivered  = "delivered"
    cancelled  = "cancelled"

# ── Auth ──────────────────────────────────────────────────────────────────────
class SignupRequest(BaseModel):
    full_name: str
    email:     str
    password:  str = Field(..., min_length=8)
    phone:     Optional[str] = None
    role:      Role
    location:  Optional[str] = None

    @field_validator("location")
    @classmethod
    def location_required_for_farmer(cls, v, info):
        if info.data.get("role") == "farmer" and not v:
            raise ValueError("Location is required for farmers")
        return v

class LoginRequest(BaseModel):
    email:    str
    password: str
    role:     Role

class TokenResponse(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"
    role:          Role
    user_id:       str

class RefreshRequest(BaseModel):
    refresh_token: str

# ── Users ─────────────────────────────────────────────────────────────────────
class UserOut(BaseModel):
    id:          str
    full_name:   str
    email:       str
    phone:       Optional[str]
    role:        Role
    location:    Optional[str]
    avatar_url:  Optional[str]
    is_verified: bool
    created_at:  datetime
    model_config = {"from_attributes": True}

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone:     Optional[str] = None
    location:  Optional[str] = None

# ── Products ──────────────────────────────────────────────────────────────────
class ProductOut(BaseModel):
    id:          str
    farmer_id:   str
    name:        str
    category:    str
    description: Optional[str]
    price:       float
    unit:        str
    quantity:    float
    location:    str
    photos:      List[str]
    in_stock:    bool
    is_active:   bool
    created_at:  datetime
    farmer:      Optional[UserOut] = None
    model_config = {"from_attributes": True}

class ProductUpdate(BaseModel):
    name:        Optional[str]   = None
    category:    Optional[str]   = None
    description: Optional[str]   = None
    price:       Optional[float] = None
    unit:        Optional[str]   = None
    quantity:    Optional[float] = None
    location:    Optional[str]   = None
    in_stock:    Optional[bool]  = None


class ProductCreate(BaseModel):
    name:        str
    category:    str
    description: Optional[str] = None
    price:       float
    unit:        str
    quantity:    float
    location:    str
    photos:      List[str] # This receives the array of Cloudinary URLs
    in_stock:    Optional[bool] = True

    
# ── Orders ────────────────────────────────────────────────────────────────────
class OrderItemIn(BaseModel):
    product_id: str
    quantity:   float

class OrderCreate(BaseModel):
    items:            List[OrderItemIn]
    delivery_address: Optional[str] = None
    notes:            Optional[str] = None

class OrderItemOut(BaseModel):
    product_id: str
    quantity:   float
    unit_price: float
    product:    Optional[ProductOut] = None
    model_config = {"from_attributes": True}

class OrderOut(BaseModel):
    id:               str
    customer_id:      str
    farmer_id:        str
    status:           OrderStatus
    total_amount:     float
    delivery_address: Optional[str]
    notes:            Optional[str]
    created_at:       datetime
    items:            List[OrderItemOut] = []
    customer:         Optional[UserOut]  = None
    model_config = {"from_attributes": True}

class OrderStatusUpdate(BaseModel):
    status: OrderStatus

# ── Chat ──────────────────────────────────────────────────────────────────────
class MessageCreate(BaseModel):
    receiver_id: str
    text:        str

class MessageOut(BaseModel):
    id:              str
    conversation_id: str
    sender_id:       str
    receiver_id:     str
    text:            str
    read:            bool
    created_at:      datetime
    model_config = {"from_attributes": True}

class ConversationOut(BaseModel):
    id:              str
    participant_one: str
    participant_two: str
    updated_at:      datetime
    messages:        List[MessageOut] = []
    other_name:      Optional[str]   = None   # resolved server-side
    last_message:    Optional[str]   = None   # last message text
    unread_count:    int             = 0      # unread count for current user
    model_config = {"from_attributes": True}