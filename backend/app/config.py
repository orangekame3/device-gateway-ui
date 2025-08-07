from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    app_name: str = "Device Gateway UI"
    debug: bool = False
    
    # API URLs
    qdash_api_url: str = "http://localhost:6004/api"
    device_gateway_host: str = "localhost"
    device_gateway_port: int = 50051
    
    # Paths
    device_gateway_path: str = "../../device-gateway"
    config_path: str = "../../device-gateway/config"
    scripts_path: str = "../../device-gateway/scripts"
    
    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/device_gateway_ui"
    
    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379
    
    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]
    
    class Config:
        env_file = ".env"


settings = Settings()