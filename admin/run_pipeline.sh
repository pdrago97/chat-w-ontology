#!/bin/bash

# Simple launcher script for the Unified Graph Curation Pipeline
# This script loads environment variables and launches the pipeline

echo "🧠 Starting Unified Graph Curation Pipeline..."
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "unified_graph_pipeline.py" ]; then
    echo "❌ Error: unified_graph_pipeline.py not found"
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
echo "🚀 Launching pipeline on http://localhost:8511"
echo "   Press Ctrl+C to stop"
echo ""

# Launch the pipeline
streamlit run unified_graph_pipeline.py --server.port 8511
