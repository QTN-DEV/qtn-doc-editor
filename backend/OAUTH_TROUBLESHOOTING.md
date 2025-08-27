# OAuth Troubleshooting Guide

## CSRF State Mismatch Error

The error `mismatching_state: CSRF Warning! State not equal in request and response` occurs when the OAuth state parameter doesn't match between the initial authorization request and the callback.

## Recent Fixes Applied

1. **Improved State Management**: Added explicit state parameter generation and verification
2. **Enhanced Session Configuration**: Updated session middleware settings
3. **Better Error Handling**: Added comprehensive logging and error recovery
4. **CORS Improvements**: Added proper CORS headers for session management

## Debugging Steps

### 1. Check Session Configuration

Run the test script to verify session functionality:
```bash
cd backend
python test_oauth.py
```

### 2. Check Environment Variables

Ensure these environment variables are set:
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `SESSION_SECRET`
- `FRONTEND_URL`

### 3. Verify GitHub OAuth App Settings

In your GitHub OAuth app settings, ensure:
- **Authorization callback URL**: `http://localhost:8000/api/v1/github/auth/github`
- **Homepage URL**: `http://localhost:5173` (or your frontend URL)

### 4. Test OAuth Flow

1. Clear browser cookies and session data
2. Visit: `http://localhost:8000/api/v1/github/login`
3. Complete GitHub OAuth
4. Check: `http://localhost:8000/api/v1/github/status`

### 5. Debug Endpoints

Use these endpoints to debug issues:

- **Session Test**: `GET /test-session`
- **Debug Session**: `GET /debug/session`
- **OAuth Status**: `GET /api/v1/github/status`
- **Health Check**: `GET /health`

## Common Issues and Solutions

### Issue: State Mismatch Error
**Cause**: Session not persisting between requests
**Solution**: 
- Check session secret is properly set
- Verify CORS configuration
- Clear browser cache and cookies

### Issue: Session Not Working
**Cause**: Session middleware configuration
**Solution**:
- Verify `SESSION_SECRET` environment variable
- Check session cookie settings
- Ensure HTTPS is disabled for development

### Issue: CORS Errors
**Cause**: Frontend can't access backend
**Solution**:
- Verify `FRONTEND_URL` environment variable
- Check CORS middleware configuration
- Ensure credentials are allowed

## Logging

The application now includes comprehensive logging for OAuth flow:

- State generation and verification
- Session data at each step
- OAuth token processing
- Error details

Check the logs for detailed information about the OAuth flow.

## Testing

Use the provided test script to verify functionality:

```bash
python test_oauth.py
```

This will test:
- Session functionality
- OAuth status
- Debug endpoints
- Health check

## Production Considerations

For production deployment:

1. Set `https_only=True` in session middleware
2. Use `same_site="strict"` for session cookies
3. Use HTTPS for all endpoints
4. Set proper `SESSION_SECRET` (32+ characters)
5. Configure proper CORS origins
