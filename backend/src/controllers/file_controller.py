"""File operations controller for repository browsing.

Handle directory listing and file content retrieval operations.
"""

from pathlib import Path
from typing import List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter()


class FileItem(BaseModel):
    """File or directory item model."""

    name: str
    path: str
    type: str  # "file" or "directory"
    size: int | None = None
    extension: str | None = None


class DirectoryResponse(BaseModel):
    """Directory listing response model."""

    path: str
    items: List[FileItem]


class FileContentResponse(BaseModel):
    """File content response model."""

    path: str
    content: str
    encoding: str


class SaveFileRequest(BaseModel):
    """Save file request model."""

    content: str
    encoding: str = "utf-8"


class SaveFileResponse(BaseModel):
    """Save file response model."""

    path: str
    message: str
    encoding: str


@router.get("/repos/{username}/{repo_slug}/files", response_model=DirectoryResponse)
async def list_directory(
    username: str,
    repo_slug: str,
    path: str = Query(
        default="", description="Directory path relative to repository root"
    ),
):
    """List directory contents for a repository."""
    try:
        # Construct the full repository path
        repo_path = Path(f"../repo/{username}/{repo_slug}")
        if not repo_path.exists():
            raise HTTPException(status_code=404, detail="Repository not found")

        # Construct the target directory path
        target_path = repo_path / path if path else repo_path

        if not target_path.exists():
            raise HTTPException(status_code=404, detail="Directory not found")

        if not target_path.is_dir():
            raise HTTPException(status_code=400, detail="Path is not a directory")

        # Read .levelerignore file if it exists
        ignore_patterns = []
        levelerignore_path = repo_path / ".levelerignore"
        if levelerignore_path.exists() and levelerignore_path.is_file():
            try:
                ignore_patterns = [
                    line.strip()
                    for line in levelerignore_path.read_text().splitlines()
                    if line.strip() and not line.strip().startswith("#")
                ]
            except Exception:
                # If we can't read the ignore file, continue without it
                pass

        items = []
        for item in target_path.iterdir():
            # Check if item should be ignored
            item_relative_path = str(item.relative_to(repo_path))
            should_ignore = False

            for pattern in ignore_patterns:
                if pattern.startswith("/"):
                    # Absolute pattern from repo root
                    if item_relative_path == pattern[
                        1:
                    ] or item_relative_path.startswith(pattern[1:] + "/"):
                        should_ignore = True
                        break
                elif pattern.endswith("/"):
                    # Directory pattern
                    if item.is_dir() and (
                        item.name == pattern[:-1]
                        or item_relative_path.startswith(pattern[:-1] + "/")
                    ):
                        should_ignore = True
                        break
                else:
                    # Exact file/directory match
                    if item.name == pattern or item_relative_path == pattern:
                        should_ignore = True
                        break

            if should_ignore:
                continue

            file_info = {
                "name": item.name,
                "path": item_relative_path,
                "type": "directory" if item.is_dir() else "file",
                "size": item.stat().st_size if item.is_file() else None,
                "extension": item.suffix if item.is_file() else None,
            }
            items.append(FileItem(**file_info))

        # Sort: directories first, then files, both alphabetically
        items.sort(key=lambda x: (x.type == "file", x.name.lower()))

        return DirectoryResponse(
            path=str(target_path.relative_to(repo_path)), items=items
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error listing directory: {str(e)}"
        )


@router.get(
    "/repos/{username}/{repo_slug}/files/content", response_model=FileContentResponse
)
async def get_file_content(
    username: str,
    repo_slug: str,
    path: str = Query(description="File path relative to repository root"),
):
    """Get file content for a specific file."""
    try:
        if not path:
            raise HTTPException(status_code=400, detail="File path is required")

            # Construct the full file path
        repo_path = Path(f"../repo/{username}/{repo_slug}")
        file_path = repo_path / path

        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")

        if not file_path.is_file():
            raise HTTPException(status_code=400, detail="Path is not a file")

        # Check if file should be ignored
        levelerignore_path = repo_path / ".levelerignore"
        if levelerignore_path.exists() and levelerignore_path.is_file():
            try:
                ignore_patterns = [
                    line.strip()
                    for line in levelerignore_path.read_text().splitlines()
                    if line.strip() and not line.strip().startswith("#")
                ]

                for pattern in ignore_patterns:
                    if pattern.startswith("/"):
                        # Absolute pattern from repo root
                        if path == pattern[1:] or path.startswith(pattern[1:] + "/"):
                            raise HTTPException(
                                status_code=403,
                                detail="File is ignored by .levelerignore",
                            )
                    elif pattern.endswith("/"):
                        # Directory pattern - check if file is in ignored directory
                        if path.startswith(pattern[:-1] + "/"):
                            raise HTTPException(
                                status_code=403, detail="File is in ignored directory"
                            )
                    else:
                        # Exact file match
                        if path == pattern:
                            raise HTTPException(
                                status_code=403,
                                detail="File is ignored by .levelerignore",
                            )
            except Exception:
                # If we can't read the ignore file, continue without it
                pass

        # Allow all file types
        # No file type restriction

        # Read file content
        try:
            content = file_path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            # Try with different encoding if UTF-8 fails
            content = file_path.read_text(encoding="latin-1")
            encoding = "latin-1"
        else:
            encoding = "utf-8"

        return FileContentResponse(path=path, content=content, encoding=encoding)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")


@router.put(
    "/repos/{username}/{repo_slug}/files/content", response_model=SaveFileResponse
)
async def save_file_content(
    username: str,
    repo_slug: str,
    path: str = Query(description="File path relative to repository root"),
    file_data: SaveFileRequest = None,
):
    """Save content to a specific file."""
    try:
        if not path:
            raise HTTPException(status_code=400, detail="File path is required")

        if not file_data:
            raise HTTPException(status_code=400, detail="File content is required")

        # Construct the full file path
        repo_path = Path(f"../repo/{username}/{repo_slug}")
        file_path = repo_path / path

        # Check if repository exists
        if not repo_path.exists():
            raise HTTPException(status_code=404, detail="Repository not found")

        # Check if file should be ignored
        levelerignore_path = repo_path / ".levelerignore"
        if levelerignore_path.exists() and levelerignore_path.is_file():
            try:
                ignore_patterns = [
                    line.strip()
                    for line in levelerignore_path.read_text().splitlines()
                    if line.strip() and not line.strip().startswith("#")
                ]

                for pattern in ignore_patterns:
                    if pattern.startswith("/"):
                        # Absolute pattern from repo root
                        if path == pattern[1:] or path.startswith(pattern[1:] + "/"):
                            raise HTTPException(
                                status_code=403,
                                detail="File is ignored by .levelerignore",
                            )
                    elif pattern.endswith("/"):
                        # Directory pattern - check if file is in ignored directory
                        if path.startswith(pattern[:-1] + "/"):
                            raise HTTPException(
                                status_code=403, detail="File is in ignored directory"
                            )
                    else:
                        # Exact file match
                        if path == pattern:
                            raise HTTPException(
                                status_code=403,
                                detail="File is ignored by .levelerignore",
                            )
            except Exception:
                # If we can't read the ignore file, continue without it
                pass

        # Ensure the parent directory exists
        file_path.parent.mkdir(parents=True, exist_ok=True)

        # Write file content
        try:
            file_path.write_text(file_data.content, encoding=file_data.encoding)
        except Exception as write_error:
            raise HTTPException(
                status_code=500, detail=f"Error writing file: {str(write_error)}"
            )

        return SaveFileResponse(
            path=path,
            message="File saved successfully",
            encoding=file_data.encoding,
        )

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
