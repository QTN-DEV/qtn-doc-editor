"""File operations controller for repository browsing.

Handle directory listing and file content retrieval operations.
"""
import subprocess
import time
from pathlib import Path
from typing import List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from fnmatch import fnmatch
from constants import USERNAME, REPO_SLUG

router = APIRouter()
def _commit_and_push_changes(repo_path: Path):
    """Commit and push all changes with a timestamp-based message."""
    try:
        # Get current timestamp for commit message
        timestamp_message = time.strftime("%Y-%m-%d %H:%M:%S")

        # Stage all changes
        subprocess.run(
            ["git", "add", "."],
            cwd=repo_path,
            capture_output=True,
            text=True,
            check=True,
            timeout=30
        )

        # Check if there are any changes to commit
        status_result = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=repo_path,
            capture_output=True,
            text=True,
            check=True,
            timeout=10
        )
        if not status_result.stdout.strip():
            # No changes to commit
            return

        # Commit changes
        subprocess.run(
            ["git", "commit", "-m", timestamp_message],
            cwd=repo_path,
            capture_output=True,
            text=True,
            check=True,
            timeout=30
        )

        # Push changes
        subprocess.run(
            ["git", "push"],
            cwd=repo_path,
            capture_output=True,
            text=True,
            check=True,
            timeout=60
        )

    except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as e:
        # In a real application, you'd want to log this error.
        # For this example, we'll let it fail silently or raise an
        # internal server error if not handled by the calling function.
        # We can add more specific error handling here if needed.
        print(f"Git operation failed: {e}")
        # Optionally re-raise or handle as an HTTP exception
        raise HTTPException(
            status_code=500,
            detail=f"Git operation failed: {e.stderr or e}"
        )




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


class CreateFileRequest(BaseModel):
    """Create file request model."""

    filename: str
    content: str = ""
    encoding: str = "utf-8"


class CreateFileResponse(BaseModel):
    """Create file response model."""

    path: str
    message: str
    encoding: str


class CreateDirectoryRequest(BaseModel):
    """Create directory request model."""

    dirname: str


class CreateDirectoryResponse(BaseModel):
    """Create directory response model."""

    path: str
    message: str


class DeleteFileRequest(BaseModel):
    """Delete file request model."""

    path: str


class DeleteFileResponse(BaseModel):
    """Delete file response model."""

    path: str
    message: str


class RenameFileRequest(BaseModel):
    """Rename file request model."""

    old_path: str
    new_name: str


class RenameFileResponse(BaseModel):
    """Rename file response model."""

    old_path: str
    new_path: str
    message: str


class ChangedFileResponse(BaseModel):
    """Changed files response model."""

    changed_files: List[str]
    total_changed: int
    last_check: str


class FileChangeInfo(BaseModel):
    """File change information model."""

    path: str
    last_modified: str
    size: int
    change_type: str  # "modified", "new", "small"


class CommitRequest(BaseModel):
    """Commit request model."""

    message: str


class CommitResponse(BaseModel):
    """Commit response model."""

    message: str
    commit_hash: str
    files_committed: int


