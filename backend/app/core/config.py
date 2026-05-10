from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL:                  str = "mysql+pymysql://agri:agripass@db:3306/agrimarket"
    SECRET_KEY:                    str = "change_me_in_production"
    ALGORITHM:                     str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES:   int = 60
    REFRESH_TOKEN_EXPIRE_DAYS:     int = 30
    APP_URL:                       str = "http://localhost:8000"
    UPLOAD_DIR:                    str = "/app/uploads"
    FRONTEND_URL:                  str = "http://localhost:5173"

    class Config:
        env_file = ".env"

settings = Settings()
