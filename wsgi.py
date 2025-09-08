#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WSGI entry point for Gunicorn/Render
"""
from app import app as app  # Expose Flask app object

# Also expose as 'application' for some hosting defaults
application = app

if __name__ == "__main__":
    # Local run fallback
    app.run(host="0.0.0.0", port=5000)