from flask import Blueprint, jsonify, request, session
from app.strava_manager import StravaManager
from datetime import datetime, timedelta
import json

bp = Blueprint('contests', __name__, url_prefix='/api/contests')

# In-memory storage for contests (replace with database in production)
contests = {}

@bp.route('/create', methods=['POST'])
def create_contest():
    if 'athlete' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    contest_id = len(contests) + 1
    
    # Validate schedule
    schedule = data.get('schedule', {})
    if not schedule.get('type') or not schedule.get('distance'):
        return jsonify({'error': 'Invalid schedule format'}), 400
    
    if schedule['type'] == 'weekly' and (not schedule.get('days') or len(schedule['days']) == 0):
        return jsonify({'error': 'Weekly schedule must include at least one day'}), 400
    
    contest = {
        'id': contest_id,
        'creator_id': session['athlete']['id'],
        'title': data['title'],
        'stake_amount': data['stake_amount'],
        'start_date': datetime.now().isoformat(),
        'end_date': (datetime.now() + timedelta(days=30)).isoformat(),
        'schedule': schedule,
        'participants': [{
            'id': session['athlete']['id'],
            'name': f"{session['athlete']['firstname']} {session['athlete']['lastname']}",
            'paid': False,
            'completed_days': 0,
            'last_verified': None,
            'strava_connected': False
        }],
        'status': 'pending'
    }
    
    contests[contest_id] = contest
    return jsonify(contest)

@bp.route('/join/<int:contest_id>', methods=['POST'])
def join_contest(contest_id):
    if 'athlete' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    if contest_id not in contests:
        return jsonify({'error': 'Contest not found'}), 404
    
    contest = contests[contest_id]
    
    # Check if user is already in contest
    if any(p['id'] == session['athlete']['id'] for p in contest['participants']):
        return jsonify({'error': 'Already joined'}), 400
    
    participant = {
        'id': session['athlete']['id'],
        'name': f"{session['athlete']['firstname']} {session['athlete']['lastname']}",
        'paid': False,
        'completed_days': 0,
        'last_verified': None,
        'strava_connected': False
    }
    
    contest['participants'].append(participant)
    return jsonify(contest)

@bp.route('/list')
def list_contests():
    if 'athlete' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    athlete_id = session['athlete']['id']
    user_contests = {
        'participating': [c for c in contests.values() if any(p['id'] == athlete_id for p in c['participants'])],
        'available': [c for c in contests.values() if not any(p['id'] == athlete_id for p in c['participants'])]
    }
    
    return jsonify(user_contests)

@bp.route('/verify-run/<int:contest_id>', methods=['POST'])
def verify_run(contest_id):
    if 'athlete' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    if contest_id not in contests:
        return jsonify({'error': 'Contest not found'}), 404
    
    contest = contests[contest_id]
    athlete_id = session['athlete']['id']
    
    # Find participant in contest
    participant = next((p for p in contest['participants'] if p['id'] == athlete_id), None)
    if not participant:
        return jsonify({'error': 'Not participating in this contest'}), 400
    
    # Check if Strava is connected
    if not participant.get('strava_connected', False):
        return jsonify({'error': 'Please connect your Strava account first'}), 400
    
    # Check if already verified today
    today = datetime.now().date()
    if participant['last_verified'] and datetime.fromisoformat(participant['last_verified']).date() == today:
        return jsonify({'error': 'Already verified a run today'}), 400
    
    # Get today's activities from Strava
    client = StravaManager()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())
    activities = client.get_activities_between(today_start, today_end)
    
    # Check if there's any running activity meeting the requirements
    schedule = contest['schedule']
    valid_runs = [
        a for a in activities
        if a['type'] == 'Run' and
        a['distance'] >= schedule['distance'] * 1000  # Convert km to meters
    ]
    
    if not valid_runs:
        return jsonify({
            'error': 'No valid running activity found today',
            'requirements': {
                'distance': f"{schedule['distance']}km",
                'time': schedule.get('time', 'any')
            }
        }), 400
    
    # For weekly schedule, check if today is a running day
    if schedule['type'] == 'weekly':
        today_name = today.strftime('%A').lower()
        if today_name not in schedule['days']:
            return jsonify({'error': f"Today ({today_name}) is not a scheduled running day"}), 400
    
    # Update completed days and last verification
    participant['completed_days'] += 1
    participant['last_verified'] = datetime.now().isoformat()
    
    return jsonify({
        'contest': contest,
        'completed_days': participant['completed_days'],
        'verified_run': {
            'distance': valid_runs[0]['distance'] / 1000,  # Convert to km
            'time': valid_runs[0]['start_date_local']
        }
    }) 