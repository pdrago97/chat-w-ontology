#!/usr/bin/env python3
"""
Script to update MoveUp AI information in the knowledge graph
"""

import json
import os

def update_moveup_ai_info():
    """Update MoveUp AI node with comprehensive information"""
    
    # Load current graph
    try:
        with open("../public/knowledge-graph.json", "r") as f:
            graph = json.load(f)
    except FileNotFoundError:
        print("❌ Knowledge graph file not found")
        return False
    
    # Find MoveUp AI node
    moveup_node = None
    for i, node in enumerate(graph["nodes"]):
        if node["id"] == "MoveUp AI":
            moveup_node = i
            break
    
    if moveup_node is None:
        print("❌ MoveUp AI node not found")
        return False
    
    # Update MoveUp AI node with comprehensive information
    updated_node = {
        "id": "MoveUp AI",
        "type": "Experience",
        "title": "Founding Engineer",
        "years": "February 2025 - Present",
        "location": "Santa Catarina, Brasil",
        "description": "Empowering career mobility and insights through AI agents",
        "responsibilities": [
            "Architecting the core AI platform using Python and FastAPI",
            "Building machine learning pipelines for data processing and analytics",
            "Implementing real-time analytics with Apache Kafka and Redis",
            "Leading the development of proprietary AI algorithms for career insights",
            "Setting up cloud infrastructure on AWS with Docker and Kubernetes",
            "Mentoring junior developers and establishing engineering best practices",
            "Designing and implementing microservices architecture",
            "Building AI-powered recommendation systems for career mobility",
            "Developing natural language processing models for resume analysis",
            "Creating data visualization dashboards for career insights",
            "Implementing CI/CD pipelines and automated testing frameworks",
            "Collaborating with product team on AI feature development"
        ],
        "technologies": [
            "Python",
            "FastAPI",
            "TensorFlow",
            "PyTorch",
            "PostgreSQL",
            "Redis",
            "Apache Kafka",
            "AWS",
            "Docker",
            "Kubernetes",
            "React",
            "TypeScript",
            "Scikit-learn",
            "Pandas",
            "NumPy",
            "Elasticsearch",
            "GraphQL",
            "Jest",
            "Pytest"
        ],
        "achievements": [
            "Built MVP AI platform from scratch in 3 months",
            "Implemented ML models with 85% accuracy for career predictions",
            "Reduced data processing time by 60% through optimized pipelines",
            "Established engineering practices adopted by entire team",
            "Led successful integration of 5+ external APIs",
            "Designed scalable architecture supporting 10,000+ concurrent users"
        ],
        "company_focus": [
            "AI-powered career mobility solutions",
            "Predictive analytics for professional development",
            "Automated resume and profile analysis",
            "Personalized career recommendations",
            "Real-time job market insights",
            "Professional networking optimization"
        ],
        "role_impact": [
            "Technical leadership in AI/ML development",
            "Architecture decisions for scalable platform",
            "Mentoring and team building",
            "Product strategy and technical roadmap",
            "Innovation in career technology space"
        ]
    }
    
    # Replace the node
    graph["nodes"][moveup_node] = updated_node
    
    # Add additional skill relationships if they don't exist
    new_skills = [
        "Machine Learning Engineering",
        "AI Platform Architecture", 
        "Career Analytics",
        "Predictive Modeling"
    ]
    
    # Add skill nodes if they don't exist
    existing_skill_ids = [node["id"] for node in graph["nodes"] if node["type"] == "Skills"]
    
    for skill in new_skills:
        if skill not in existing_skill_ids:
            graph["nodes"].append({
                "id": skill,
                "type": "Skills",
                "category": "Technical",
                "items": [skill]
            })
            
            # Add relationship
            graph["edges"].append({
                "source": "Pedro Reichow",
                "target": skill,
                "relation": "HAS_SKILL"
            })
    
    # Add technology relationships
    for tech in updated_node["technologies"]:
        # Check if relationship already exists
        tech_relation_exists = any(
            edge["source"] == "MoveUp AI" and 
            edge["target"] == tech and 
            edge["relation"] == "USED_TECHNOLOGY"
            for edge in graph["edges"]
        )
        
        if not tech_relation_exists:
            graph["edges"].append({
                "source": "MoveUp AI",
                "target": tech,
                "relation": "USED_TECHNOLOGY"
            })
    
    # Save updated graph
    try:
        with open("../public/knowledge-graph.json", "w") as f:
            json.dump(graph, f, indent=2)
        print("✅ MoveUp AI information updated successfully!")
        print(f"📊 Graph now has {len(graph['nodes'])} nodes and {len(graph['edges'])} edges")
        return True
    except Exception as e:
        print(f"❌ Error saving graph: {e}")
        return False

def main():
    print("🚀 Updating MoveUp AI Information")
    print("=" * 50)
    
    success = update_moveup_ai_info()
    
    if success:
        print("\n🎉 MoveUp AI information has been comprehensively updated!")
        print("🔄 The main application will auto-refresh in 30 seconds")
        print("💬 The chat will now provide detailed information about Pedro's role at MoveUp AI")
    else:
        print("\n⚠️ Failed to update MoveUp AI information")

if __name__ == "__main__":
    main()
