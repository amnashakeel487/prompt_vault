import random
import string
from flask import Blueprint, request, jsonify
from config import get_supabase_client, supabase

prompt_bp = Blueprint('prompts', __name__)

def extract_token():
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header.split(' ')[1]
    return None

def generate_unique_slug(base_title, current_slug=None):
    base_slug = base_title.lower()
    for char in ["'", '"', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '+', '=', '?', ',', '.', '/', '\\']:
        base_slug = base_slug.replace(char, '')
    base_slug = '-'.join(base_slug.split()).strip('-')

    if current_slug and current_slug.startswith(base_slug):
        return current_slug

    suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
    return f"{base_slug}-{suffix}"

@prompt_bp.route('', methods=['GET'])
def get_prompts():
    category_slug = request.args.get('category')
    tag = request.args.get('tag')
    search = request.args.get('search')
    featured = request.args.get('featured')
    popular = request.args.get('popular')
    trending = request.args.get('trending')
    author_id = request.args.get('author')
    sort = request.args.get('sort', 'created_at')
    order = request.args.get('order', 'desc')
    limit = int(request.args.get('limit', 50))
    offset = int(request.args.get('offset', 0))
    status = request.args.get('status', 'published')

    try:
        token = extract_token()
        client = get_supabase_client(token)

        query = client.table('prompts').select(
            '*, categories(*), prompt_images(*)',
            count='exact'
        )

        if status and status != 'all':
            query = query.eq('status', status)
        if author_id:
            query = query.eq('author', author_id)
        if featured == 'true':
            query = query.eq('featured', True)
        if popular == 'true':
            query = query.eq('popular', True)
        if trending == 'true':
            query = query.eq('trending', True)

        if order == 'asc':
            query = query.order(sort, desc=False)
        else:
            query = query.order(sort, desc=True)

        query = query.range(offset, offset + limit - 1)
        res = query.execute()

        prompts = res.data or []
        total_count = res.count or len(prompts)

        # Filter in memory if category or tag query parameters were provided
        if category_slug and category_slug != 'all':
            prompts = [p for p in prompts if p.get('categories') and p['categories'].get('slug') == category_slug]
        if tag:
            prompts = [p for p in prompts if tag.lower() in [t.lower() for t in p.get('tags', [])]]
        if search:
            s = search.lower()
            prompts = [p for p in prompts if s in p.get('title', '').lower() or s in p.get('description', '').lower()]

        return jsonify({'prompts': prompts, 'total': total_count})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@prompt_bp.route('/<slug>', methods=['GET'])
def get_prompt_by_slug(slug):
    try:
        token = extract_token()
        client = get_supabase_client(token)

        res = client.table('prompts').select('*, categories(*), prompt_images(*)').eq('slug', slug).execute()
        if not res.data:
            return jsonify({'error': 'Prompt not found'}), 404

        prompt = res.data[0]
        # Fetch related prompts in same category
        related = []
        if prompt.get('category_id'):
            rel_res = client.table('prompts').select('*, categories(*), prompt_images(*)').eq('category_id', prompt['category_id']).eq('status', 'published').neq('id', prompt['id']).limit(6).execute()
            related = rel_res.data or []

        return jsonify({'prompt': prompt, 'related': related})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@prompt_bp.route('/pending', methods=['GET'])
def get_pending_prompts():
    token = extract_token()
    client = get_supabase_client(token)
    try:
        res = client.table('prompts').select('*, categories(*), prompt_images(*)').eq('status', 'pending').order('created_at', desc=True).execute()
        return jsonify({'prompts': res.data or []})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@prompt_bp.route('', methods=['POST'])
