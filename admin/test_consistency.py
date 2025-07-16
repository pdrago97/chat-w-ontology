#!/usr/bin/env python3
"""
Test the graph consistency system
"""

import json
from graph_utils import normalize_person_references, validate_graph_structure, save_graph_safely

def test_consistency():
    """Test that the consistency system works"""
    
    print("🧪 Testing Graph Consistency System")
    print("=" * 50)
    
    # Test case 1: Wrong person ID
    print("\n1️⃣ Testing person ID normalization...")
    
    test_graph = {
        "nodes": [
            {
                "id": "Pedro Drago Reichow",  # Wrong ID
                "type": "Person",
                "contact": {"email": "test@test.com"}
            },
            {
                "id": "QI Tech",
                "type": "Experience"
            }
        ],
        "edges": [
            {
                "source": "Pedro Reichow",  # Different ID in edge
                "target": "QI Tech",
                "relation": "WORKED_AT"
            }
        ]
    }
    
    print(f"Before: Person node ID = '{test_graph['nodes'][0]['id']}'")
    print(f"Before: Edge source = '{test_graph['edges'][0]['source']}'")
    
    # Normalize
    normalized = normalize_person_references(test_graph)
    
    print(f"After: Person node ID = '{normalized['nodes'][0]['id']}'")
    print(f"After: Edge source = '{normalized['edges'][0]['source']}'")
    
    if normalized['nodes'][0]['id'] == "Pedro Reichow" and normalized['edges'][0]['source'] == "Pedro Reichow":
        print("✅ Person ID normalization works!")
    else:
        print("❌ Person ID normalization failed!")
    
    # Test case 2: Validation
    print("\n2️⃣ Testing graph validation...")
    
    errors, warnings = validate_graph_structure(normalized)
    
    print(f"Errors: {len(errors)}")
    print(f"Warnings: {len(warnings)}")
    
    if len(errors) == 0:
        print("✅ Graph validation passed!")
    else:
        print("❌ Graph validation failed!")
        for error in errors:
            print(f"  • {error}")
    
    # Test case 3: Save and reload
    print("\n3️⃣ Testing save/reload consistency...")
    
    try:
        # Save the test graph
        warnings = save_graph_safely(normalized)
        print("✅ Graph saved successfully!")
        
        if warnings:
            print("Warnings during save:")
            for warning in warnings:
                print(f"  • {warning}")
        
        # Reload and check
        with open("../public/knowledge-graph.json", "r") as f:
            reloaded = json.load(f)
        
        # Check person ID is still correct
        person_node = None
        for node in reloaded["nodes"]:
            if node.get("type") == "Person":
                person_node = node
                break
        
        if person_node and person_node["id"] == "Pedro Reichow":
            print("✅ Reloaded graph maintains correct person ID!")
        else:
            print("❌ Reloaded graph has wrong person ID!")
            
    except Exception as e:
        print(f"❌ Save/reload test failed: {e}")
    
    print("\n🎯 Consistency System Test Complete!")

if __name__ == "__main__":
    test_consistency()
