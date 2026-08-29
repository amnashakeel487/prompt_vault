from flask import Blueprint, request, jsonify
from config import get_supabase_client, supabase

team_bp = Blueprint('team', __name__)

def extract_token():
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header.split(' ')[1]
    return None

@team_bp.route('/requests', methods=['POST'])
def submit_request():
    token = extract_token()
    if not token:
        return jsonify({'error': 'Authentication required'}), 401

    client = get_supabase_client(token)
    data = request.get_json() or {}

    try:
        user_res = client.auth.get_user(token)
        if not user_res.user:
            return jsonify({'error': 'User not authenticated'}), 401

        user_id = user_res.user.id
        user_email = user_res.user.email

        # Check existing request
        existing = client.table('team_member_requests').select('id, status').eq('user_id', user_id).execute()
        if existing.data and existing.data[0].get('status') == 'pending':
            return jsonify({'error': 'You already have a pending team member request.'}), 400

        payload = {
            'user_id': user_id,
            'user_email': user_email,
            'requested_category_id': data.get('requested_category_id') or data.get('requestedCategoryId'),
            'message': data.get('message', ''),
            'status': 'pending'
        }

        res = client.table('team_member_requests').insert([payload]).execute()
        return jsonify({'request': res.data[0] if res.data else None}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@team_bp.route('/requests/status', methods=['GET'])
def get_user_request_status():
    token = extract_token()
    if not token:
        return jsonify({'request': None})

    client = get_supabase_client(token)
    try:
        user_res = client.auth.get_user(token)
        if not user_res.user:
            return jsonify({'request': None})

        res = client.table('team_member_requests').select('*, categories:requested_category_id(name)').eq('user_id', user_res.user.id).order('created_at', desc=True).limit(1).execute()
        return jsonify({'request': res.data[0] if res.data else None})
    except Exception as e:
        return jsonify({'request': None, 'error': str(e)})

@team_bp.route('/requests', methods=['GET'])
def get_all_requests():
    token = extract_token()
    client = get_supabase_client(token)
    status = request.args.get('status', 'pending')

    try:
        query = client.table('team_member_requests').select('*, categories:requested_category_id(name)').order('created_at', desc=True)
        if status and status != 'all':
            query = query.eq('status', status)
        res = query.execute()

        return jsonify({'requests': res.data or []})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@team_bp.route('/requests/<request_id>/approve', methods=['PUT'])
def approve_request(request_id):
    token = extract_token()
    client = get_supabase_client(token)
    data = request.get_json() or {}

    try:
        # Fetch request row
        req_res = client.table('team_member_requests').select('*').eq('id', request_id).execute()
        if not req_res.data:
            return jsonify({'error': 'Request not found'}), 404

        req_row = req_res.data[0]
        user_id = req_row['user_id']
        user_email = req_row.get('user_email')
        category_id = data.get('assigned_category_id') or req_row.get('requested_category_id')

        # Update request status to approved
        client.table('team_member_requests').update({'status': 'approved'}).eq('id', request_id).execute()

        # Upsert user into admin_profiles with role = category_admin
        profile_payload = {
            'id': user_id,
            'user_email': user_email,
            'role': 'category_admin',
            'assigned_category_id': category_id,
            'display_name': user_email.split('@')[0] if user_email else 'Team Member'
        }
        client.table('admin_profiles').upsert([profile_payload]).execute()

        return jsonify({'message': 'Team member request approved successfully.'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@team_bp.route('/requests/<request_id>/reject', methods=['PUT'])
def reject_request(request_id):
    token = extract_token()
    client = get_supabase_client(token)
    data = request.get_json() or {}

    try:
        client.table('team_member_requests').update({
            'status': 'rejected',
            'rejection_reason': data.get('reason', '')
        }).eq('id', request_id).execute()
        return jsonify({'message': 'Team member request rejected.'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400
