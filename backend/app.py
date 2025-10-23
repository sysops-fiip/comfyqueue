# backend/app.py
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from flask_socketio import SocketIO
from models import db, bcrypt
from auth import auth_bp
from users import users_bp
from nodes import nodes_bp
import comfyui_client
import os, json, sqlite3, time
from datetime import datetime

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
            user TEXT,
            workflow_data TEXT,
            comfyui_prompt_id TEXT,
            node_url TEXT,
            error_message TEXT,
            completed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # Migration: Add columns if they don't exist
    migrations = [
        "ALTER TABLE jobs ADD COLUMN user TEXT",
        "ALTER TABLE jobs ADD COLUMN workflow_data TEXT",
        "ALTER TABLE jobs ADD COLUMN comfyui_prompt_id TEXT",
        "ALTER TABLE jobs ADD COLUMN node_url TEXT",
        "ALTER TABLE jobs ADD COLUMN error_message TEXT",
        "ALTER TABLE jobs ADD COLUMN completed_at TIMESTAMP"
    ]
    for migration in migrations:
        try:
            c.execute(migration)
            conn.commit()
        except sqlite3.OperationalError:
            # Column already exists, ignore
            pass
    conn.commit()
    conn.close()

init_db()

# =====================================================
# --- API route: upload ---
# =====================================================
@app.route("/upload", methods=["POST"])
@jwt_required()
def upload():
    username = get_jwt_identity()

    try:
        # Get uploaded file
        file = request.files["file"]
        filename = file.filename

        # Read and parse workflow JSON
        workflow_content = file.read().decode('utf-8')
        workflow_json = json.loads(workflow_content)

        # Select available node
        node_result = comfyui_client.select_available_node()

        if not node_result:
            # No nodes available, queue the job
            conn = sqlite3.connect(DB)
            c = conn.cursor()
            c.execute("""
                INSERT INTO jobs(filename, status, node, user, workflow_data, node_url)
                VALUES(?, ?, ?, ?, ?, ?)
            """, (filename, "queued", None, username, workflow_content, None))
            job_id = c.lastrowid
            conn.commit()
            conn.close()

            socketio.emit("new_job", {
                "id": job_id,
                "file": filename,
                "user": username,
                "status": "queued"
            })
            return jsonify({"ok": True, "status": "queued", "message": "No nodes available, job queued"}), 202

        node, queue_size = node_result

        # Submit workflow to ComfyUI
        prompt_id = comfyui_client.submit_workflow_to_comfyui(node.url, workflow_json)

        if not prompt_id:
            # Submission failed, queue the job
            conn = sqlite3.connect(DB)
            c = conn.cursor()
            c.execute("""
                INSERT INTO jobs(filename, status, node, user, workflow_data, node_url, error_message)
                VALUES(?, ?, ?, ?, ?, ?, ?)
            """, (filename, "queued", node.name, username, workflow_content, node.url, "Initial submission failed"))
            job_id = c.lastrowid
            conn.commit()
            conn.close()

            socketio.emit("new_job", {
                "id": job_id,
                "file": filename,
                "user": username,
                "status": "queued",
                "error": "Submission failed"
            })
            return jsonify({"ok": False, "status": "queued", "message": "Failed to submit to node"}), 500

        # Successfully submitted
        conn = sqlite3.connect(DB)
        c = conn.cursor()
        c.execute("""
            INSERT INTO jobs(filename, status, node, user, workflow_data, comfyui_prompt_id, node_url)
            VALUES(?, ?, ?, ?, ?, ?, ?)
        """, (filename, "running", node.name, username, workflow_content, prompt_id, node.url))
        job_id = c.lastrowid
        conn.commit()
        conn.close()

        socketio.emit("new_job", {
            "id": job_id,
            "file": filename,
            "user": username,
            "status": "running",
            "node": node.name
        })

        return jsonify({
            "ok": True,
            "status": "running",
            "job_id": job_id,
            "node": node.name,
            "prompt_id": prompt_id
        })

    except json.JSONDecodeError as e:
        return jsonify({"ok": False, "error": "Invalid JSON workflow"}), 400
    except Exception as e:
        print(f"Upload error: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500

# =====================================================
# --- API route: get jobs ---
# =====================================================
@app.route("/api/jobs", methods=["GET"])
@jwt_required()
def get_jobs():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("""
        SELECT id, filename, status, node, user, created_at, completed_at, error_message, comfyui_prompt_id
        FROM jobs
        ORDER BY created_at DESC
    """)
    rows = c.fetchall()
    conn.close()
    jobs = [dict(row) for row in rows]
    return jsonify(jobs)

# =====================================================
# --- API route: get job results ---
# =====================================================
@app.route("/api/jobs/<int:job_id>/results", methods=["GET"])
@jwt_required()
def get_job_results(job_id):
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT comfyui_prompt_id, node_url, status FROM jobs WHERE id=?", (job_id,))
    job = c.fetchone()
    conn.close()

    if not job:
        return jsonify({"error": "Job not found"}), 404

    if job["status"] != "completed":
        return jsonify({"error": "Job not completed yet"}), 400

    if not job["comfyui_prompt_id"] or not job["node_url"]:
        return jsonify({"error": "No ComfyUI data available"}), 400

    results = comfyui_client.get_job_results(job["node_url"], job["comfyui_prompt_id"])
    return jsonify(results)

# =====================================================
# --- API route: retry failed job ---
# =====================================================
@app.route("/api/jobs/<int:job_id>/retry", methods=["POST"])
@jwt_required()
def retry_job(job_id):
    username = get_jwt_identity()
    from models import User
    user = User.query.filter_by(username=username).first()

    if not user or user.role != "admin":
        return jsonify({"error": "Admin access required"}), 403

    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT workflow_data, status FROM jobs WHERE id=?", (job_id,))
    job = c.fetchone()
    conn.close()

    if not job:
        return jsonify({"error": "Job not found"}), 404

    if job["status"] not in ["failed", "queued"]:
        return jsonify({"error": "Can only retry failed or queued jobs"}), 400

    if not job["workflow_data"]:
        return jsonify({"error": "No workflow data available"}), 400

    try:
        # Select node and submit
        node_result = comfyui_client.select_available_node()

        if not node_result:
            # No nodes available, requeue
            conn = sqlite3.connect(DB)
            c = conn.cursor()
            c.execute("UPDATE jobs SET status=?, error_message=NULL WHERE id=?", ("queued", job_id))
            conn.commit()
            conn.close()
            return jsonify({"ok": True, "status": "queued", "message": "No nodes available, job requeued"})

        node, _ = node_result
        workflow_json = json.loads(job["workflow_data"])
        prompt_id = comfyui_client.submit_workflow_to_comfyui(node.url, workflow_json)

        if not prompt_id:
            return jsonify({"ok": False, "error": "Failed to submit to node"}), 500

        # Update job
        conn = sqlite3.connect(DB)
        c = conn.cursor()
        c.execute("""
            UPDATE jobs
            SET status=?, node=?, node_url=?, comfyui_prompt_id=?, error_message=NULL
            WHERE id=?
        """, ("running", node.name, node.url, prompt_id, job_id))
        conn.commit()
        conn.close()

        socketio.emit("job_update", {
            "id": job_id,
            "status": "running",
            "node": node.name
        })

        return jsonify({"ok": True, "status": "running", "node": node.name, "prompt_id": prompt_id})

    except Exception as e:
        print(f"Retry error: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500

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
# --- Background Status Poller ---
# =====================================================
def poll_job_statuses():
    """Background task to poll ComfyUI nodes for job status updates"""
    import threading
    import time as time_module

    def poller():
        while True:
            try:
                with app.app_context():
                    conn = sqlite3.connect(DB)
                    conn.row_factory = sqlite3.Row
                    c = conn.cursor()

                    # Get all running or queued jobs
                    c.execute("""
                        SELECT id, filename, status, node, user, comfyui_prompt_id, node_url
                        FROM jobs
                        WHERE status IN ('running', 'submitted', 'queued')
                    """)
                    jobs = c.fetchall()
                    conn.close()

                    for job in jobs:
                        job_id = job["id"]
                        prompt_id = job["comfyui_prompt_id"]
                        node_url = job["node_url"]
                        current_status = job["status"]

                        # Handle queued jobs (try to submit to nodes)
                        if current_status == "queued":
                            try:
                                node_result = comfyui_client.select_available_node()
                                if node_result:
                                    node, _ = node_result

                                    # Get workflow data
                                    conn = sqlite3.connect(DB)
                                    c = conn.cursor()
                                    c.execute("SELECT workflow_data FROM jobs WHERE id=?", (job_id,))
                                    row = c.fetchone()
                                    conn.close()

                                    if row and row[0]:
                                        workflow_json = json.loads(row[0])
                                        new_prompt_id = comfyui_client.submit_workflow_to_comfyui(node.url, workflow_json)

                                        if new_prompt_id:
                                            # Successfully submitted
                                            conn = sqlite3.connect(DB)
                                            c = conn.cursor()
                                            c.execute("""
                                                UPDATE jobs
                                                SET status=?, node=?, node_url=?, comfyui_prompt_id=?, error_message=NULL
                                                WHERE id=?
                                            """, ("running", node.name, node.url, new_prompt_id, job_id))
                                            conn.commit()
                                            conn.close()

                                            socketio.emit("job_update", {
                                                "id": job_id,
                                                "status": "running",
                                                "node": node.name
                                            })
                            except Exception as e:
                                print(f"Error resubmitting queued job {job_id}: {e}")
                            continue

                        # Check status for running jobs
                        if prompt_id and node_url:
                            try:
                                result = comfyui_client.check_job_status(node_url, prompt_id)
                                new_status = result["status"]
                                error = result.get("error")

                                # Update if status changed
                                if new_status != current_status:
                                    conn = sqlite3.connect(DB)
                                    c = conn.cursor()

                                    if new_status == "completed":
                                        c.execute("""
                                            UPDATE jobs
                                            SET status=?, completed_at=?, error_message=NULL
                                            WHERE id=?
                                        """, ("completed", datetime.now(), job_id))
                                        print(f"Job {job_id} completed")

                                        socketio.emit("job_update", {
                                            "id": job_id,
                                            "status": "completed"
                                        })

                                    elif new_status == "failed":
                                        c.execute("""
                                            UPDATE jobs
                                            SET status=?, error_message=?
                                            WHERE id=?
                                        """, ("failed", error, job_id))
                                        print(f"Job {job_id} failed: {error}")

                                        socketio.emit("job_update", {
                                            "id": job_id,
                                            "status": "failed",
                                            "error": error
                                        })

                                    conn.commit()
                                    conn.close()

                            except Exception as e:
                                print(f"Error checking status for job {job_id}: {e}")

            except Exception as e:
                print(f"Error in status poller: {e}")

            # Poll every 10 seconds
            time_module.sleep(10)

    # Start poller in background thread
    thread = threading.Thread(target=poller, daemon=True)
    thread.start()
    print("Background status poller started")


# =====================================================
# --- Run the app ---
# =====================================================
if __name__ == "__main__":
    print(f"Launching backend on port {CONFIG['api_port']}...")

    # Start background poller
    poll_job_statuses()

    socketio.run(app, host="0.0.0.0", port=CONFIG["api_port"])
