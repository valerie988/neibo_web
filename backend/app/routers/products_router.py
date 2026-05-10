import os, shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.core.security import get_current_user, require_farmer
from app.core.config import settings
from app.models.models import User, Product
from app.schemas.schemas import ProductOut, ProductUpdate

products_router = APIRouter(prefix="/products", tags=["products"])
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}


@products_router.post("", response_model=ProductOut, status_code=201)
async def create_product(
    name: str = Form(...), category: str = Form(...), price: float = Form(...),
    unit: str = Form(...), quantity: float = Form(...), location: str = Form(...),
    description: Optional[str] = Form(None),
    photos: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db), current_user: User = Depends(require_farmer),
):
    photo_urls = []
    upload_dir = os.path.join(settings.UPLOAD_DIR, "products")
    os.makedirs(upload_dir, exist_ok=True)
    for photo in photos[:4]:
        if photo.content_type not in ALLOWED_TYPES:
            raise HTTPException(400, f"Invalid file type: {photo.content_type}")
        import uuid
        ext = (photo.filename or "file").split(".")[-1]
        filename = f"{uuid.uuid4()}.{ext}"
        path = os.path.join(upload_dir, filename)
        with open(path, "wb") as f:
            shutil.copyfileobj(photo.file, f)
        photo_urls.append(f"{settings.APP_URL}/uploads/products/{filename}")

    product = Product(
        farmer_id=current_user.id, name=name, category=category, price=price,
        unit=unit, quantity=quantity, description=description, location=location, photos=photo_urls,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@products_router.get("", response_model=List[ProductOut])
def list_products(
    category: Optional[str] = Query(None), location: Optional[str] = Query(None),
    search: Optional[str] = Query(None), skip: int = 0, limit: int = 20,
    db: Session = Depends(get_db),
):
    q = db.query(Product).filter(Product.is_active == True, Product.in_stock == True)
    if category:
        q = q.filter(Product.category == category)
    if location:
        q = q.filter(Product.location.ilike(f"%{location}%"))
    if search:
        q = q.filter(Product.name.ilike(f"%{search}%") | Product.description.ilike(f"%{search}%"))
    return q.order_by(Product.created_at.desc()).offset(skip).limit(limit).all()


@products_router.get("/my", response_model=List[ProductOut])
def my_products(db: Session = Depends(get_db), current_user: User = Depends(require_farmer)):
    return db.query(Product).filter(Product.farmer_id == current_user.id).order_by(Product.created_at.desc()).all()


@products_router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: str, db: Session = Depends(get_db)):
    product = db.query(Product).options(joinedload(Product.farmer)).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    return product


@products_router.patch("/{product_id}", response_model=ProductOut)
def update_product(product_id: str, body: ProductUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_farmer)):
    product = db.query(Product).filter(Product.id == product_id, Product.farmer_id == current_user.id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


@products_router.delete("/{product_id}", status_code=204)
def delete_product(product_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_farmer)):
    product = db.query(Product).filter(Product.id == product_id, Product.farmer_id == current_user.id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    product.is_active = False
    db.commit()
