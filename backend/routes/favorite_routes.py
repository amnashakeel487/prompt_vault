from flask import Blueprint, request, jsonify
from config import get_supabase_client, supabase

favorite_bp = Blueprint('favorites', __name__)

def extract_token():
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header.split(' ')[1]
    return None

@favorite_bp.route('/toggle', methods=['POST'])
def toggle_favorite():
    token = extract_token()
    if not token:
        return jsonify({'error': 'Authentication required'}), 401

    client = get_supabase_client(token)
    data = request.get_json() or {}
    prompt_id = data.get('prompt_id') or data.get('promptId')

    if not prompt_id:
        return jsonify({'error': 'Prompt ID is required'}), 400

    try:
        user_res = client.auth.get_user(token)
        if not user_res.user:
            return jsonify({'error': 'User not authenticated'}), 401

        user_id = user_res.user.id

        # Check existing favorite
        existing = client.table('favorites').select('id').eq('user_id', user_id).eq('prompt_id', prompt_id).execute()

        if existing.data:
            # Remove favorite
            client.table('favorites').delete().eq('user_id', user_id).eq('prompt_id', prompt_id).execute()
            return jsonify({'favorited': False})
        else:
            # Add favorite
            client.table('favorites').insert([{'user_id': user_id, 'prompt_id': prompt_id}]).execute()
            return jsonify({'favorited': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@favorite_bp.route('', methods=['GET'])
def get_user_favorites():
    token = extract_token()
    if not token:
        return jsonify({'favorites': []})

    client = get_supabase_client(token)
    try:
        user_res = client.auth.get_user(token)
        if not user_res.user:
            return jsonify({'favorites': []})

        res = client.table('favorites').select('*, prompts(*, categories(*), prompt_images(*))').eq('user_id', user_res.user.id).order('created_at', desc=True).execute()

        favs = [f['prompts'] for f in (res.data or []) if f.get('prompts')]
        return jsonify({'favorites': favs})
    except Exception as e:
        return jsonify({'favorites': [], 'error': str(e)})

@favorite_bp.route('/contact', methods=['POST'])
def send_contact():
    data = request.get_json() or {}
    try:
        supabase.table('contact_messages').insert([{
            'name': data.get('name'),
            'email': data.get('email'),
            'message': data.get('message')
        }]).execute()
        return jsonify({'message': 'Contact message sent successfully.'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@favorite_bp.route('/contact/messages', methods=['GET'])
def get_contact_messages():
    token = extract_token()
    client = get_supabase_client(token)
    try:
        res = client.table('contact_messages').select('*').order('created_at', desc=True).execute()
        return jsonify({'messages': res.data or []})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@favorite_bp.route('/contact/messages/<msg_id>', methods=['DELETE'])
def delete_contact_message(msg_id):
    token = extract_token()
    client = get_supabase_client(token)
    try:
        client.table('contact_messages').delete().eq('id', msg_id).execute()
        return jsonify({'message': 'Message deleted.'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400
