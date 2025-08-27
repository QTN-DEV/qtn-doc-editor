import os
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()


class Config(BaseModel):
    github_client_id: str = Field(..., description="GitHub OAuth Client ID")
    github_client_secret: str = Field(..., description="GitHub OAuth Client Secret")
    session_secret: str = Field(..., description="Session secret key")
    frontend_url: str = Field(..., description="Frontend URL")


config = Config(
    github_client_id=os.getenv("GITHUB_CLIENT_ID"),
    github_client_secret=os.getenv("GITHUB_CLIENT_SECRET"),
    session_secret=os.getenv("SESSION_SECRET"),
    frontend_url=os.getenv("FRONTEND_URL"),
)
