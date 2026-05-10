import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.database import engine, Base
from app.core.config import settings
from app.models import models  # noqa — ensures all tables are registered

from app.routers.auth_router            import auth_router
from app.routers.users_router           import users_router
from app.routers.products_router        import products_router
from app.routers.orders_router          import orders_router
from app.routers.chat_router            import chat_router
from app.routers.recommendations_router import recommendations_router

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AgriMarket API", version="1.0.0", docs_url="/api/docs", redoc_url="/api/redoc")

app.add_middleware(
    CORSMiddleware,
    allow_origins="*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(auth_router,            prefix="/api")
app.include_router(users_router,           prefix="/api")
app.include_router(products_router,        prefix="/api")
app.include_router(orders_router,          prefix="/api")
app.include_router(chat_router,            prefix="/api")
app.include_router(recommendations_router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
