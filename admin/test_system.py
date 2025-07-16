#!/usr/bin/env python3
"""
Simple test script to verify PocketFlow integration is working
"""

import json
import os
import sys

# Add current directory to path
sys.path.append(os.path.dirname(__file__))

from flow import process_user_input
from nodes import GenerateFromPDFNode

def test_conversation_processing():
    """Test conversation-based graph updates"""
    print("🧪 Testing conversation processing...")
    
    # Load current graph
    try:
        with open("../public/knowledge-graph.json", "r") as f:
            current_graph = json.load(f)
        print(f"✅ Loaded current graph with {len(current_graph.get('nodes', []))} nodes")
    except FileNotFoundError:
        current_graph = {"nodes": [], "edges": []}
        print("⚠️ No existing graph found, starting with empty graph")
    
    # Test conversation processing
    test_message = "I worked at TestCorp as a Senior Developer from 2023-2024 using Python and React"
    
    try:
        updated_graph, extracted_info = process_user_input(test_message, current_graph)
        
        if extracted_info.get("action") != "none":
            print(f"✅ Successfully processed: {extracted_info.get('action')} {extracted_info.get('category')}")
            print(f"📊 Updated graph has {len(updated_graph.get('nodes', []))} nodes")
            return True
        else:
            print(f"⚠️ No action detected: {extracted_info.get('message', 'Unknown')}")
            return False
            
    except Exception as e:
        print(f"❌ Error processing conversation: {e}")
        return False

def test_pdf_generation():
    """Test PDF-based graph generation"""
    print("\n🧪 Testing PDF generation...")
    
    try:
        pdf_node = GenerateFromPDFNode()
        shared = {}
        
        # Run PDF processing
        result = pdf_node.run(shared)
        
        if "pdf_generated_graph" in shared:
            graph = shared["pdf_generated_graph"]
            print(f"✅ Generated graph with {len(graph.get('nodes', []))} nodes")
            return True
        elif "pdf_graph_error" in shared:
            print(f"⚠️ PDF generation error: {shared['pdf_graph_error']}")
            return False
        else:
            print("⚠️ PDF generation completed but no graph generated")
            return False
            
    except Exception as e:
        print(f"❌ Error in PDF generation: {e}")
        return False

def test_graph_validation():
    """Test graph file operations"""
    print("\n🧪 Testing graph file operations...")
    
    test_graph = {
        "nodes": [
            {
                "id": "Pedro Reichow",
                "type": "Person",
                "contact": {
                    "email": "test@example.com"
                }
            },
            {
                "id": "Test Company",
                "type": "Experience",
                "title": "Test Role"
            }
        ],
        "edges": [
            {
                "source": "Pedro Reichow",
                "target": "Test Company",
                "relation": "WORKED_AT"
            }
        ]
    }
    
    try:
        # Test saving
        with open("../public/knowledge-graph.json", "w") as f:
            json.dump(test_graph, f, indent=2)
        
        # Test loading
        with open("../public/knowledge-graph.json", "r") as f:
            loaded_graph = json.load(f)
        
        if loaded_graph == test_graph:
            print("✅ Graph file operations working correctly")
            return True
        else:
            print("❌ Graph file operations failed - data mismatch")
            return False
            
    except Exception as e:
        print(f"❌ Error in graph file operations: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 PocketFlow Integration Test Suite")
    print("=" * 50)
    
    results = []
    
    # Run tests
    results.append(("Graph File Operations", test_graph_validation()))
    results.append(("Conversation Processing", test_conversation_processing()))
    results.append(("PDF Generation", test_pdf_generation()))
    
    # Summary
    print("\n" + "=" * 50)
    print("📋 Test Results Summary:")
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status} {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("🎉 All systems operational! PocketFlow integration is working correctly.")
    else:
        print("⚠️ Some issues detected. Check the logs above for details.")

if __name__ == "__main__":
    main()
