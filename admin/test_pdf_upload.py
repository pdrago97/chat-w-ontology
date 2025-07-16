#!/usr/bin/env python3
"""
Test PDF upload functionality
"""

import os
import sys
import json
from io import BytesIO

# Add current directory to path
sys.path.append(os.path.dirname(__file__))

def create_sample_pdf_content():
    """Create sample PDF-like content for testing"""
    return """
Pedro Reichow
Software Engineer & AI Specialist

EXPERIENCE:
- QI Tech (2022-2024): Senior Software Engineer
  Technologies: Python, React, Apache Kafka, Redis, PostgreSQL
  Responsibilities: Led development of fintech platform, implemented microservices architecture

- Microsoft (2020-2022): Software Developer
  Technologies: C#, .NET, Azure, TypeScript
  Responsibilities: Developed cloud-based solutions, worked on Azure services

EDUCATION:
- Master's in Computer Science, MIT (2018-2020)
- Bachelor's in Software Engineering, Stanford (2014-2018)

SKILLS:
- Programming: Python, JavaScript, C#, Java, Go
- Frameworks: React, Node.js, Django, Flask, .NET
- Cloud: AWS, Azure, Google Cloud
- Databases: PostgreSQL, MongoDB, Redis
- AI/ML: TensorFlow, PyTorch, Scikit-learn

PROJECTS:
- AI-Powered Trading Platform: Built using Python and TensorFlow
- Microservices Architecture: Implemented with Docker and Kubernetes
- Real-time Analytics Dashboard: Created with React and WebSockets
"""

def test_pdf_processing():
    """Test the PDF processing functionality"""
    print("🧪 Testing PDF Processing...")
    
    try:
        from nodes import ProcessPDFsNode, GenerateFromPDFNode
        
        # Create mock uploaded file
        class MockFile:
            def __init__(self, name, content):
                self.name = name
                self.content = content.encode('utf-8')
            
            def read(self):
                return self.content
        
        # Create sample files
        mock_files = [
            MockFile("resume.pdf", create_sample_pdf_content()),
            MockFile("portfolio.pdf", "Additional portfolio information...")
        ]
        
        # Test PDF processing
        shared = {"uploaded_files": mock_files}
        
        # Process PDFs
        pdf_processor = ProcessPDFsNode()
        result = pdf_processor.run(shared)
        
        if "pdf_contents" in shared:
            print(f"✅ Successfully processed {len(shared['pdf_contents'])} PDF files")
            
            # Test graph generation
            pdf_generator = GenerateFromPDFNode()
            result = pdf_generator.run(shared)
            
            if "pdf_generated_graph" in shared:
                graph = shared["pdf_generated_graph"]
                print(f"✅ Generated graph with {len(graph.get('nodes', []))} nodes and {len(graph.get('edges', []))} edges")
                
                # Show some sample nodes
                for i, node in enumerate(graph.get('nodes', [])[:3]):
                    print(f"  Node {i+1}: {node.get('id', 'Unknown')} ({node.get('type', 'Unknown')})")
                
                return True
            else:
                print("❌ Failed to generate graph from PDF content")
                return False
        else:
            print("❌ Failed to process PDF files")
            return False
            
    except Exception as e:
        print(f"❌ Error in PDF processing test: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run PDF processing tests"""
    print("🚀 PDF Upload Functionality Test")
    print("=" * 50)
    
    # Check if API key is available
    if not os.environ.get("OPENAI_API_KEY"):
        print("❌ OPENAI_API_KEY environment variable not set")
        print("💡 Please set your OpenAI API key: export OPENAI_API_KEY='your-key-here'")
        return False
    
    success = test_pdf_processing()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 PDF upload functionality is working!")
        print("📝 You can now upload multiple PDF files in the Streamlit interface")
    else:
        print("⚠️ PDF upload functionality needs debugging")

if __name__ == "__main__":
    main()
