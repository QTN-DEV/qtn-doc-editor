from fastapi import Request, HTTPException
from src.lib.oauth import oauth
import logging
from authlib.integrations.starlette_client import OAuthError
from starlette.responses import RedirectResponse
from src.config import config
import secrets

logger = logging.getLogger(__name__)

async def initiate_github_oauth_login(request: Request):
    """Initiate GitHub OAuth login flow"""
    try:
        # Generate a secure state parameter and store it in session
        state = secrets.token_urlsafe(32)
        request.session["oauth_state"] = state
        
        # Use the correct route name that matches the callback route
        redirect_uri = request.url_for("auth_github_callback")
        logger.info(f"Redirect URI: {redirect_uri}")
        logger.info(f"Generated state: {state}")
        logger.info(f"Session ID: {id(request.session)}")
        logger.info(f"Session data before redirect: {dict(request.session)}")
        
        return await oauth.github.authorize_redirect(
            request, 
            redirect_uri,
            state=state
        )
    except Exception as e:
        logger.error(f"Error in GitHub OAuth login: {e}")
        raise HTTPException(status_code=500, detail="Failed to initiate OAuth login")


async def complete_github_oauth_login(request: Request):
    """Handle GitHub OAuth callback"""
    try:
        logger.info(f"OAuth callback received with query params: {dict(request.query_params)}")
        logger.info(f"Session ID in callback: {id(request.session)}")
        logger.info(f"Session data in callback: {dict(request.session)}")
        
        # Verify state parameter
        expected_state = request.session.get("oauth_state")
        received_state = request.query_params.get("state")
        
        logger.info(f"Expected state: {expected_state}")
        logger.info(f"Received state: {received_state}")
        
        if not expected_state or not received_state or expected_state != received_state:
            logger.error(f"State mismatch: expected={expected_state}, received={received_state}")
            # Clear the invalid state
            request.session.pop("oauth_state", None)
            raise HTTPException(
                status_code=400, 
                detail="Invalid state parameter. Please try logging in again."
            )
        
        # Clear the state after successful verification
        request.session.pop("oauth_state", None)
        
        token = await oauth.github.authorize_access_token(request)
        logger.info(f"OAuth token received: {token.get('access_token', 'No access token')[:10]}...")
    except OAuthError as e:
        logger.error(f"OAuth error in callback: {e}")
        # Clear any stored state on error
        request.session.pop("oauth_state", None)
        raise HTTPException(
            status_code=400, 
            detail=f"OAuth error: {getattr(e, 'error', str(e))}"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in OAuth callback: {e}")
        # Clear any stored state on error
        request.session.pop("oauth_state", None)
        raise HTTPException(status_code=500, detail="Authentication failed")

    try:
        # Get user profile
        user_resp = await oauth.github.get("user", token=token)
        if user_resp.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to fetch user profile")
        
        user_json = user_resp.json()

        # Get user emails (requires user:email scope)
        emails_resp = await oauth.github.get("user/emails", token=token)
        emails = emails_resp.json() if emails_resp.status_code == 200 else []
        primary_email = next((e["email"] for e in emails if e.get("primary")), None)

        # Store user data in session
        user_data = {
            "id": user_json["id"],
            "login": user_json["login"],
            "name": user_json.get("name"),
            "avatar_url": user_json.get("avatar_url"),
            "email": primary_email,
            "token": token,
        }
        
        request.session["user"] = user_data
        logger.info(f"User {user_json['login']} successfully authenticated and stored in session")
        logger.info(f"Session data: {request.session}")
        
        return RedirectResponse(url=config.frontend_url)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing user data: {e}")
        raise HTTPException(status_code=500, detail="Failed to process user data")


async def get_user_data(request: Request):
    """Get current user information"""
    logger.info(f"Session data in /me endpoint: {request.session}")
    user = request.session.get("user")
    if not user:
        logger.warning("No user found in session")
        raise HTTPException(status_code=401, detail="Not authenticated")
    logger.info(f"User found in session: {user.get('login', 'Unknown')}")
    return user
