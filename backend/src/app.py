"""Start FastAPI app with CORS enabled.

Create a FastAPI application with repository initialization endpoint and CORS enabled.
"""
from dotenv import load_dotenv
load_dotenv()

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.controllers.file_controller import router as file_router

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(file_router, prefix="/api/v1")


@app.get("/")
def read_root():
    """Return hello world message."""
    logger.info("Root endpoint accessed.")
    return {"message": "Hello, world!"}