# ================================
# Python Service Web API Entry Point
# ================================

import os
from flask import Flask, jsonify, request
try:
    from .config import FRONTEND_URL, BACKEND_API_URL
except ImportError:
    from config import FRONTEND_URL, BACKEND_API_URL

app = Flask(__name__)

@app.route("/", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ok",
        "service": "SEO Tool Analytics Pipeline Engine",
        "frontendUrl": FRONTEND_URL,
        "backendApiUrl": BACKEND_API_URL
    })

@app.route("/api/python/health", methods=["GET"])
def python_health():
    return jsonify({
        "status": "healthy",
        "engine": "Python Authority/Page/Spam Calculator"
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)
