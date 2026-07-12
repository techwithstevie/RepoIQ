from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "gpt-oss:120b-cloud"
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"
    CHROMA_PERSIST_DIR: str = "./chroma_db"
    REPOS_DIR: str = "./repos"
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]

    class Config:
        env_file = ".env"

settings = Settings()
os.makedidrs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
os.makedirs(settings.REPOS_DIR, exist_ok=True)