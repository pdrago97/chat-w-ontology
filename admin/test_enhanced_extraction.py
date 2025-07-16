#!/usr/bin/env python3
"""
Test enhanced AI extraction with comprehensive PDF content
"""

import os
import sys
import json

# Add current directory to path
sys.path.append(os.path.dirname(__file__))

def create_comprehensive_resume():
    """Create comprehensive resume content for testing"""
    return """
PEDRO REICHOW
Senior Software Engineer & AI Specialist
Email: pedroreichow3@gmail.com
LinkedIn: https://www.linkedin.com/in/pedroreichow
GitHub: https://github.com/pdrago97
Location: São Paulo, Brazil

PROFESSIONAL SUMMARY
Experienced software engineer with 6+ years in fintech, AI, and cloud technologies. 
Led development of high-performance trading platforms processing $50M+ daily transactions.
Expert in Python, React, and distributed systems architecture.

WORK EXPERIENCE

QI Tech | Senior Software Engineer | 2022 - 2024 | São Paulo, Brazil
• Led development of fintech platform serving 100,000+ users
• Implemented microservices architecture using Python, FastAPI, and Apache Kafka
• Built real-time trading system processing 10,000+ transactions per minute
• Technologies: Python, React, Apache Kafka, Redis, PostgreSQL, Docker, Kubernetes
• Achievements: Reduced system latency by 60%, increased throughput by 300%

Microsoft | Software Developer | 2020 - 2022 | Remote
• Developed Azure cloud services for enterprise clients
• Built scalable APIs serving 1M+ requests daily
• Implemented CI/CD pipelines reducing deployment time by 80%
• Technologies: C#, .NET Core, Azure, TypeScript, React, SQL Server
• Achievements: Led team of 5 developers, delivered 15+ major features

Startup XYZ | Full Stack Developer | 2019 - 2020 | São Paulo, Brazil
• Built MVP for e-commerce platform from scratch
• Implemented payment integration with multiple providers
• Technologies: Node.js, React, MongoDB, Stripe API
• Achievements: Platform reached 10,000+ users in first 6 months

EDUCATION

Universidade Federal do Rio Grande do Sul | Bachelor in Computer Science | 2015 - 2019
• GPA: 3.8/4.0
• Relevant Coursework: Data Structures, Algorithms, Machine Learning, Database Systems
• Thesis: "Machine Learning Applications in Financial Trading"
• Activities: Programming Competition Team (3rd place regional), Tech Club President

TECHNICAL SKILLS

Programming Languages: Python (Expert), JavaScript/TypeScript (Expert), C# (Advanced), 
Java (Intermediate), Go (Intermediate), Rust (Beginner)

Web Development: React, Next.js, Node.js, Express, FastAPI, Django, Flask, HTML5, CSS3

Cloud & DevOps: AWS (EC2, S3, Lambda, RDS), Azure (App Service, Functions, SQL Database), 
Docker, Kubernetes, Jenkins, GitHub Actions

Databases: PostgreSQL, MongoDB, Redis, SQL Server, DynamoDB

AI/ML: TensorFlow, PyTorch, Scikit-learn, Pandas, NumPy, Jupyter

Other: Apache Kafka, RabbitMQ, Elasticsearch, GraphQL, REST APIs, Microservices

PROJECTS

AI-Powered Trading Platform | 2023
• Built machine learning platform for algorithmic trading
• Implemented real-time market data processing and prediction models
• Technologies: Python, TensorFlow, Apache Kafka, PostgreSQL, Redis
• Impact: Generated 15% higher returns compared to traditional strategies

E-commerce Microservices Platform | 2022
• Designed and implemented scalable microservices architecture
• Built user management, product catalog, and payment services
• Technologies: Node.js, React, MongoDB, Docker, Kubernetes
• Impact: Handled 50,000+ concurrent users during peak traffic

Real-time Analytics Dashboard | 2021
• Created interactive dashboard for business intelligence
• Implemented real-time data streaming and visualization
• Technologies: React, D3.js, WebSockets, Python, PostgreSQL
• Impact: Reduced decision-making time by 40% for business teams

CERTIFICATIONS

AWS Solutions Architect Associate | Amazon Web Services | 2023
• Credential ID: AWS-SAA-123456
• Validation: aws.amazon.com/verification

Microsoft Azure Developer Associate | Microsoft | 2022
• Credential ID: MS-AZ-204-789012
• Validation: learn.microsoft.com/credentials

Google Cloud Professional Developer | Google Cloud | 2023
• Credential ID: GCP-PD-345678
• Validation: cloud.google.com/certification

LANGUAGES
• Portuguese: Native
• English: Fluent (C2)
• Spanish: Intermediate (B2)
• German: Basic (A2)

ACHIEVEMENTS & AWARDS
• Top Performer Award - QI Tech (2023, 2024)
• Innovation Award - Microsoft (2021)
• Hackathon Winner - FinTech Challenge São Paulo (2022)
• Open Source Contributor - 500+ GitHub contributions
• Technical Blog Writer - 50,000+ monthly readers

VOLUNTEER EXPERIENCE
Code for Brazil | Volunteer Developer | 2020 - Present
• Develop civic technology solutions for local communities
• Mentor junior developers in programming fundamentals
• Technologies: Python, React, PostgreSQL
"""

