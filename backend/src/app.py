"""Start FastAPI app with CORS enabled.

Create a FastAPI application with repository initialization endpoint and CORS enabled.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.controllers.init_controller import router as init_router
from src.controllers.file_controller import router as file_router

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(init_router, prefix="/api/v1")
app.include_router(file_router, prefix="/api/v1")


@app.get("/")
def read_root():
    """Return hello world message."""
    return {"message": "Hello, world!"}
