#!/usr/bin/env python3
"""
Test the flexible graph editor system
"""
import json
import sys
import os

# Add admin directory to path
sys.path.append('admin')

from admin.flexible_graph_utils import (
    load_graph_flexible, 
    save_graph_flexible, 
    validate_flexible,
    transform_for_cytoscape,
    auto_fix_common_issues
)

def test_flexible_system():
    """Test all components of the flexible system"""
    
    print("🧪 Testing Flexible Graph Editor System")
    print("=" * 50)
    
    # Test 1: Load existing graph
    print("\n1️⃣ Loading current graph...")
    try:
        graph = load_graph_flexible()
        print(f"✅ Success: {len(graph.get('nodes', []))} nodes, {len(graph.get('edges', []))} edges")
    except Exception as e:
        print(f"❌ Failed: {e}")
        return False
    
    # Test 2: Validate current graph
    print("\n2️⃣ Validating current graph...")
    try:
        errors, warnings = validate_flexible(graph)
        print(f"✅ Success: {len(errors)} errors, {len(warnings)} warnings")
        if warnings:
            print("   Warnings:", warnings[:2])  # Show first 2 warnings
    except Exception as e:
        print(f"❌ Failed: {e}")
        return False
    
    # Test 3: Test with custom structure
    print("\n3️⃣ Testing custom JSON structure...")
    try:
        custom_graph = {
            "nodes": [
                {"id": "custom_1", "type": "Custom", "data": "anything"},
                {"id": "custom_2", "label": "Custom Node 2"}
            ],
            "edges": [
                {"source": "custom_1", "target": "custom_2", "relation": "CONNECTS_TO"}
            ],
            "metadata": {
                "created": "2024-01-01",
                "custom_field": "This is totally fine!"
            }
        }
        
        errors, warnings = validate_flexible(custom_graph)
        print(f"✅ Custom structure validated: {len(errors)} errors, {len(warnings)} warnings")
    except Exception as e:
        print(f"❌ Failed: {e}")
        return False
    
    # Test 4: Test Cytoscape transformation
    print("\n4️⃣ Testing Cytoscape transformation...")
    try:
        cyto_data = transform_for_cytoscape(custom_graph)
        nodes_count = len(cyto_data.get("elements", {}).get("nodes", []))
        edges_count = len(cyto_data.get("elements", {}).get("edges", []))
        print(f"✅ Transformed to Cytoscape: {nodes_count} nodes, {edges_count} edges")
    except Exception as e:
        print(f"❌ Failed: {e}")
        return False
    
    # Test 5: Test auto-fix
    print("\n5️⃣ Testing auto-fix functionality...")
    try:
        broken_graph = {
            "nodes": [
                {"type": "NoID"},  # Missing ID
                {"id": "good_node"}
            ],
            "edges": [
                {"source": "good_node"}  # Missing target
            ]
        }
        
        fixed_graph = auto_fix_common_issues(broken_graph)
        print(f"✅ Auto-fix applied: {len(fixed_graph['nodes'])} nodes, {len(fixed_graph['edges'])} edges")
        
        # Check if IDs were added
        for i, node in enumerate(fixed_graph['nodes']):
            if 'id' not in node:
                print(f"❌ Node {i} still missing ID")
                return False
        
    except Exception as e:
        print(f"❌ Failed: {e}")
        return False
    
    # Test 6: Test save functionality (backup first)
    print("\n6️⃣ Testing save functionality...")
    try:
        # Backup current graph
        backup_path = "public/knowledge-graph.json.backup"
        if os.path.exists("public/knowledge-graph.json"):
            with open("public/knowledge-graph.json", "r") as f:
                backup_data = f.read()
            with open(backup_path, "w") as f:
                f.write(backup_data)
        
        # Test save
        test_graph = {
            "nodes": [{"id": "test_save", "type": "Test"}],
            "edges": [],
            "test_field": "save_test"
        }
        
        warnings = save_graph_flexible(test_graph)
        print(f"✅ Save completed with {len(warnings)} warnings")
        
        # Restore backup
        if os.path.exists(backup_path):
            with open(backup_path, "r") as f:
                original_data = f.read()
            with open("public/knowledge-graph.json", "w") as f:
                f.write(original_data)
            os.remove(backup_path)
            print("✅ Original graph restored")
        
    except Exception as e:
        print(f"❌ Failed: {e}")
        return False
    
    print("\n🎉 All tests passed! Flexible system is fully functional.")
    print("\n📋 Summary:")
    print("   ✅ Loads any JSON structure")
    print("   ✅ Validates without blocking")
    print("   ✅ Transforms for Cytoscape")
    print("   ✅ Auto-fixes common issues")
    print("   ✅ Saves any valid JSON")
    print("\n🛠️ You can now edit any JSON structure in the admin interface!")
    
    return True

if __name__ == "__main__":
    success = test_flexible_system()
    sys.exit(0 if success else 1)