def test_enhanced_ai_extraction():
    """Test the enhanced AI extraction system"""
    print("🧪 Testing Enhanced AI Extraction...")
    
    try:
        from nodes import ProcessPDFsNode, GenerateFromPDFNode
        
        # Create mock uploaded file with comprehensive content
        class MockFile:
            def __init__(self, name, content):
                self.name = name
                self.content = content.encode('utf-8')
            
            def read(self):
                return self.content
        
        # Create comprehensive resume file
        mock_files = [MockFile("pedro_comprehensive_resume.pdf", create_comprehensive_resume())]
        
        # Test PDF processing
        shared = {"uploaded_files": mock_files}
        
        # Process PDFs
        pdf_processor = ProcessPDFsNode()
        result = pdf_processor.run(shared)
        
        if "pdf_contents" in shared:
            print(f"✅ Successfully processed PDF content ({len(shared['pdf_contents'][0]['content'])} characters)")
            
            # Test graph generation with AI
            pdf_generator = GenerateFromPDFNode()
            result = pdf_generator.run(shared)
            
            if "pdf_generated_graph" in shared:
                graph = shared["pdf_generated_graph"]
                nodes = graph.get('nodes', [])
                edges = graph.get('edges', [])
                
                print(f"✅ Generated comprehensive graph:")
                print(f"   📊 {len(nodes)} nodes")
                print(f"   🔗 {len(edges)} edges")
                
                # Analyze node types
                node_types = {}
                for node in nodes:
                    node_type = node.get('type', 'Unknown')
                    node_types[node_type] = node_types.get(node_type, 0) + 1
                
                print(f"   📋 Node breakdown:")
                for node_type, count in node_types.items():
                    print(f"      • {node_type}: {count}")
                
                # Show sample nodes
                print(f"   🔍 Sample nodes:")
                for i, node in enumerate(nodes[:5]):
                    node_id = node.get('id', 'Unknown')
                    node_type = node.get('type', 'Unknown')
                    print(f"      {i+1}. {node_id} ({node_type})")
                
                # Show sample edges
                print(f"   🔗 Sample relationships:")
                for i, edge in enumerate(edges[:5]):
                    source = edge.get('source', 'Unknown')
                    target = edge.get('target', 'Unknown')
                    relation = edge.get('relation', 'Unknown')
                    print(f"      {i+1}. {source} --{relation}--> {target}")
                
                # Save for inspection
                with open("test_generated_graph.json", "w") as f:
                    json.dump(graph, f, indent=2)
                print(f"   💾 Saved detailed graph to test_generated_graph.json")
                
                return True
            else:
                print("❌ Failed to generate graph from comprehensive PDF content")
                return False
        else:
            print("❌ Failed to process PDF files")
            return False
            
    except Exception as e:
        print(f"❌ Error in enhanced extraction test: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run enhanced extraction test"""
    print("🚀 Enhanced AI Extraction Test")
    print("=" * 60)
    
    # Check if API key is available
    if not os.environ.get("OPENAI_API_KEY"):
        print("❌ OPENAI_API_KEY environment variable not set")
        print("💡 Please set your OpenAI API key: export OPENAI_API_KEY='your-key-here'")
        return False
    
    success = test_enhanced_ai_extraction()
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 Enhanced AI extraction is working perfectly!")
        print("📈 The system can now extract comprehensive professional information")
        print("🔍 Check test_generated_graph.json for detailed results")
    else:
        print("⚠️ Enhanced AI extraction needs debugging")

if __name__ == "__main__":
    main()
