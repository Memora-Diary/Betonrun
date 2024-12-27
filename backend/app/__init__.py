from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app)  # Enable CORS for all routes
    
    # Load config from environment variables
    app.config.from_object('app.config.Config')
    
    # Register blueprints
    from app.routes import auth, contests
    app.register_blueprint(auth.bp)
    app.register_blueprint(contests.bp)
    
    return app 