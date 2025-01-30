from flask import Blueprint, current_app, request, jsonify, session, make_response
from app.strava_manager import StravaManager
from .contests import contests
import requests
from datetime import datetime, timedelta
from web3 import Web3
import os

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

@bp.route('/challenges/settle', methods=['POST'])
def settle_challenge():
    challenge_id = request.json.get('challengeId')
    if not challenge_id:
        return jsonify({'error': 'Challenge ID is required'}), 400

    access_token = request.cookies.get('strava_access_token')
    if not access_token:
        return jsonify({'error': 'Not authenticated with Strava'}), 401

    try:
        # 1. Get challenge details from the contract
        w3 = Web3(Web3.HTTPProvider(os.getenv('WEB3_PROVIDER_URI')))
        contract_address = os.getenv('CONTRACT_ADDRESS')
        contract_abi = [...]  # Add your contract ABI here
        contract = w3.eth.contract(address=contract_address, abi=contract_abi)
        
        challenge = contract.functions.competitions(challenge_id).call()
        
        # 2. Get participant's activities from Strava
        headers = {'Authorization': f'Bearer {access_token}'}
        
        # Calculate time range based on challenge details
        end_time = challenge['deadline']
        start_time = end_time - (7 * 24 * 60 * 60)  # 7 days before deadline
        
        activities_url = f'https://www.strava.com/api/v3/athlete/activities'
        params = {
            'after': start_time,
            'before': end_time,
            'per_page': 100
        }
        
        response = requests.get(activities_url, headers=headers, params=params)
        activities = response.json()

        # 3. Validate activities against challenge requirements
        total_distance = 0
        completed_days = set()
        
        for activity in activities:
            if activity['type'] == 'Run':  # Only count running activities
                activity_date = datetime.strptime(activity['start_date'], '%Y-%m-%dT%H:%M:%SZ').date()
                total_distance += activity['distance']  # distance in meters
                completed_days.add(activity_date)

        # Convert distance to kilometers
        total_distance_km = total_distance / 1000

        # 4. Determine if challenge was completed successfully
        challenge_completed = (
            total_distance_km >= challenge['targetDistance'] and
            len(completed_days) >= len(challenge['scheduleDays'])
        )

        if challenge_completed:
            # 5. Call contract to validate results and distribute rewards
            admin_private_key = os.getenv('ADMIN_PRIVATE_KEY')
            admin_account = w3.eth.account.from_key(admin_private_key)
            
            # Build transaction
            nonce = w3.eth.get_transaction_count(admin_account.address)
            
            # Prepare the transaction
            tx = contract.functions.validateResults(
                challenge_id,
                [challenge['creator']]  # Add logic to include all successful participants
            ).build_transaction({
                'from': admin_account.address,
                'nonce': nonce,
                'gas': 2000000,
                'gasPrice': w3.eth.gas_price
            })
            
            # Sign and send the transaction
            signed_tx = w3.eth.account.sign_transaction(tx, admin_private_key)
            tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            # Wait for transaction receipt
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
            
            return jsonify({
                'success': True,
                'message': 'Challenge completed successfully',
                'transaction_hash': receipt['transactionHash'].hex()
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Challenge requirements not met',
                'total_distance': total_distance_km,
                'completed_days': len(completed_days)
            })

    except Exception as error:
        current_app.logger.error(f"Settlement error: {str(error)}")
        return jsonify({'error': str(error)}), 500