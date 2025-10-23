from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Node, User

nodes_bp = Blueprint("nodes", __name__)

@nodes_bp.get("/api/nodes")
@jwt_required()
def list_nodes():
    nodes = Node.query.order_by(Node.name.asc()).all()
    return jsonify([{"id": n.id, "name": n.name, "url": n.url, "enabled": n.enabled} for n in nodes])

@nodes_bp.post("/api/nodes/toggle")
@jwt_required()
def toggle_node():
    current_username = get_jwt_identity()
    current_user = User.query.filter_by(username=current_username).first()

    if not current_user or current_user.role != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json(force=True)
    name = data.get("name")
    enabled = bool(data.get("enabled"))
    n = Node.query.filter_by(name=name).first()
    if not n:
        return jsonify({"error": "node not found"}), 404
    n.enabled = enabled
    db.session.commit()
    return jsonify({"message": "updated", "name": n.name, "enabled": n.enabled})

@nodes_bp.post("/api/nodes/add")
@jwt_required()
def add_node():
    current_username = get_jwt_identity()
    current_user = User.query.filter_by(username=current_username).first()

    if not current_user or current_user.role != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json(force=True)
    name = (data.get("name") or "").strip()
    url = (data.get("url") or "").strip()
    if not name or not url:
        return jsonify({"error": "name and url required"}), 400
    if Node.query.filter_by(name=name).first():
        return jsonify({"error": "node exists"}), 409

    n = Node(name=name, url=url, enabled=True)
    db.session.add(n)
    db.session.commit()
    return jsonify({"message": "node added", "id": n.id})

@nodes_bp.put("/api/nodes/<int:node_id>")
@jwt_required()
def update_node(node_id):
    current_username = get_jwt_identity()
    current_user = User.query.filter_by(username=current_username).first()

    if not current_user or current_user.role != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    node = Node.query.get(node_id)
    if not node:
        return jsonify({"error": "node not found"}), 404

    data = request.get_json(force=True)
    if "name" in data:
        node.name = data["name"].strip()
    if "url" in data:
        node.url = data["url"].strip()
    if "enabled" in data:
        node.enabled = bool(data["enabled"])

    db.session.commit()
    return jsonify({"message": "node updated", "id": node.id})

@nodes_bp.delete("/api/nodes/<int:node_id>")
@jwt_required()
def delete_node(node_id):
    current_username = get_jwt_identity()
    current_user = User.query.filter_by(username=current_username).first()

    if not current_user or current_user.role != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    node = Node.query.get(node_id)
    if not node:
        return jsonify({"error": "node not found"}), 404

    db.session.delete(node)
    db.session.commit()
    return jsonify({"message": "node deleted"})
