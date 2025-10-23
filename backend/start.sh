#!/bin/bash

# --- Paths ---
FRONTEND_DIR="$HOME/comfyqueue/frontend"
BACKEND_DIR="$HOME/comfyqueue/backend"

# --- Colors ---
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# --- Step 1: Kill any existing Flask instance ---
echo -e "${GREEN}🔪 Killing old Flask processes...${NC}"
pkill -f app.py >/dev/null 2>&1

echo "🔍 Killing old Flask servers on port 5000..."
sudo lsof -t -i :5000 | xargs -r kill -9


# --- Step 2: Build frontend ---
echo -e "${GREEN}⚙️ Building frontend...${NC}"
cd "$FRONTEND_DIR" || exit
rm -rf dist
npm run build

# --- Step 3: Start Flask backend ---
echo -e "${GREEN}🚀 Starting Flask backend...${NC}"
cd "$BACKEND_DIR" || exit
source ../venv/bin/activate
python app.py
