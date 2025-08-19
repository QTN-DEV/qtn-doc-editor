# Backend API

This is a FastAPI backend that handles repository initialization from GitHub.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the server:
```bash
uvicorn src.app:app --reload --port 8000
```

## API Endpoints

### POST /api/v1/init

Initializes a repository by cloning it from GitHub.

**Request Body:**
```json
{
  "pat": "your_github_personal_access_token",
  "github_repo": "username/repo-slug"
}
```

**Response:**
```json
{
  "message": "Repository cloned successfully",
  "status": "success",
  "path": "repo/username/repo-slug"
}
```

## Features

- Validates repository format (username/repo-slug)
- Checks if repository already exists before cloning
- Creates necessary directory structure
- Uses Git to clone repositories
- Handles errors gracefully with detailed messages

## Directory Structure

```
backend/
├── src/
│   ├── controllers/
│   │   ├── __init__.py
│   │   └── init_controller.py
│   ├── services/
│   │   └── __init__.py
│   ├── __init__.py
│   └── app.py
├── requirements.txt
└── README.md
```

The cloned repositories will be stored in `backend/repo/username/repo-slug/`.
