#!/usr/bin/env python3
"""
Environment validation script for WaveToTxt backend.
Run this script to validate your environment configuration before starting the application.

Usage:
    python validate_env.py
"""

import sys
import os
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

try:
    from core.config import settings

    print("🎉 All environment variables are properly configured!")
    print(f"🚀 You can now start the application with confidence.")

    # Print available features
    print("\n📋 Available Features:")
    features = settings.get_config_summary()["features_enabled"]
    for feature, enabled in features.items():
        status = "✅" if enabled else "❌"
        print(f"  {status} {feature.replace('_', ' ').title()}")

    if not all(features.values()):
        print("\n⚠️  Some features are disabled due to missing configuration.")
        print("   Check the documentation for required environment variables.")

except Exception as e:
    print(f"💥 Configuration validation failed: {e}")
    sys.exit(1)
