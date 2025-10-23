# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

ComfyQueue is a distributed job queue management system for ComfyUI nodes. It consists of a Flask backend API and a React frontend that manages job distribution across multiple ComfyUI worker nodes.

## Architecture

### Backend (Flask + SQLite)
- **Entry point**: `backend/app.py`
- **Framework**: Flask with Flask-SocketIO for real-time updates
- **Database**: SQLite with Flask-SQLAlchemy ORM
  - `comfyqueue.db` - User/Node management (SQLAlchemy models)
  - `queue.db` - Job queue (raw SQL queries)
- **Authentication**: JWT-based auth via Flask-JWT-Extended
- **Structure**:
  - `app.py` - Main Flask app, job upload endpoint, static file serving for React SPA
  - `models.py` - SQLAlchemy models (User, Node)
  - `auth.py` - Login/auth endpoints (`/api/auth/*`)
  - `users.py` - User CRUD operations (`/api/users/*`)
  - `nodes.py` - Node management endpoints (`/api/nodes/*`)
  - `nano.py` - Additional node management utilities
  - `config.json` - Node configuration and settings

### Frontend (React + Vite)
- **Entry point**: `frontend/src/main.jsx`
- **Framework**: React 19 with React Router v7
- **Build tool**: Vite
- **UI Libraries**: Bootstrap 5, Tailwind CSS, Radix UI, Lucide React icons
- **State management**: LocalStorage for auth (token, role)
- **Real-time**: Socket.IO client for job updates
- **Structure**:
  - `App.jsx` - Main router with role-based route protection
  - `pages/` - Login, Dashboard, AdminDashboard, Settings
  - `components/` - Reusable UI components
  - `layouts/` - MainLayout wrapper
  - `api/axiosConfig.js` - Axios instance with JWT interceptors

### Role-Based Access
- **Admin users**: Can manage nodes, create/edit/delete users, full dashboard access
- **Editor users**: Can view dashboard, limited to non-admin operations
- JWT tokens contain user identity, role is stored in localStorage

### Job Processing Flow
1. Jobs uploaded to `/upload` endpoint → saved to `jobs/` directory
2. Job metadata inserted into `queue.db` with status "pending"
3. SocketIO emits `new_job` event to connected clients
4. Worker nodes poll for jobs and process them
5. Completed jobs moved to `completed/` directory
6. Logs stored in `logs/` directory

### Deployment Model
- Backend serves both API endpoints and the built React SPA
- `app.py` has SPA-aware routing: API routes pass through, all others fallback to `index.html`
- Frontend builds to `frontend/dist/`, Flask serves from there
- `start.sh` handles the complete deployment: kills old processes, builds frontend, starts Flask

## Development Commands

### Backend
```bash
cd backend
source venv/bin/activate  # Activate Python virtual environment
python app.py             # Start Flask server (default port: 5000, configured in config.json)
```

### Frontend
```bash
cd frontend
npm install              # Install dependencies
npm run dev             # Start Vite dev server (port 5173)
npm run build           # Build for production (outputs to dist/)
npm run lint            # Run ESLint
npm run preview         # Preview production build
```

### Full Stack Development
For development with hot reload:
1. Start backend: `cd backend && source venv/bin/activate && python app.py`
2. Start frontend: `cd frontend && npm run dev`
3. Frontend will proxy API requests to backend on port 5000

### Production Deployment
```bash
./backend/start.sh      # Automated: kills old processes, builds frontend, starts Flask
```

## Configuration

### Backend Configuration (`backend/config.json`)
- `nodes[]` - Array of ComfyUI worker nodes with URLs and enabled status
- `vram_threshold` - VRAM usage threshold (0.0-1.0)
- `api_port` - Flask server port
- `admin_key` - Admin access key (should be changed in production)
- `shared_dir` - Path to shared directory for job files

### Environment Variables
- Frontend expects `.env` file in `frontend/` directory (currently minimal)
- Backend JWT secret key is hardcoded in `app.py` - **should be changed for production**

## Database Initialization

The backend automatically creates necessary tables on startup:
- `User` and `Node` tables via SQLAlchemy migrations (app context)
- `jobs` table via raw SQL in `init_db()` function in `app.py`

First-time setup requires creating an admin user manually via database or a seed script.

## Key Technical Details

### Static File Serving
The Flask app uses a sophisticated routing strategy for SPA support:
- API routes (`/api/*`, `/upload`) handled by Flask
- Static assets (JS, CSS) served from `frontend/dist/`
- All other routes fallback to `index.html` for React Router client-side routing
- Debug endpoint `/__debug_static_root` shows static folder configuration

### Authentication Flow
1. User logs in via `/api/auth/login` with username/password
2. Backend validates against SQLAlchemy User model with bcrypt
3. JWT token returned and stored in `localStorage`
4. Axios interceptor (`axiosConfig.js`) adds `Authorization: Bearer <token>` header to all requests
5. Protected routes check JWT via `@jwt_required()` decorator

### WebSocket Events
- `new_job` - Emitted when a new job is uploaded
- All origins allowed (`cors_allowed_origins="*"`) - tighten for production

## Important Notes

- The project uses TWO separate SQLite databases by design
- Virtual environment is at `venv/` in project root
- Node modules are nested: both root-level and `frontend/node_modules/`
- `nano.py` appears to be a duplicate of `nodes.py` - verify which is canonical
- Admin key in `config.json` should be environment variable in production
- JWT secret key should be environment variable in production
