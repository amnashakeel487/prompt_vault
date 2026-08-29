from flask import Blueprint, request, jsonify
from config import get_supabase_client, supabase

category_bp = Blueprint('categories', __name__)

def extract_token():
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header.split(' ')[1]
    return None

@category_bp.route('', methods=['GET'])
def get_categories():
    try:
        token = extract_token()
        client = get_supabase_client(token)

        cat_res = client.table('categories').select('*').order('name').execute()
        categories = cat_res.data or []

        # Attach count of published prompts for each category
        prompts_res = client.table('prompts').select('category_id').eq('status', 'published').execute()
        counts = {}
        for p in (prompts_res.data or []):
            cid = p.get('category_id')
            if cid:
                counts[cid] = counts.get(cid, 0) + 1

        for c in categories:
            c['count'] = counts.get(c['id'], 0)

        return jsonify({'categories': categories})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@category_bp.route('/<slug>', methods=['GET'])
def get_category_by_slug(slug):
    try:
        token = extract_token()
        client = get_supabase_client(token)

        res = client.table('categories').select('*').eq('slug', slug).execute()
        if not res.data:
            return jsonify({'error': 'Category not found'}), 404

        cat = res.data[0]
        sub_res = client.table('subcategories').select('*').eq('category_id', cat['id']).order('name').execute()
        cat['subcategories'] = sub_res.data or []

        return jsonify({'category': cat})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@category_bp.route('', methods=['POST'])
def create_category():
    token = extract_token()
    client = get_supabase_client(token)
    data = request.get_json() or {}

    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Category name is required'}), 400

    slug = data.get('slug') or '-'.join(name.lower().split())

    try:
        res = client.table('categories').insert([{
            'name': name,
            'slug': slug,
            'description': data.get('description', ''),
            'icon': data.get('icon', 'Sparkles')
        }]).execute()

        return jsonify({'category': res.data[0] if res.data else None}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@category_bp.route('/<category_id>', methods=['PUT'])
def update_category(category_id):
    token = extract_token()
    client = get_supabase_client(token)
    data = request.get_json() or {}

    try:
        res = client.table('categories').update(data).eq('id', category_id).execute()
        return jsonify({'category': res.data[0] if res.data else None})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@category_bp.route('/<category_id>', methods=['DELETE'])
def delete_category(category_id):
    token = extract_token()
    client = get_supabase_client(token)
    try:
        client.table('categories').delete().eq('id', category_id).execute()
        return jsonify({'message': 'Category deleted successfully.'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@category_bp.route('/<category_id>/subcategories', methods=['GET'])
def get_subcategories(category_id):
    try:
        token = extract_token()
        client = get_supabase_client(token)
        res = client.table('subcategories').select('*').eq('category_id', category_id).order('name').execute()
        return jsonify({'subcategories': res.data or []})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@category_bp.route('/subcategories', methods=['POST'])
def create_subcategory():
    token = extract_token()
    client = get_supabase_client(token)
    data = request.get_json() or {}

    try:
        res = client.table('subcategories').insert([{
            'category_id': data.get('category_id'),
            'name': data.get('name'),
            'slug': data.get('slug') or '-'.join((data.get('name') or '').lower().split())
        }]).execute()
        return jsonify({'subcategory': res.data[0] if res.data else None}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@category_bp.route('/subcategories/<sub_id>', methods=['DELETE'])
def delete_subcategory(sub_id):
    token = extract_token()
    client = get_supabase_client(token)
    try:
        client.table('subcategories').delete().eq('id', sub_id).execute()
        return jsonify({'message': 'Subcategory deleted successfully.'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400
