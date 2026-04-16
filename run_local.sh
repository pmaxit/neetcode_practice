#!/bin/bash

# NeetCode Practice App - Local Runner
# This script starts both the backend and frontend concurrently for local development.

# Exit on error
set -e

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "Shutting down servers and proxy..."
    # Kill the proxy if it was started
    if [ ! -z "$PROXY_PID" ]; then
        kill $PROXY_PID 2>/dev/null
    fi
    # Kill all other background jobs
    kill $(jobs -p) 2>/dev/null
    exit
}

# Trap Ctrl+C (SIGINT) and SIGTERM
trap cleanup SIGINT SIGTERM

echo "🚀 Starting NeetCode Practice App..."

# 1. Ensure .env exists
if [ ! -f .env ]; then
    echo "📝 .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "⚠️  Action Required: Please update .env with your local MySQL credentials."
fi

# 2. Load .env variables and install dependencies
if [ -f .env ]; then
    # Export variables so the script can use them (e.g. INSTANCE_CONNECTION_NAME)
    export $(grep -v '^#' .env | xargs)
fi

if [ ! -d node_modules ]; then
    echo "📦 Installing npm dependencies..."
    npm install
fi

# 3. Cloud SQL Connection
if [ ! -z "$INSTANCE_CONNECTION_NAME" ]; then
    echo "☁️ Starting Cloud SQL Auth Proxy..."
    if [ ! -f ./cloud-sql-proxy ]; then
        echo "❌ Error: ./cloud-sql-proxy executable not found."
        exit 1
    fi
    
    # Check if logged into gcloud
    if ! gcloud auth print-access-token > /dev/null 2>&1; then
        echo "🔑 Action Required: Please run 'gcloud auth login' and 'gcloud auth application-default login' first."
        exit 1
    fi

    # Start proxy in background
    ./cloud-sql-proxy --token $(gcloud auth print-access-token) "$INSTANCE_CONNECTION_NAME" &
    PROXY_PID=$!
    echo "✅ Proxy started with PID $PROXY_PID"
    
    # Wait a bit for proxy to initialize TCP listener
    sleep 3
fi

# 4. Starting Backend
echo "📡 Starting Express backend (Port 3001)..."
# Start backend in background
node server.js &

# Give the backend a moment to initialize (database connection etc.)
sleep 2

# 5. Starting Frontend
echo "💻 Starting Vite frontend..."
# Start frontend in foreground
npm run dev

# Wait for all processes (though npm run dev usually stays in foreground)
wait
