# ================================
# PRODUCTION / LIVE URL CONFIG
# Change URLs here only
# ================================

import os

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:5005")
