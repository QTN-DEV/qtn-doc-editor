from fastapi import APIRouter, Request
from starlette.responses import RedirectResponse
from src.modules.v1.github_oauth.controller import (
    initiate_github_oauth_login,
    complete_github_oauth_login,
    get_user_data,
)

github_oauth_router = APIRouter()

@github_oauth_router.get("/login")
async def github_oauth_login(request: Request):
    return await initiate_github_oauth_login(request)


@github_oauth_router.get("/auth/github")
async def auth_github_callback(request: Request):
    return await complete_github_oauth_login(request)


@github_oauth_router.get("/me")
async def me(request: Request):
    return await get_user_data(request)


@github_oauth_router.get("/logout")
async def logout(request: Request):
    request.session.clear()
    return RedirectResponse(url="/")


@github_oauth_router.get("/status")
async def auth_status(request: Request):
    user = request.session.get("user")
    return {
        "authenticated": user is not None, 
        "user": user,
        "session_keys": list(request.session.keys()) if request.session else [],
        "session_data": dict(request.session) if request.session else {},
        "has_token": user.get("token") is not None if user else False,
        "token_keys": list(user.get("token", {}).keys()) if user and user.get("token") else []
    }
