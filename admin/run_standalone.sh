#!/bin/bash

# Launcher for Standalone Graph Curation Pipeline
# No dependencies on pocketflow or other complex systems

echo "🧠 Starting Standalone Graph Curation Pipeline..."
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "standalone_pipeline.py" ]; then
    echo "❌ Error: standalone_pipeline.py not found"
    echo "   Please run this script from the admin/ directory"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "../venv" ]; then
    echo "❌ Error: Virtual environment not found"
    echo "   Please create it with: python3 -m venv ../venv"
    exit 1
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source ../venv/bin/activate

# Load environment variables from .env file
if [ -f "../.env" ]; then
    echo "🔧 Loading environment variables..."
    export $(grep -v '^#' ../.env | xargs)
else
    echo "⚠️  Warning: .env file not found"
fi

# Check if OpenAI API key is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY not set"
    echo "   Please add your OpenAI API key to ../.env"
    exit 1
fi

echo "✅ Environment ready"
echo "🚀 Launching standalone pipeline on http://localhost:8512"
echo "   Press Ctrl+C to stop"
echo ""

# Launch the standalone pipeline on a different port
streamlit run standalone_pipeline.py --server.port 8512
