from flask import Blueprint, current_app, request, jsonify, session, make_response
from app.strava_manager import StravaManager
from .contests import contests
import requests
from datetime import datetime, timedelta

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('/strava/login')
def strava_auth():
    stravaAuthUrl = f"https://www.strava.com/oauth/authorize?client_id={current_app.config['STRAVA_CLIENT_ID']}&response_type=code&redirect_uri={current_app.config['STRAVA_REDIRECT_URI']}&scope=activity:read_all,profile:read_all"
    return jsonify({'authorize_url': stravaAuthUrl})

@bp.route('/strava/callback', methods=['POST'])
def strava_callback():
    code = request.json.get('code')
    
    if not code:
        return jsonify({'error': 'No authorization code provided'}), 400

    try:
        # Direct token exchange with Strava API
        response = requests.post('https://www.strava.com/oauth/token', {
            'client_id': current_app.config['STRAVA_CLIENT_ID'],
            'client_secret': current_app.config['STRAVA_CLIENT_SECRET'],
            'code': code,
            'grant_type': 'authorization_code'
        })
        token_response = response.json()

        # Create response with tokens
        resp = make_response(jsonify({
            'success': True,
            'athlete': token_response['athlete']
        }))

        # Set secure cookies for tokens
        # Set to expire slightly before the actual token expiration
        expires = datetime.fromtimestamp(token_response['expires_at'] - 300)  # 5 minutes buffer
        
        resp.set_cookie(
            'strava_access_token',
            token_response['access_token'],
            httponly=True,
            secure=True,
            samesite='Lax',
            expires=expires
        )
        
        resp.set_cookie(
            'strava_refresh_token',
            token_response['refresh_token'],
            httponly=True,
            secure=True,
            samesite='Lax',
            expires=datetime.now() + timedelta(days=365)  # 1 year for refresh token
        )

        return resp

    except Exception as error:
        current_app.logger.error(f"Token exchange error: {str(error)}")
        return jsonify({'error': 'Failed to exchange token'}), 500

@bp.route('/strava/refresh')
def strava_refresh():
    refresh_token = request.cookies.get('strava_refresh_token')
    
    if not refresh_token:
        return jsonify({'error': 'No refresh token provided'}), 401
        
    try:
        response = requests.post('https://www.strava.com/oauth/token', {
            'client_id': current_app.config['STRAVA_CLIENT_ID'],
            'client_secret': current_app.config['STRAVA_CLIENT_SECRET'],
            'refresh_token': refresh_token,
            'grant_type': 'refresh_token'
        })
        
        token_response = response.json()
        
        # Create response with success message
        resp = make_response(jsonify({'success': True}))
        
        # Update cookies with new tokens
        expires = datetime.fromtimestamp(token_response['expires_at'] - 300)
        
        resp.set_cookie(
            'strava_access_token',
            token_response['access_token'],
            httponly=True,
            secure=True,
            samesite='Lax',
            expires=expires
        )
        
        resp.set_cookie(
            'strava_refresh_token',
            token_response['refresh_token'],
            httponly=True,
            secure=True,
            samesite='Lax',
            expires=datetime.now() + timedelta(days=365)
        )
        
        return resp
        
    except Exception as error:
        current_app.logger.error(f"Token refresh error: {str(error)}")
        return jsonify({'error': 'Failed to refresh token'}), 500

@bp.route('/strava/athlete')
def get_athlete():
    access_token = request.cookies.get('strava_access_token')
    
    if not access_token:
        return jsonify({'error': 'Not authenticated with Strava'}), 401

    try:
        headers = {'Authorization': f'Bearer {access_token}'}
        response = requests.get('https://www.strava.com/api/v3/athlete', headers=headers)
        
        if response.status_code == 401:
            # Token expired, try to refresh
            refresh_response = strava_refresh()
            if refresh_response.status_code != 200:
                return jsonify({'error': 'Authentication expired'}), 401
                
            # Get new access token from cookie
            access_token = request.cookies.get('strava_access_token')
            headers = {'Authorization': f'Bearer {access_token}'}
            response = requests.get('https://www.strava.com/api/v3/athlete', headers=headers)

        return jsonify(response.json())

    except Exception as error:
        current_app.logger.error(f"Error fetching athlete data: {str(error)}")
        return jsonify({'error': 'Failed to fetch athlete data'}), 500

@bp.route('/strava/logout')
def logout():
    resp = make_response(jsonify({'success': True}))
    resp.delete_cookie('strava_access_token')
    resp.delete_cookie('strava_refresh_token')
    return resp