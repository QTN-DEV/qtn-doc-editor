"""Scan controller for scanning files."""

import logging
from pathlib import Path
from typing import List, Dict # Added Dict
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from src.services.scan_service import scan_for_functions, update_function_docstring

router = APIRouter()
logger = logging.getLogger(__name__)

class FunctionInfo(BaseModel):
    """Function information model."""

    className: str | None
    function_name: str
    input_schema: Dict[str, str] # Updated to match scan_service
    output_schema: str # Updated to match scan_service
    docs: str | None

class ScanResponse(BaseModel):
    """Scan response model."""

    path: str
    functions: List[FunctionInfo]

class UpdateDocstringRequest(BaseModel):
    """Update docstring request model."""

    file_path: str
    function_name: str
    new_docstring: str

class UpdateDocstringResponse(BaseModel):
    """Update docstring response model."""

    message: str
    status: str

@router.get("/repos/{username}/{repo_slug}/scan/functions", response_model=ScanResponse)
async def get_functions(
    username: str,
    repo_slug: str,
    path: str = Query(description="File path relative to repository root"),
):
    """Scan a file for functions."""
    logger.info(f"Received request to scan functions for repo: {username}/{repo_slug}, path: {path}")
    try:
        if not path:
            logger.warning("File path is required for get_functions.")
            raise HTTPException(status_code=400, detail="File path is required")

        repo_path = Path(f"../repo/{username}/{repo_slug}")
        file_path = repo_path / path

        if not repo_path.exists():
            logger.error(f"Repository not found: {repo_path}")
            raise HTTPException(status_code=404, detail="Repository not found")

        if not file_path.exists():
            logger.error(f"File not found: {file_path}")
            raise HTTPException(status_code=404, detail="File not found")

        if not file_path.is_file():
            logger.error(f"Path is not a file: {file_path}")
            raise HTTPException(status_code=400, detail="Path is not a file")

        functions = scan_for_functions(str(file_path))
        logger.info(f"Successfully scanned {len(functions)} functions from {file_path}")
        return ScanResponse(path=path, functions=functions)

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.exception(f"Error scanning file {path}: {e}")
        raise HTTPException(status_code=500, detail=f"Error scanning file: {str(e)}")

@router.put("/repos/{username}/{repo_slug}/scan/functions/docstring", response_model=UpdateDocstringResponse)
async def update_docstring(
    username: str,
    repo_slug: str,
    request: UpdateDocstringRequest,
):
    """
    Update the docstring of a specific function in a file.
    """
    logger.info(f"Received request to update docstring for function {request.function_name} in {request.file_path}")
    try:
        repo_path = Path(f"../repo/{username}/{repo_slug}")
        full_file_path = repo_path / request.file_path

        if not repo_path.exists():
            logger.error(f"Repository not found: {repo_path}")
            raise HTTPException(status_code=404, detail="Repository not found")

        if not full_file_path.exists():
            logger.error(f"File not found: {full_file_path}")
            raise HTTPException(status_code=404, detail="File not found")

        if not full_file_path.is_file():
            logger.error(f"Path is not a file: {full_file_path}")
            raise HTTPException(status_code=400, detail="Path is not a file")

        updated = update_function_docstring(
            str(full_file_path),
            request.function_name,
            request.new_docstring,
        )

        if updated:
            logger.info(f"Docstring for {request.function_name} in {request.file_path} updated successfully.")
            return UpdateDocstringResponse(message="Docstring updated successfully", status="success")
        else:
            logger.warning(f"Function {request.function_name} not found or docstring not updated in {request.file_path}.")
            raise HTTPException(status_code=404, detail="Function not found or docstring not updated")

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.exception(f"Error updating docstring for {request.function_name} in {request.file_path}: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating docstring: {str(e)}")