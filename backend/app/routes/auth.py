from flask import Blueprint, current_app, request, jsonify, session
from app.strava_manager import StravaManager
from .contests import contests
import requests

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

        # Store tokens in session
        session['strava_tokens'] = {
            'access_token': token_response['access_token'],
            'refresh_token': token_response['refresh_token'],
            'expires_at': token_response['expires_at']
        }

        # Get athlete info from the token response
        athlete = token_response['athlete']
        
        # Store athlete info in session
        session['athlete'] = {
            'id': athlete['id'],
            'firstname': athlete['firstname'],
            'lastname': athlete['lastname'],
            'profile': athlete['profile']
        }

        # Update contest participant if needed
        if 'pending_contest_id' in session:
            contest_id = session['pending_contest_id']
            if contest_id in contests:
                contest = contests[contest_id]
                participant = next(
                    (p for p in contest['participants'] if p['id'] == athlete['id']),
                    None
                )
                if participant:
                    participant['strava_connected'] = True
            session.pop('pending_contest_id')

        return jsonify(token_response)

    except Exception as error:
        current_app.logger.error(f"Token exchange error: {str(error)}")
        return jsonify({'error': 'Failed to exchange token'}), 500

@bp.route('/strava/refresh')
def strava_refresh():
    refresh_token = request.args.get('refresh_token')
    
    if not refresh_token:
        return jsonify({'error': 'No refresh token provided'}), 400
        
    try:
        client = StravaManager(session=False)
        token_response = client.refresh_token(refresh_token)
        return jsonify(token_response)
        
    except Exception as error:
        return jsonify({'error': 'Failed to refresh token'}), 500

@bp.route('/strava/athlete')
def get_athlete():
    if 'athlete' not in session:
        return jsonify({'error': 'Not authenticated with Strava'}), 401

    try:
        # Get the access token from the session or token response
        access_token = session.get('strava_tokens', {}).get('access_token')
        
        if not access_token:
            return jsonify({'error': 'No access token available'}), 401

        # Make request to Strava API
        headers = {'Authorization': f'Bearer {access_token}'}
        response = requests.get('https://www.strava.com/api/v3/athlete', headers=headers)
        
        if response.status_code != 200:
            return jsonify({'error': 'Failed to fetch athlete data'}), response.status_code

        athlete_data = response.json()
        return jsonify(athlete_data)

    except Exception as error:
        current_app.logger.error(f"Error fetching athlete data: {str(error)}")
        return jsonify({'error': 'Failed to fetch athlete data'}), 500