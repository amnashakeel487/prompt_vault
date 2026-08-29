import os
from flask import Flask, jsonify
from flask_cors import CORS

from routes.auth_routes import auth_bp
from routes.prompt_routes import prompt_bp
from routes.category_routes import category_bp
from routes.team_routes import team_bp
from routes.favorite_routes import favorite_bp

app = Flask(__name__)
# Enable CORS for all routes (React frontend on localhost or custom domain)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Register blueprints under /api prefix
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(prompt_bp, url_prefix='/api/prompts')
app.register_blueprint(category_bp, url_prefix='/api/categories')
app.register_blueprint(team_bp, url_prefix='/api/team')
app.register_blueprint(favorite_bp, url_prefix='/api/favorites')

@app.route('/')
def index():
    return jsonify({
        'name': 'PromptVault Python Flask API',
        'status': 'online',
        'version': '1.0.0'
    })

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting Flask server on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=True)