@router.get("/repos/files", response_model=DirectoryResponse)
async def list_directory(
    path: str = Query(
        default="", description="Directory path relative to repository root"
    ),
    filter: str = Query(
        default="", description="Filter for file extensions (e.g., '*.py,*.js')"
    ),
):
    """List directory contents for a repository."""
    try:
        # Construct the full repository path
        repo_path = Path(f"../repo/{USERNAME}/{REPO_SLUG}")
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

        # Parse filter string into list of patterns
        filter_patterns = []
        if filter:
            # Accept comma-separated or semicolon-separated
            filter_patterns = [f.strip() for f in filter.replace(";", ",").split(",") if f.strip()]
        # If filter is empty, show all files

        items = []
        for item in target_path.iterdir():
            # Check if item should be ignored
            item_relative_path = str(item.relative_to(repo_path))
            should_ignore = False

            for pattern in ignore_patterns:
                if pattern.startswith("/"):
                    # Absolute pattern from repo root
                    if item_relative_path == pattern[1:] or item_relative_path.startswith(pattern[1:] + "/"):
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

            # Filtering logic: always include directories, filter files if filter_patterns is set
            if item.is_file() and filter_patterns:
                # Match against name and/or extension
                matched = False
                for pat in filter_patterns:
                    # If pattern contains a slash, match against relative path; else, match against name
                    if "/" in pat:
                        if fnmatch(item_relative_path, pat):
                            matched = True
                            break
                    else:
                        if fnmatch(item.name, pat):
                            matched = True
                            break
                if not matched:
                    continue  # Skip this file

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
    "/repos/files/content", response_model=FileContentResponse
)
async def get_file_content(
    path: str = Query(description="File path relative to repository root"),
):
    """Get file content for a specific file."""
    try:
        if not path:
            raise HTTPException(status_code=400, detail="File path is required")

            # Construct the full file path
        repo_path = Path(f"../repo/{USERNAME}/{REPO_SLUG}")
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
    "/repos/files/content", response_model=SaveFileResponse
)
async def save_file_content(
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
        repo_path = Path(f"../repo/{USERNAME}/{REPO_SLUG}")
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

        _commit_and_push_changes(repo_path)

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


@router.post(
    "/repos/files/create", response_model=CreateFileResponse
)
async def create_file(
    file_data: CreateFileRequest,
):
    """Create a new file in the repository."""
    try:
        if not file_data.filename:
            raise HTTPException(status_code=400, detail="Filename is required")

        # Construct the full file path
        repo_path = Path(f"../repo/{USERNAME}/{REPO_SLUG}")
        file_path = repo_path / file_data.filename

        # Check if repository exists
        if not repo_path.exists():
            raise HTTPException(status_code=404, detail="Repository not found")

        # Check if file already exists
        if file_path.exists():
            raise HTTPException(status_code=409, detail="File already exists")

        # Ensure the parent directory exists
        file_path.parent.mkdir(parents=True, exist_ok=True)

        # Write empty content to the new file
        try:
            file_path.write_text(file_data.content, encoding=file_data.encoding)
        except Exception as write_error:
            raise HTTPException(
                status_code=500, detail=f"Error creating file: {str(write_error)}"
            )

        _commit_and_push_changes(repo_path)

        return CreateFileResponse(
            path=str(file_path.relative_to(repo_path)),
            message="File created successfully",
            encoding=file_data.encoding,
        )

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating file: {str(e)}")


@router.post(
    "/repos/files/create-directory", response_model=CreateDirectoryResponse
)
async def create_directory(
    dir_data: CreateDirectoryRequest,
):
    """Create a new directory in the repository."""
    try:
        if not dir_data.dirname:
            raise HTTPException(status_code=400, detail="Directory name is required")

        # Construct the full directory path
        repo_path = Path(f"../repo/{USERNAME}/{REPO_SLUG}")
        dir_path = repo_path / dir_data.dirname

        # Check if repository exists
        if not repo_path.exists():
            raise HTTPException(status_code=404, detail="Repository not found")

        # Check if directory already exists
        if dir_path.exists():
            raise HTTPException(status_code=409, detail="Directory already exists")

        # Ensure the parent directory exists
        dir_path.parent.mkdir(parents=True, exist_ok=True)

        # Create the new directory
        try:
            dir_path.mkdir(parents=True, exist_ok=False)
            # Create a .gitkeep file inside the new directory
            gitkeep_path = dir_path / ".gitkeep"
            gitkeep_path.touch(exist_ok=True)
        except Exception as create_error:
            raise HTTPException(
                status_code=500, detail=f"Error creating directory: {str(create_error)}"
            )

        _commit_and_push_changes(repo_path)

        return CreateDirectoryResponse(
            path=str(dir_path.relative_to(repo_path)),
            message="Directory created successfully",
        )

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating directory: {str(e)}")


@router.delete(
    "/repos/files/delete", response_model=DeleteFileResponse
)
async def delete_file(
    file_data: DeleteFileRequest,
):
    """Delete a specific file or directory from the repository."""
    try:
        if not file_data.path:
            raise HTTPException(status_code=400, detail="File path is required")

        # Construct the full file path
        repo_path = Path(f"../repo/{USERNAME}/{REPO_SLUG}")
        target_path = repo_path / file_data.path

        # Check if repository exists
        if not repo_path.exists():
            raise HTTPException(status_code=404, detail="Repository not found")

        # Check if file/directory exists
        if not target_path.exists():
            raise HTTPException(status_code=404, detail="File or directory not found")

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
                        if file_data.path == pattern[1:] or file_data.path.startswith(pattern[1:] + "/"):
                            raise HTTPException(
                                status_code=403,
                                detail="File is ignored by .levelerignore",
                            )
                    elif pattern.endswith("/"):
                        # Directory pattern - check if file is in ignored directory
                        if file_data.path.startswith(pattern[:-1] + "/"):
                            raise HTTPException(
                                status_code=403, detail="File is in ignored directory"
                            )
                    else:
                        # Exact file match
                        if file_data.path == pattern:
                            raise HTTPException(
                                status_code=403,
                                detail="File is ignored by .levelerignore",
                            )
            except Exception:
                # If we can't read the ignore file, continue without it
                pass

        # Delete the file or directory
        try:
            if target_path.is_file():
                target_path.unlink()
            elif target_path.is_dir():
                import shutil
                shutil.rmtree(target_path)
            else:
                raise HTTPException(status_code=400, detail="Path is neither a file nor directory")
        except Exception as delete_error:
            raise HTTPException(
                status_code=500, detail=f"Error deleting file/directory: {str(delete_error)}"
            )

        _commit_and_push_changes(repo_path)

        return DeleteFileResponse(
            path=file_data.path,
            message="File or directory deleted successfully",
        )

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting file/directory: {str(e)}")


@router.put(
    "/repos/files/rename", response_model=RenameFileResponse
)
async def rename_file(
    file_data: RenameFileRequest,
):
    """Rename a file or directory in the repository."""
    try:
        if not file_data.old_path:
            raise HTTPException(status_code=400, detail="Old path is required")

        if not file_data.new_name:
            raise HTTPException(status_code=400, detail="New name is required")

        # Construct the full file paths
        repo_path = Path(f"../repo/{USERNAME}/{REPO_SLUG}")
        old_path = repo_path / file_data.old_path
        
        # Calculate new path
        old_path_parts = Path(file_data.old_path).parts
        if len(old_path_parts) > 1:
            # File is in a subdirectory
            parent_dir = "/".join(old_path_parts[:-1])
            new_path = repo_path / parent_dir / file_data.new_name
        else:
            # File is in root directory
            new_path = repo_path / file_data.new_name

        # Check if repository exists
        if not repo_path.exists():
            raise HTTPException(status_code=404, detail="Repository not found")

        # Check if old file/directory exists
        if not old_path.exists():
            raise HTTPException(status_code=404, detail="File or directory not found")

        # Check if new name already exists
        if new_path.exists():
            raise HTTPException(status_code=409, detail="A file or directory with this name already exists")

        # Check if old file should be ignored
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
                        if file_data.old_path == pattern[1:] or file_data.old_path.startswith(pattern[1:] + "/"):
                            raise HTTPException(
                                status_code=403,
                                detail="File is ignored by .levelerignore",
                            )
                    elif pattern.endswith("/"):
                        # Directory pattern - check if file is in ignored directory
                        if file_data.old_path.startswith(pattern[:-1] + "/"):
                            raise HTTPException(
                                status_code=403, detail="File is in ignored directory"
                            )
                    else:
                        # Exact file match
                        if file_data.old_path == pattern:
                            raise HTTPException(
                                status_code=403,
                                detail="File is ignored by .levelerignore",
                            )
            except Exception:
                # If we can't read the ignore file, continue without it
                pass

        # Rename the file or directory
        try:
            old_path.rename(new_path)
        except Exception as rename_error:
            raise HTTPException(
                status_code=500, detail=f"Error renaming file/directory: {str(rename_error)}"
            )

        _commit_and_push_changes(repo_path)

        return RenameFileResponse(
            old_path=file_data.old_path,
            new_path=str(new_path.relative_to(repo_path)),
            message="File or directory renamed successfully",
        )

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error renaming file/directory: {str(e)}")


@router.get(
    "/repos/files/changed", response_model=ChangedFileResponse
)
async def get_changed_files(
):
    """Get list of changed files in the repository using git status."""
    try:
        # Construct the full repository path
        repo_path = Path(f"../repo/{USERNAME}/{REPO_SLUG}")
        if not repo_path.exists():
            raise HTTPException(status_code=404, detail="Repository not found")

        # Check if this is a git repository
        git_dir = repo_path / ".git"
        if not git_dir.exists() or not git_dir.is_dir():
            raise HTTPException(
                status_code=400, 
                detail="Repository is not a git repository"
            )

        changed_files = []
        import subprocess
        import time
        current_time = time.time()

        try:
            # Run git status to get changed files
            result = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=repo_path,
                capture_output=True,
                text=True,
                timeout=30  # 30 second timeout
            )

            if result.returncode != 0:
                raise HTTPException(
                    status_code=500,
                    detail=f"Git status failed: {result.stderr}"
                )

            # Parse git status output
            for line in result.stdout.strip().split('\n'):
                if not line.strip():
                    continue
                    
                # Git status format: XY PATH
                # X = status of index, Y = status of working tree
                # Examples: M = modified, A = added, D = deleted, R = renamed, C = copied, U = unmerged
                status_code = line[:2]
                file_path = line[2:].strip()
                
                # Skip ignored files
                if _should_ignore_file(repo_path, file_path):
                    continue
                
                # Add file to changed list if it has any changes
                if status_code != "  ":  # Not clean
                    changed_files.append(file_path)

        except subprocess.TimeoutExpired:
            raise HTTPException(
                status_code=500,
                detail="Git status command timed out"
            )
        except FileNotFoundError:
            raise HTTPException(
                status_code=500,
                detail="Git command not found on system"
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error running git status: {str(e)}"
            )

        return ChangedFileResponse(
            changed_files=changed_files,
            total_changed=len(changed_files),
            last_check=time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(current_time))
        )

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting changed files: {str(e)}")


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
