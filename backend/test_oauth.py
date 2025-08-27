#!/usr/bin/env python3
"""
Simple test script to verify OAuth flow and session management
"""
import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:5173"

def test_session():
    """Test session functionality"""
    print("Testing session functionality...")
    
    response = requests.get(f"{BASE_URL}/test-session")
    print(f"Session test response: {response.status_code}")
    print(f"Session data: {response.json()}")
    
    # Check if session cookie is set
    cookies = response.cookies
    print(f"Cookies: {dict(cookies)}")
    
    return cookies

def test_oauth_status():
    """Test OAuth status endpoint"""
    print("\nTesting OAuth status...")
    
    response = requests.get(f"{BASE_URL}/api/v1/github/status")
    print(f"OAuth status response: {response.status_code}")
    print(f"Status data: {response.json()}")

def test_debug_session():
    """Test debug session endpoint"""
    print("\nTesting debug session...")
    
    response = requests.get(f"{BASE_URL}/debug/session")
    print(f"Debug session response: {response.status_code}")
    print(f"Debug data: {json.dumps(response.json(), indent=2)}")

def test_health():
    """Test health endpoint"""
    print("\nTesting health endpoint...")
    
    response = requests.get(f"{BASE_URL}/health")
    print(f"Health response: {response.status_code}")
    print(f"Health data: {response.json()}")

if __name__ == "__main__":
    print("=== OAuth Flow Test ===")
    
    # Test basic endpoints
    test_health()
    test_session()
    test_oauth_status()
    test_debug_session()
    
    print("\n=== Test Complete ===")
    print("To test the full OAuth flow:")
    print(f"1. Visit: {BASE_URL}/api/v1/github/login")
    print(f"2. Complete GitHub OAuth")
    print(f"3. Check: {BASE_URL}/api/v1/github/status")
