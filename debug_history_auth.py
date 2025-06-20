#!/usr/bin/env python3
"""
Debug script to test Supabase connection and JWT verification
Run this inside the backend container to diagnose issues
"""

import os
import jwt
import base64


def test_supabase_connection():
    """Test Supabase client initialization"""
    try:
        from supabase import create_client

        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        print(f"✅ SUPABASE_URL: {url}")
        print(
            f"✅ SUPABASE_SERVICE_ROLE_KEY: {key[:20]}..."
            if key
            else "❌ Missing service role key"
        )

        if url and key:
            client = create_client(url, key)
            print("✅ Supabase client created successfully")
            return True
        else:
            print("❌ Missing Supabase credentials")
            return False

    except ImportError as e:
        print(f"❌ Supabase import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Supabase connection error: {e}")
        return False


def test_jwt_secret():
    """Test JWT secret format and decoding"""
    jwt_secret = os.getenv("SUPABASE_JWT_SECRET")

    if not jwt_secret:
        print("❌ SUPABASE_JWT_SECRET not found")
        return False

    print(f"✅ JWT Secret length: {len(jwt_secret)}")
    print(f"✅ JWT Secret starts with: {jwt_secret[:20]}...")

    # Test if it's base64 encoded
    try:
        decoded = base64.b64decode(jwt_secret)
        print(
            f"✅ JWT Secret appears to be base64 encoded ({len(decoded)} bytes when decoded)"
        )
        return jwt_secret
    except:
        print("ℹ️ JWT Secret is not base64 encoded (this is normal)")
        return jwt_secret


def test_jwt_verification():
    """Test JWT token verification with a sample token"""
    jwt_secret = test_jwt_secret()

    if not jwt_secret:
        return False

    # Sample Supabase JWT payload for testing
    sample_payload = {
        "iss": "supabase",
        "sub": "test-user-id",
        "aud": "authenticated",
        "exp": 9999999999,  # Far future
        "iat": 1000000000,
        "role": "authenticated",
    }

    try:
        # Create a test token
        test_token = jwt.encode(sample_payload, jwt_secret, algorithm="HS256")
        print(f"✅ Test token created: {test_token[:50]}...")

        # Try to decode it
        decoded = jwt.decode(test_token, jwt_secret, algorithms=["HS256"])
        print(f"✅ Test token decoded successfully: sub={decoded.get('sub')}")
        return True

    except Exception as e:
        print(f"❌ JWT verification failed: {e}")
        return False


if __name__ == "__main__":
    print("🔍 Debugging Supabase History Authentication Issues")
    print("=" * 60)

    print("\n1. Testing Supabase Connection:")
    supabase_ok = test_supabase_connection()

    print("\n2. Testing JWT Secret:")
    jwt_ok = test_jwt_verification()

    print("\n3. Summary:")
    if supabase_ok and jwt_ok:
        print("✅ All tests passed - the issue might be in the request handling")
    else:
        print("❌ Found issues that need to be fixed")

    print("\n4. Environment Variables:")
    for key in ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_JWT_SECRET"]:
        value = os.getenv(key)
        if value:
            display_value = value[:20] + "..." if len(value) > 20 else value
            print(f"  {key}: {display_value}")
        else:
            print(f"  {key}: ❌ NOT SET")
