from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Order, OrderItem, Product
from app.schemas.schemas import OrderCreate, OrderOut, OrderStatusUpdate

orders_router = APIRouter(prefix="/orders", tags=["orders"])


@orders_router.post("", response_model=OrderOut, status_code=201)
def create_order(body: OrderCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "customer":
        raise HTTPException(403, "Only customers can place orders")
    total, farmer_id, items = 0.0, None, []
    for line in body.items:
        product = db.query(Product).filter(Product.id == line.product_id, Product.is_active == True).first()
        if not product:
            raise HTTPException(404, f"Product {line.product_id} not found")
        if not product.in_stock or product.quantity < line.quantity:
            raise HTTPException(400, f"Insufficient stock for {product.name}")
        farmer_id = product.farmer_id
        total += product.price * line.quantity
        items.append(OrderItem(product_id=product.id, quantity=line.quantity, unit_price=product.price))
        product.quantity -= line.quantity
        if product.quantity <= 0:
            product.in_stock = False

    order = Order(customer_id=current_user.id, farmer_id=farmer_id, total_amount=total,
                  delivery_address=body.delivery_address, notes=body.notes)
    db.add(order)
    db.flush()
    for item in items:
        item.order_id = order.id
        db.add(item)
    db.commit()
    return db.query(Order).options(joinedload(Order.items).joinedload(OrderItem.product)).filter(Order.id == order.id).first()


@orders_router.get("", response_model=List[OrderOut])
def list_orders(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Order).options(joinedload(Order.items).joinedload(OrderItem.product))
    if current_user.role == "farmer":
        q = q.filter(Order.farmer_id == current_user.id)
    else:
        q = q.filter(Order.customer_id == current_user.id)
    return q.order_by(Order.created_at.desc()).all()


@orders_router.patch("/{order_id}/status", response_model=OrderOut)
def update_status(order_id: str, body: OrderStatusUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    if order.farmer_id != current_user.id:
        raise HTTPException(403, "Not your order")
    order.status = body.status
    db.commit()
    db.refresh(order)
    return order