def create_prompt():
    token = extract_token()
    if not token:
        return jsonify({'error': 'Authentication required'}), 401

    client = get_supabase_client(token)
    data = request.get_json() or {}

    title = data.get('title', '').strip()
    if not title:
        return jsonify({'error': 'Prompt title is required'}), 400

    slug = generate_unique_slug(title, data.get('slug'))

    try:
        user_res = client.auth.get_user(token)
        user_id = user_res.user.id if user_res.user else None

        prompt_payload = {
            'title': title,
            'slug': slug,
            'description': data.get('description', ''),
            'prompt': data.get('prompt', ''),
            'category_id': data.get('category_id'),
            'subcategory_id': data.get('subcategory_id'),
            'tags': data.get('tags', []),
            'variables': data.get('variables', []),
            'author': user_id,
            'status': data.get('status', 'pending'),
            'featured_image': data.get('featured_image'),
            'output_image': data.get('output_image'),
            'seo_title': data.get('seo_title', title),
            'seo_description': data.get('seo_description', data.get('description', '')),
            'featured': data.get('featured', False),
            'popular': data.get('popular', False),
            'trending': data.get('trending', False),
            'views': 0,
            'copies': 0
        }

        res = client.table('prompts').insert([prompt_payload]).execute()
        if not res.data:
            return jsonify({'error': 'Failed to insert prompt'}), 400

        inserted = res.data[0]

        # Save prompt images if provided
        images = data.get('images', [])
        if images and isinstance(images, list):
            image_rows = []
            for idx, img in enumerate(images):
                img_url = img.get('imageUrl') or img.get('image_url')
                if img_url:
                    image_rows.append({
                        'prompt_id': inserted['id'],
                        'image_url': img_url,
                        'source': img.get('source', 'direct_url'),
                        'sort_order': img.get('sortOrder', idx),
                        'is_featured': img.get('isFeatured', idx == 0)
                    })
            if image_rows:
                client.table('prompt_images').insert(image_rows).execute()

        return jsonify({'prompt': inserted}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@prompt_bp.route('/<prompt_id>', methods=['PUT'])
def update_prompt(prompt_id):
    token = extract_token()
    if not token:
        return jsonify({'error': 'Authentication required'}), 401

    client = get_supabase_client(token)
    data = request.get_json() or {}

    try:
        existing = client.table('prompts').select('*').eq('id', prompt_id).execute()
        if not existing.data:
            return jsonify({'error': 'Prompt not found'}), 404

        orig_prompt = existing.data[0]
        title = data.get('title', orig_prompt.get('title'))
        slug = generate_unique_slug(title, data.get('slug') or orig_prompt.get('slug'))

        update_payload = {
            'title': title,
            'slug': slug,
            'description': data.get('description', orig_prompt.get('description')),
            'prompt': data.get('prompt', orig_prompt.get('prompt')),
            'category_id': data.get('category_id', orig_prompt.get('category_id')),
            'subcategory_id': data.get('subcategory_id', orig_prompt.get('subcategory_id')),
            'tags': data.get('tags', orig_prompt.get('tags')),
            'variables': data.get('variables', orig_prompt.get('variables')),
            'featured_image': data.get('featured_image', orig_prompt.get('featured_image')),
            'output_image': data.get('output_image', orig_prompt.get('output_image')),
            'seo_title': data.get('seo_title', orig_prompt.get('seo_title')),
            'seo_description': data.get('seo_description', orig_prompt.get('seo_description')),
            'status': data.get('status', 'pending') # Re-submits to pending if edited by team member
        }

        res = client.table('prompts').update(update_payload).eq('id', prompt_id).execute()
        return jsonify({'prompt': res.data[0] if res.data else orig_prompt})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@prompt_bp.route('/<prompt_id>/approve', methods=['PUT'])
def approve_prompt(prompt_id):
    token = extract_token()
    client = get_supabase_client(token)
    try:
        res = client.table('prompts').update({
            'status': 'published',
            'rejection_reason': None
        }).eq('id', prompt_id).execute()
        return jsonify({'prompt': res.data[0] if res.data else None})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@prompt_bp.route('/<prompt_id>/reject', methods=['PUT'])
def reject_prompt(prompt_id):
    token = extract_token()
    client = get_supabase_client(token)
    data = request.get_json() or {}
    reason = data.get('reason', '').strip()

    try:
        res = client.table('prompts').update({
            'status': 'rejected',
            'rejection_reason': reason
        }).eq('id', prompt_id).execute()
        return jsonify({'prompt': res.data[0] if res.data else None})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@prompt_bp.route('/<prompt_id>', methods=['DELETE'])
def delete_prompt(prompt_id):
    token = extract_token()
    client = get_supabase_client(token)
    try:
        client.table('prompt_images').delete().eq('prompt_id', prompt_id).execute()
        client.table('prompts').delete().eq('id', prompt_id).execute()
        return jsonify({'message': 'Prompt deleted successfully.'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@prompt_bp.route('/<prompt_id>/views', methods=['POST'])
def increment_views(prompt_id):
    try:
        res = supabase.table('prompts').select('views').eq('id', prompt_id).execute()
        if res.data:
            curr = res.data[0].get('views', 0)
            supabase.table('prompts').update({'views': curr + 1}).eq('id', prompt_id).execute()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@prompt_bp.route('/<prompt_id>/copies', methods=['POST'])
def increment_copies(prompt_id):
    try:
        res = supabase.table('prompts').select('copies').eq('id', prompt_id).execute()
        if res.data:
            curr = res.data[0].get('copies', 0)
            supabase.table('prompts').update({'copies': curr + 1}).eq('id', prompt_id).execute()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 400
