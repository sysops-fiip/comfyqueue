# backend/users.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User

users_bp = Blueprint("users", __name__, url_prefix="/api/users")

# --- Get all users ---
@users_bp.route("/", methods=["GET"])
@jwt_required()
def list_users():
    users = User.query.all()
    data = [{"id": u.id, "username": u.username, "role": u.role} for u in users]
    return jsonify(data), 200


# --- Create a new user ---
@users_bp.route("/", methods=["POST"])
@jwt_required()
def create_user():
    current_username = get_jwt_identity()
    current_user = User.query.filter_by(username=current_username).first()

    if not current_user or current_user.role != "admin":
        return jsonify({"msg": "Only admin can create users"}), 403

    data = request.get_json()
    if not data or "username" not in data or "password" not in data or "role" not in data:
        return jsonify({"msg": "Missing fields"}), 400

    if User.query.filter_by(username=data["username"]).first():
        return jsonify({"msg": "Username already exists"}), 400

    new_user = User(username=data["username"], role=data["role"])
    new_user.set_password(data["password"])
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"msg": "User created successfully"}), 201


# --- Edit (update) a user ---
@users_bp.route("/<int:user_id>", methods=["PUT"])
@jwt_required()
def update_user(user_id):
    current_username = get_jwt_identity()
    current_user = User.query.filter_by(username=current_username).first()

    if not current_user or current_user.role != "admin":
        return jsonify({"msg": "Only admin can update users"}), 403

    data = request.get_json()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    if "username" in data:
        user.username = data["username"]
    if "password" in data and data["password"]:
        user.set_password(data["password"])
    if "role" in data:
        user.role = data["role"]

    db.session.commit()
    return jsonify({"msg": "User updated successfully"}), 200


# --- Delete a user ---
@users_bp.route("/<int:user_id>", methods=["DELETE"])
@jwt_required()
def delete_user(user_id):
    current_username = get_jwt_identity()
    current_user = User.query.filter_by(username=current_username).first()

    if not current_user or current_user.role != "admin":
        return jsonify({"msg": "Only admin can delete users"}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    db.session.delete(user)
    db.session.commit()
    return jsonify({"msg": "User deleted successfully"}), 200
