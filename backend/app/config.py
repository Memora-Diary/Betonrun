import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev'
    STRAVA_CLIENT_ID = os.environ.get('STRAVA_CLIENT_ID')
    STRAVA_CLIENT_SECRET = os.environ.get('STRAVA_CLIENT_SECRET')
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    STRAVA_REDIRECT_URI = f"{FRONTEND_URL}/auth/strava/callback"
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_SAMESITE = 'None'