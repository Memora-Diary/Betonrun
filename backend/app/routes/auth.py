from flask import Blueprint, current_app, request, jsonify, session
from app.strava_manager import StravaManager
from .contests import contests  # Import the contests dictionary

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('/strava/login')
def strava_login():
    contest_id = request.args.get('contest_id')
    if contest_id:
        session['pending_contest_id'] = int(contest_id)
        
    client = StravaManager(session=False)
    authorize_url = client.strava_client.authorization_url(
        client_id=current_app.config['STRAVA_CLIENT_ID'],
        redirect_uri=current_app.config['STRAVA_REDIRECT_URI'],
        scope=['read', 'activity:read_all']
    )
    return jsonify({'authorize_url': authorize_url})

@bp.route('/strava/callback', methods=['POST'])
def strava_callback():
    data = request.get_json()
    code = data.get('code')
    
    if not code:
        return jsonify({'error': 'No authorization code provided'}), 400
        
    client = StravaManager(session=False)
    client.generate_token_response(code)
    
    # Get athlete info
    athlete = client.get_athlete()
    
    # Store athlete info in session
    session['athlete'] = {
        'id': athlete.id,
        'firstname': athlete.firstname,
        'lastname': athlete.lastname,
        'profile': athlete.profile
    }
    
    # If there's a pending contest, update the participant's Strava connection status
    if 'pending_contest_id' in session:
        contest_id = session['pending_contest_id']
        if contest_id in contests:
            contest = contests[contest_id]
            participant = next(
                (p for p in contest['participants'] if p['id'] == athlete.id),
                None
            )
            if participant:
                participant['strava_connected'] = True
        session.pop('pending_contest_id')
    
    return jsonify({
        'success': True,
        'athlete': session['athlete']
    }) 