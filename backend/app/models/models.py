import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Text, Integer, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class User(Base):
    __tablename__ = "users"
    id              = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    full_name       = Column(String(120), nullable=False)
    email           = Column(String(120), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    phone           = Column(String(20), nullable=True)
    role            = Column(String(20), nullable=False)
    location        = Column(String(200), nullable=True)
    avatar_url      = Column(String(500), nullable=True)
    is_verified     = Column(Boolean, default=False)
    created_at      = Column(DateTime, default=datetime.utcnow)
    products        = relationship("Product", back_populates="farmer", lazy="select")


class Product(Base):
    __tablename__ = "products"
    id          = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    farmer_id   = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    name        = Column(String(200), nullable=False)
    category    = Column(String(80), nullable=False)
    description = Column(String(1000), nullable=True)
    price       = Column(Float, nullable=False)
    unit        = Column(String(30), nullable=False)
    quantity    = Column(Float, nullable=False)
    location    = Column(String(200), nullable=False)
    photos      = Column(JSON, default=list)
    in_stock    = Column(Boolean, default=True)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime, default=datetime.utcnow)
    farmer      = relationship("User", back_populates="products", lazy="joined")


class Order(Base):
    __tablename__ = "orders"
    id               = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_id      = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    farmer_id        = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    status           = Column(String(30), default="processing")
    total_amount     = Column(Float, nullable=False)
    delivery_address = Column(String(300), nullable=True)
    notes            = Column(Text, nullable=True)
    created_at       = Column(DateTime, default=datetime.utcnow)
    items            = relationship("OrderItem", back_populates="order", lazy="select")
    customer         = relationship("User", foreign_keys=[customer_id], lazy="select")


class OrderItem(Base):
    __tablename__ = "order_items"
    id         = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id   = Column(String(36), ForeignKey("orders.id"), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey("products.id"), nullable=False)
    quantity   = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False)
    order      = relationship("Order", back_populates="items", lazy="select")
    product    = relationship("Product", lazy="joined")


class Conversation(Base):
    __tablename__ = "conversations"
    id              = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    participant_one = Column(String(36), ForeignKey("users.id"), nullable=False)
    participant_two = Column(String(36), ForeignKey("users.id"), nullable=False)
    updated_at      = Column(DateTime, default=datetime.utcnow)
    messages        = relationship("Message", back_populates="conversation", lazy="select")


class Message(Base):
    __tablename__ = "messages"
    id              = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(36), ForeignKey("conversations.id"), nullable=False, index=True)
    sender_id       = Column(String(36), ForeignKey("users.id"), nullable=False)
    receiver_id     = Column(String(36), ForeignKey("users.id"), nullable=False)
    text            = Column(Text, nullable=False)
    read            = Column(Boolean, default=False)
    created_at      = Column(DateTime, default=datetime.utcnow)
    conversation    = relationship("Conversation", back_populates="messages", lazy="select")


class ViewEvent(Base):
    __tablename__ = "view_events"
    id            = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id       = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    product_id    = Column(String(36), ForeignKey("products.id"), nullable=False, index=True)
    viewed_at     = Column(DateTime, default=datetime.utcnow, nullable=False)
    dwell_seconds = Column(Integer, default=0)
    user          = relationship("User", lazy="select")
    product       = relationship("Product", lazy="select")
