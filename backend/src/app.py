"""Start FastAPI app with CORS enabled.

Create a FastAPI application with repository initialization endpoint and CORS enabled.
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.controllers.init_controller import router as init_router
from src.controllers.file_controller import router as file_router
from src.controllers.scan_controller import router as scan_router

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

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
app.include_router(scan_router, prefix="/api/v1")


@app.get("/")
def read_root():
    """Return hello world message."""
    logger.info("Root endpoint accessed.")
    return {"message": "Hello, world!"}