#!/usr/bin/env python3
"""
Launch Script for Unified Graph Curation Pipeline
Simple launcher that starts the pipeline interface
"""
import subprocess
import sys
import os
import webbrowser
import time
from pathlib import Path

def check_dependencies():
    """Check if required dependencies are installed"""
    required_packages = [
        "streamlit",
        "langextract", 
        "PyPDF2",
        "openai"
    ]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing.append(package)
    
    if missing:
        print("❌ Missing required packages:")
        for pkg in missing:
            print(f"   • {pkg}")
        print("\n💡 Install with:")
        print(f"   pip install {' '.join(missing)}")
        return False
    
    return True

def check_environment():
    """Check if environment is properly configured"""
    issues = []
    
    # Check for OpenAI API key
    if not os.getenv("OPENAI_API_KEY"):
        issues.append("OPENAI_API_KEY environment variable not set")
    
    # Check if we're in the right directory
    if not Path("unified_graph_pipeline.py").exists():
        issues.append("unified_graph_pipeline.py not found - run from admin/ directory")
    
    # Check if knowledge graph exists
    if not Path("../public/knowledge-graph.json").exists():
        issues.append("knowledge-graph.json not found in public/ directory")
    
    if issues:
        print("⚠️ Environment issues:")
        for issue in issues:
            print(f"   • {issue}")
        print()
        return False
    
    return True

def launch_pipeline(port=8511, auto_open=True):
    """Launch the unified pipeline interface"""
    print("🚀 Launching Unified Graph Curation Pipeline...")
    print(f"   Port: {port}")
    print(f"   URL: http://localhost:{port}")
    print()

    # Check if we're in a virtual environment
    venv_python = Path("../venv/bin/python")
    if venv_python.exists():
        python_cmd = str(venv_python.absolute())
        print(f"   Using virtual environment: {python_cmd}")
    else:
        python_cmd = sys.executable
        print(f"   Using system Python: {python_cmd}")

    # Build command
    cmd = [
        python_cmd, "-m", "streamlit", "run",
        "unified_graph_pipeline.py",
        "--server.port", str(port),
        "--server.headless", "false" if auto_open else "true"
    ]
    
    try:
        # Start the process
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1
        )
        
        # Wait a moment for startup
        time.sleep(3)
        
        # Open browser if requested
        if auto_open:
            webbrowser.open(f"http://localhost:{port}")
        
        print("✅ Pipeline launched successfully!")
        print("   Press Ctrl+C to stop")
        print()
        
        # Stream output
        try:
            for line in process.stdout:
                print(line.strip())
        except KeyboardInterrupt:
            print("\n🛑 Stopping pipeline...")
            process.terminate()
            process.wait()
            print("✅ Pipeline stopped")
        
    except Exception as e:
        print(f"❌ Failed to launch pipeline: {e}")
        return False
    
    return True

def main():
    """Main launcher function"""
    print("🧠 Unified Graph Curation Pipeline Launcher")
    print("=" * 50)
    
    # Check dependencies
    print("🔍 Checking dependencies...")
    if not check_dependencies():
        sys.exit(1)
    print("✅ Dependencies OK")
    
    # Check environment
    print("🔍 Checking environment...")
    if not check_environment():
        print("💡 Fix the issues above and try again")
        sys.exit(1)
    print("✅ Environment OK")
    
    # Parse command line arguments
    port = 8511
    auto_open = True
    
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"❌ Invalid port: {sys.argv[1]}")
            sys.exit(1)
    
    if "--no-browser" in sys.argv:
        auto_open = False
    
    # Launch pipeline
    print()
    success = launch_pipeline(port=port, auto_open=auto_open)
    
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()
