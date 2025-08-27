from pydantic import BaseModel
from typing import List

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


class PushRequest(BaseModel):
    """Push request model."""

    commit_message: str = "Auto commit from QTN-DOC"


class PushResponse(BaseModel):
    """Push response model."""

    message: str
    success: bool
    details: str | None = None
