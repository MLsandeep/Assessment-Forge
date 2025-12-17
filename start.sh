#!/bin/bash
# ==============================================
# Assessment Forge - Start Script
# ==============================================

# Activate Virtual Environment for Python
if [ -d "venv" ]; then
    source venv/bin/activate
elif [ -d ".venv" ]; then
    source .venv/bin/activate
else
    echo "⚠️  Warning: No virtual environment found. Python backend might fail."
fi

echo "🚀 Starting Assessment Forge..."
echo "================================="

# Start RAG Backend in background
echo "🔧 Starting RAG Backend (Port 8000)..."
python rag_server.py &
RAG_PID=$!

# Wait for backend
sleep 3

# Start Frontend
echo "🌐 Starting Frontend (Port 3000)..."
npm run dev &
FRONTEND_PID=$!

# Handle shutdown
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    kill $RAG_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

echo ""
echo "📝 Press Ctrl+C to stop"
echo ""

wait
