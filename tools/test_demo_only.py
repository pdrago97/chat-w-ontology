#!/usr/bin/env python3
"""
Test script for demo knowledge graph functionality only
"""
import os
import sys
from typing import List, Dict, Any

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from cognee_service import TextDoc, create_demo_graph

def test_demo_graph():
    """Test the demo graph creation without Cognee"""
    
    # Sample documents about Pedro's experience
    sample_docs = [
        TextDoc(
            id="doc1",
            text="""Pedro Drago Reichow is a Senior Solutions Consultant at Capgemini Brasil, 
            specializing in artificial intelligence and data engineering. He has extensive experience 
            in computer vision, large language models, and building scalable data pipelines. 
            Pedro has worked with technologies like Python, FastAPI, and cloud platforms.""",
            metadata={"source": "resume", "type": "professional_summary"}
        ),
        TextDoc(
            id="doc2", 
            text="""At MoveUp AI, Pedro served as a Founding Engineer and Technical Co-founder, 
            where he built an AI-powered workforce intelligence platform. The platform integrated 
            with Slack and created intelligent agents for workflow optimization. Pedro led the 
            technical development and architecture decisions.""",
            metadata={"source": "experience", "type": "work_history"}
        ),
        TextDoc(
            id="doc3",
            text="""Pedro's technical skills include Python programming, machine learning, 
            computer vision, natural language processing, FastAPI, Flask, Docker, Kubernetes, 
            AWS, and various database technologies. He has experience with both SQL and NoSQL 
            databases, and has built high-performance microservices.""",
            metadata={"source": "skills", "type": "technical_skills"}
        )
    ]
    
    print("Testing demo knowledge graph creation...")
    print(f"Processing {len(sample_docs)} documents...")
    
    try:
        result = create_demo_graph(sample_docs)
        
        print("\n=== DEMO GRAPH RESULTS ===")
        print(f"Nodes: {len(result.get('nodes', []))}")
        print(f"Edges: {len(result.get('edges', []))}")
        
        # Print sample nodes
        nodes = result.get('nodes', [])
        if nodes:
            print("\n=== NODES ===")
            for i, node in enumerate(nodes):
                print(f"{i+1}. {node.get('title', 'Unknown')} ({node.get('type', 'Unknown')})")
                print(f"   ID: {node.get('id', 'N/A')}")
        
        # Print sample edges
        edges = result.get('edges', [])
        if edges:
            print("\n=== EDGES ===")
            for i, edge in enumerate(edges):
                print(f"{i+1}. {edge.get('source', 'Unknown')} -> {edge.get('target', 'Unknown')}")
                print(f"   Relation: {edge.get('relation', 'Unknown')}")
        
        # Print metadata
        metadata = result.get('metadata', {})
        if metadata:
            print("\n=== METADATA ===")
            for key, value in metadata.items():
                print(f"{key}: {value}")
        
        print("\n✅ Demo graph creation test completed successfully!")
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_demo_graph()
    sys.exit(0 if success else 1)
