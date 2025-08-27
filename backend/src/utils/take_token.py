from typing import Union
from fastapi import Request, HTTPException

async def take_token(request: Request) -> Union[str, None]:
    try:
        user_data = request.session.get("user")
        if not user_data:
            raise HTTPException(status_code=401, detail="Not authenticated")

        token_data = user_data.get("token")
        if not token_data:
            raise HTTPException(status_code=401, detail="No token found in session")

        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=401, detail="No access token found")
        
        return access_token
    except (KeyError, TypeError, AttributeError):
        raise HTTPException(status_code=401, detail="Invalid session data")
