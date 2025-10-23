# backend/app.py
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO
from models import db, bcrypt
from auth import auth_bp
from users import users_bp
from nodes import nodes_bp
import os, json, sqlite3, time

# =====================================================
# --- Load config ---
# =====================================================
CONFIG = json.load(open("config.json"))
DB = os.path.join(os.path.dirname(__file__), "queue.db")

# =====================================================
# --- Create Flask app ---
# =====================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.abspath(os.path.join(BASE_DIR, "../frontend/dist"))
app = Flask(__name__, static_folder=DIST_DIR, static_url_path="/dist")


# =====================================================
# --- Config ---
# =====================================================
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///comfyqueue.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = "change-this-in-production"

# =====================================================
# --- Initialize extensions ---
# =====================================================
CORS(app)
db.init_app(app)
bcrypt.init_app(app)
jwt = JWTManager(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# =====================================================
# --- Register blueprints ---
# =====================================================
app.register_blueprint(auth_bp)
app.register_blueprint(users_bp)
app.register_blueprint(nodes_bp)

# =====================================================
# --- Ensure directories ---
# =====================================================
os.makedirs("../jobs", exist_ok=True)
os.makedirs("../completed", exist_ok=True)
os.makedirs("../logs", exist_ok=True)

# =====================================================
# --- Initialize database ---
# =====================================================
def init_db():
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS jobs(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT,
            status TEXT,
            node TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

init_db()

# =====================================================
# --- API route: upload ---
# =====================================================
@app.route("/upload", methods=["POST"])
def upload():
    file = request.files["file"]
    dest = os.path.join("../jobs", file.filename)
    file.save(dest)
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute("INSERT INTO jobs(filename,status,node) VALUES(?,?,?)",
              (file.filename, "pending", None))
    conn.commit()
    conn.close()
    socketio.emit("new_job", {"file": file.filename})
    return jsonify({"ok": True})

# =====================================================
# ✅ FRONTEND SERVING (SPA-safe with console tracing)
# =====================================================
from flask import send_from_directory

@app.before_request
def log_request_info():
    print(f"[REQ] {time.strftime('%H:%M:%S')} {request.method} {request.path}")

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react_app(path):
    """
    Serve React frontend for all non-API routes.
    Includes console tracing to verify fallback.
    """
    # --- Log every call for debug ---
    print(f"[ROUTE] Checking path='{path}'")

    # 1️⃣ If path starts with an API or asset route — let Flask handle it
    if path.startswith("api/") or path.startswith("upload"):
        print(f"[SKIP] '{path}' belongs to backend/api — returning 404 passthrough")
        return "Not Found", 404

    # 2️⃣ If it's an existing file (JS, CSS, image), serve directly
    full_path = os.path.join(app.static_folder, path)
    if os.path.exists(full_path) and not os.path.isdir(full_path):
        print(f"[STATIC] Serving existing static file: {full_path}")
        return send_from_directory(app.static_folder, path)

    # 3️⃣ Otherwise — fallback to React index.html
    print(f"[FALLBACK] No match. Serving index.html for React route -> {path}")
    return send_from_directory(app.static_folder, "index.html")

# =====================================================
# --- Debug endpoint to confirm static root ---
# =====================================================
@app.route("/__debug_static_root")
def __debug_static_root():
    return {
        "static_folder": os.path.abspath(app.static_folder),
        "exists": os.path.isdir(app.static_folder),
        "list_top": sorted(os.listdir(app.static_folder))[:20]
    }

# =====================================================
# --- Debug print of all routes ---
# =====================================================
print("Registered routes:")
for rule in app.url_map.iter_rules():
    print(" •", rule)

# =====================================================
# --- Run the app ---
# =====================================================
if __name__ == "__main__":
    print(f"Launching backend on port {CONFIG['api_port']}...")
    socketio.run(app, host="0.0.0.0", port=CONFIG["api_port"])
