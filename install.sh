#!/bin/bash
# ==============================================
# Assessment Forge - Auto-Setup Script
# ==============================================

echo "🚀 Setting up Assessment Forge..."
echo "-----------------------------------"

# Helper Function: Install Homebrew if missing (Mac only)
install_brew_if_needed() {
    if [[ "$OSTYPE" == "darwin"* ]] && ! command -v brew &> /dev/null; then
        echo "🍺 Homebrew not found. Installing..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        
        # Add brew to path for this session
        eval "$(/opt/homebrew/bin/brew shellenv)" 2>/dev/null
        eval "$(/usr/local/bin/brew shellenv)" 2>/dev/null
    fi
}

# 1. Check & Install Node.js
if ! command -v node &> /dev/null; then
    echo "📦 Node.js not found. Attempting to install..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        install_brew_if_needed
        brew install node
    else
        echo "❌ Please install Node.js manually: https://nodejs.org"
        exit 1
    fi
fi

# 2. Check & Install Python 3
if ! command -v python3 &> /dev/null; then
    echo "🐍 Python 3 not found. Attempting to install..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        install_brew_if_needed
        brew install python
    else
        echo "❌ Please install Python 3 manually: https://python.org"
        exit 1
    fi
fi

# 3. Frontend Setup
echo ""
echo "📦 Installing Frontend Dependencies..."
npm install

# 4. Backend Setup
echo ""
echo "🐍 Setting up Python Virtual Environment..."
# Create venv if missing
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activate & Install
source venv/bin/activate
pip install -r requirements.txt

echo ""
echo "=============================================="
echo "✅ Setup Complete!"
echo "=============================================="
echo "To run the app, just type:"
echo "./start.sh"
echo ""
