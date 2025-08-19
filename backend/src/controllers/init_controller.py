"""Init controller for repository initialization."""

import os
import subprocess
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from constants import REPO_DIR
import logging

router = APIRouter()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class InitRequest(BaseModel):
    """Request model for repository initialization."""
    pat: str
    github_repo: str


@router.post("/init")
async def init_repository(request: InitRequest):
    """Initialize a repository by cloning it from GitHub."""
    logger.info(f"Request: {request}")
    try:
        # Parse username and repo-slug from github_repo
        if "/" not in request.github_repo:
            raise HTTPException(status_code=400, detail="Invalid repository format. Use username/repo-slug")
        
        username, repo_slug = request.github_repo.split("/", 1)
        logger.info(f"Username: {username}")
        logger.info(f"Repo slug: {repo_slug}")

        # Create the base repo directory
        repo_base_path = os.path.join(REPO_DIR, username)
        logger.info(f"Repo base path: {repo_base_path}")
        
        # Check if repository already exists
        repo_path = os.path.join(repo_base_path, repo_slug)
        logger.info(f"Repo path: {repo_path}")
        if os.path.exists(repo_path):
            return {"message": "Repository already exists", "status": "success"}
        
        # Clone the repository
        clone_url = f"https://{request.pat}@github.com/{request.github_repo}.git"
        logger.info(f"Clone URL: {clone_url}")

        # Clone the repository
        result = subprocess.run(
            ["git", "clone", clone_url, repo_path],
            capture_output=True,
            text=True,
        )
        logger.info(f"Result: {result}")

        if result.returncode != 0:
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to clone repository: {result.stderr}"
            )
        
        return {
            "message": "Repository cloned successfully",
            "status": "success",
            "path": repo_path
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
