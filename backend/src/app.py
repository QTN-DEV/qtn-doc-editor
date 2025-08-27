import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from src.modules.v1.file_controller.router import router as file_router
from src.modules.v1.github_oauth.router import github_oauth_router  
from starlette.middleware.sessions import SessionMiddleware
from src.config import config
from src.lib.oauth import oauth

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Quantum Doc API",
    description="Backend API for Quantum Doc application with GitHub OAuth",
    version="1.0.0"
)


# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.frontend_url, "http://localhost:5173", "http://127.0.0.1:5173"],  # Allow multiple frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Set-Cookie"],  # Expose Set-Cookie header for session management
)

# Signed cookie session (HTTPOnly). For production, also set same_site="lax"/"strict" and https-only.
app.add_middleware(
    SessionMiddleware,
    secret_key=config.session_secret,
    same_site="lax",  # Changed from "none" to "lax" for better security
    https_only=False,  # set True in production
    max_age=3600,  # 1 hour session
    session_cookie="quantum_doc_session",  # Add specific cookie name
)

# Initialize OAuth
try:
    oauth.register(
        name="github",
        client_id=config.github_client_id,
        client_secret=config.github_client_secret,
        access_token_url="https://github.com/login/oauth/access_token",
        authorize_url="https://github.com/login/oauth/authorize",
        api_base_url="https://api.github.com/",
        client_kwargs={"scope": "read:user user:email repo"},
    )
    logger.info("GitHub OAuth configured successfully")
except Exception as e:
    logger.error(f"Failed to configure GitHub OAuth: {e}")
    raise


@app.get("/")
def read_root():
    """Return hello world message."""
    logger.info("Root endpoint accessed.")
    return {"message": "Hello, world!"}

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "oauth_configured": "github" in oauth._clients
    }

@app.get("/test-session")
async def test_session(request: Request):
    """Test endpoint to check session functionality"""
    # Set a test value in session
    request.session["test"] = "session_working"
    return {
        "message": "Session test",
        "session_data": dict(request.session),
        "cors_origin": config.frontend_url
    }

@app.get("/debug/session")
async def debug_session(request: Request):
    """Debug endpoint to inspect session state"""
    return {
        "session_id": id(request.session),
        "session_data": dict(request.session),
        "oauth_state": request.session.get("oauth_state"),
        "user": request.session.get("user"),
        "cookies": dict(request.cookies),
        "headers": dict(request.headers)
    }

# Include GitHub OAuth router
app.include_router(github_oauth_router, prefix="/api/v1/github", tags=["Github OAuth Login"])
# Include routers
app.include_router(file_router, prefix="/api/v1/repos", tags=["File Controller"])

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return HTTPException(status_code=500, detail="Internal server error")