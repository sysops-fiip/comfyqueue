# backend/auth.py

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, create_access_token
from models import User, db, bcrypt

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

# --- LOGIN ROUTE ---
@auth_bp.route("/login", methods=["POST"])
def login():
    print("LOGIN route hit")  # 👈 add this line
    data = request.get_json()
    print("DATA:", data)

    if not data or "username" not in data or "password" not in data:
        return jsonify({"msg": "Missing username or password"}), 400

    user = User.query.filter_by(username=data["username"]).first()
    if user and user.check_password(data["password"]):
        token = create_access_token(identity=user.username)
        print("LOGIN SUCCESS for:", user.username)
        return jsonify(access_token=token, role=user.role)

    print("LOGIN FAILED")
    return jsonify({"msg": "Invalid username or password"}), 401



# --- GET CURRENT USER (optional helper) ---
@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"msg": "User not found"}), 404
    return jsonify({"username": user.username, "role": user.role})
