from flask import Blueprint, request, jsonify
from config import get_supabase_client, supabase

auth_bp = Blueprint('auth', __name__)

def extract_token():
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header.split(' ')[1]
    return None

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    try:
        res = supabase.auth.sign_up({'email': email, 'password': password})
        user_dict = res.user.dict() if res.user else None
        session_dict = res.session.dict() if res.session else None
        return jsonify({'user': user_dict, 'session': session_dict})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    try:
        res = supabase.auth.sign_in_with_password({'email': email, 'password': password})
        if not res.user:
            return jsonify({'error': 'Sign in failed'}), 400

        user_id = res.user.id
        client = get_supabase_client(res.session.access_token if res.session else None)

        # Check admin_profiles table
        profile_res = client.table('admin_profiles').select('*').eq('id', user_id).execute()
        profile_data = profile_res.data[0] if profile_res.data else None

        # Block Super Admin from public portal
        if profile_data and profile_data.get('role') == 'super_admin':
            return jsonify({'error': 'Super Admin accounts must log in via the dedicated system portal.'}), 403

        user_dict = res.user.dict() if res.user else None
        session_dict = res.session.dict() if res.session else None
        return jsonify({
            'user': user_dict,
            'session': session_dict,
            'profile': profile_data
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@auth_bp.route('/system-login', methods=['POST'])
def system_login():
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    try:
        res = supabase.auth.sign_in_with_password({'email': email, 'password': password})
        if not res.user:
            return jsonify({'error': 'System sign in failed'}), 400

        user_id = res.user.id
        client = get_supabase_client(res.session.access_token if res.session else None)

        # Check admin_profiles table
        profile_res = client.table('admin_profiles').select('*').eq('id', user_id).execute()
        profile_data = profile_res.data[0] if profile_res.data else None

        # Bootstrap profile if email matches super admin email
        if not profile_data and email.lower() == 'amnashakeel2101@gmail.com':
            insert_res = client.table('admin_profiles').insert([{
                'id': user_id,
                'user_email': email,
                'display_name': 'Super Admin',
                'role': 'super_admin'
            }]).execute()
            if insert_res.data:
                profile_data = insert_res.data[0]

        if not profile_data or profile_data.get('role') != 'super_admin':
            return jsonify({'error': 'Access denied: Super Admin credentials required.'}), 403

        user_dict = res.user.dict() if res.user else None
        session_dict = res.session.dict() if res.session else None
        return jsonify({
            'user': user_dict,
            'session': session_dict,
            'profile': profile_data
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@auth_bp.route('/profile', methods=['GET'])
def get_profile():
    token = extract_token()
    if not token:
        return jsonify({'profile': None, 'role': None})

    try:
        client = get_supabase_client(token)
        user_res = client.auth.get_user(token)
        if not user_res.user:
            return jsonify({'profile': None, 'role': None})

        profile_res = client.table('admin_profiles').select('*, categories:assigned_category_id(name)').eq('id', user_res.user.id).execute()
        profile_data = profile_res.data[0] if profile_res.data else None
        return jsonify({'profile': profile_data, 'user': user_res.user.dict()})
    except Exception as e:
        return jsonify({'profile': None, 'role': None, 'error': str(e)})

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json() or {}
    email = data.get('email')
    if not email:
        return jsonify({'error': 'Email is required'}), 400

    try:
        supabase.auth.reset_password_for_email(email)
        return jsonify({'message': 'Password reset email sent successfully.'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400
