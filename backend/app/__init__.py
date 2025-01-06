from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app)  # Enable CORS for all routes
    
    # Load config from environment variables
    app.config.from_object('app.config.Config')
    
    # Register blueprints
    from .routes.auth import bp as auth_bp
    from .routes.contests import bp as contests_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(contests_bp)
    
    return app 