"""Scan controller for scanning files."""

import logging
from pathlib import Path
from typing import Any, List, Dict  # Added Dict
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from src.services.scan_service import scan_for_functions, update_function_docstring
import os

router = APIRouter()
logger = logging.getLogger(__name__)


def _should_ignore_file(repo_path: Path, file_path: str) -> bool:
    """Check if a file should be ignored based on .levelerignore patterns."""
    levelerignore_path = repo_path / ".levelerignore"
    if not levelerignore_path.exists() or not levelerignore_path.is_file():
        return False

    try:
        ignore_patterns = [
            line.strip()
            for line in levelerignore_path.read_text().splitlines()
            if line.strip() and not line.strip().startswith("#")
        ]

        for pattern in ignore_patterns:
            if pattern.startswith("/"):
                # Absolute pattern from repo root
                if file_path == pattern[1:] or file_path.startswith(pattern[1:] + "/"):
                    return True
            elif pattern.endswith("/"):
                # Directory pattern - check if file is in ignored directory
                if file_path.startswith(pattern[:-1] + "/"):
                    return True
            else:
                # Exact file match
                if file_path == pattern:
                    return True
    except Exception:
        # If we can't read the ignore file, don't ignore anything
        pass

    return False


class InputSchema(BaseModel):
    """Input schema model."""

    type: str
    required: bool = True
    default: Any = None


class FunctionInfo(BaseModel):
    """Function information model."""

    className: str | None
    function_name: str
    input_schema: Dict[str, InputSchema]  # Updated to match scan_service
    output_schema: List[str]
    docs: str | None


class FullScanFunctionInfo(FunctionInfo):
    """Function information model for full repository scan."""

    file_path: str


class ScanResponse(BaseModel):
    """Scan response model."""

    path: str
    functions: List[FunctionInfo]


class FullScanResponse(BaseModel):
    """Full scan response model."""

    functions: List[FullScanFunctionInfo]


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
    logger.info(
        f"Received request to scan functions for repo: {username}/{repo_slug}, path: {path}"
    )
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


@router.get("/repos/{username}/{repo_slug}/scan/full", response_model=FullScanResponse)
async def get_full_scan(
    username: str,
    repo_slug: str,
):
    """Scan entire repository for all functions."""
    logger.info(f"Received request to scan entire repository: {username}/{repo_slug}")
    try:
        repo_path = Path(f"../repo/{username}/{repo_slug}")

        if not repo_path.exists():
            logger.error(f"Repository not found: {repo_path}")
            raise HTTPException(status_code=404, detail="Repository not found")

        all_functions = []

        # Walk through all .py files in the repository
        for root, dirs, files in os.walk(repo_path):
            # Skip hidden directories and ignored directories
            current_relative_root = (
                str(Path(root).relative_to(repo_path)) if root != str(repo_path) else ""
            )
            dirs[:] = [
                d
                for d in dirs
                if not d.startswith(".")
                and not _should_ignore_file(
                    repo_path,
                    f"{current_relative_root}/{d}" if current_relative_root else d,
                )
            ]

            for file in files:
                if file.endswith(".py"):
                    file_path = Path(root) / file
                    relative_path = str(file_path.relative_to(repo_path))

                    # Check if file should be ignored based on .levelerignore
                    if _should_ignore_file(repo_path, relative_path):
                        logger.debug(f"Skipping ignored file: {relative_path}")
                        continue

                    try:
                        functions = scan_for_functions(str(file_path))
                        # Add file path to each function for reference
                        for func in functions:
                            func_with_file = FullScanFunctionInfo(
                                file_path=relative_path,
                                className=func["className"],
                                function_name=func["function_name"],
                                input_schema={
                                    param_name: InputSchema(
                                        type=param["type"],
                                        required=param["required"],
                                        default=param["default"]
                                        if "default" in param
                                        else None,
                                    )
                                    for param_name, param in func[
                                        "input_schema"
                                    ].items()
                                },
                                output_schema=func["output_schema"],
                                docs=func["docs"],
                            )
                            all_functions.append(func_with_file)
                        logger.info(
                            f"Scanned {len(functions)} functions from {relative_path}"
                        )
                    except Exception as e:
                        logger.warning(f"Failed to scan {relative_path}: {e}")
                        continue

        logger.info(
            f"Successfully scanned entire repository. Found {len(all_functions)} functions."
        )
        return FullScanResponse(functions=all_functions)

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.exception(f"Error scanning repository {username}/{repo_slug}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error scanning repository: {str(e)}"
        )


@router.put(
    "/repos/{username}/{repo_slug}/scan/functions/docstring",
    response_model=UpdateDocstringResponse,
)
async def update_docstring(
    username: str,
    repo_slug: str,
    request: UpdateDocstringRequest,
):
    """
    Update the docstring of a specific function in a file.
    """
    logger.info(
        f"Received request to update docstring for function {request.function_name} in {request.file_path}"
    )
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
            logger.info(
                f"Docstring for {request.function_name} in {request.file_path} updated successfully."
            )
            return UpdateDocstringResponse(
                message="Docstring updated successfully", status="success"
            )
        else:
            logger.warning(
                f"Function {request.function_name} not found or docstring not updated in {request.file_path}."
            )
            raise HTTPException(
                status_code=404, detail="Function not found or docstring not updated"
            )

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.exception(
            f"Error updating docstring for {request.function_name} in {request.file_path}: {e}"
        )
        raise HTTPException(
            status_code=500, detail=f"Error updating docstring: {str(e)}"
        )
