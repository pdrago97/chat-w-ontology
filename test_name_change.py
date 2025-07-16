#!/usr/bin/env python3
"""
Test that changing Pedro Reichow to Pedro Drago Reichow works
"""
import json
import sys
import os

# Add admin directory to path
sys.path.append('admin')

from admin.flexible_graph_utils import load_graph_flexible, save_graph_flexible

def test_name_change():
    """Test changing Pedro's name in the graph"""
    
    print("🧪 Testing Name Change: Pedro Reichow → Pedro Drago Reichow")
    print("=" * 60)
    
    # Load current graph
    print("\n1️⃣ Loading current graph...")
    graph = load_graph_flexible()
    print(f"✅ Loaded: {len(graph.get('nodes', []))} nodes, {len(graph.get('edges', []))} edges")
    
    # Find Pedro node
    pedro_node = None
    for node in graph.get('nodes', []):
        if 'Pedro' in str(node.get('id', '')):
            pedro_node = node
            break
    
    if not pedro_node:
        print("❌ Pedro node not found!")
        return False
    
    print(f"📍 Found Pedro node: {pedro_node.get('id')}")
    
    # Change name
    old_id = pedro_node['id']
    new_id = "Pedro Drago Reichow"
    
    print(f"\n2️⃣ Changing name: '{old_id}' → '{new_id}'")
    
    # Update node ID
    pedro_node['id'] = new_id
    
    # Update any edges that reference the old ID
    edges_updated = 0
    for edge in graph.get('edges', []):
        if edge.get('source') == old_id:
            edge['source'] = new_id
            edges_updated += 1
        if edge.get('target') == old_id:
            edge['target'] = new_id
            edges_updated += 1
    
    print(f"✅ Updated {edges_updated} edge references")
    
    # Save the updated graph
    print("\n3️⃣ Saving updated graph...")
    warnings = save_graph_flexible(graph)
    
    if warnings:
        print(f"⚠️ Warnings: {warnings}")
    else:
        print("✅ Saved successfully with no warnings!")
    
    # Verify the change
    print("\n4️⃣ Verifying the change...")
    reloaded_graph = load_graph_flexible()
    
    # Check if new name exists
    found_new_name = False
    for node in reloaded_graph.get('nodes', []):
        if node.get('id') == new_id:
            found_new_name = True
            break
    
    if found_new_name:
        print(f"✅ Successfully changed name to: {new_id}")
    else:
        print(f"❌ Failed to find new name: {new_id}")
        return False
    
    # Check edge consistency
    node_ids = {node.get('id') for node in reloaded_graph.get('nodes', [])}
    broken_edges = []
    
    for edge in reloaded_graph.get('edges', []):
        source = edge.get('source')
        target = edge.get('target')
        if source not in node_ids:
            broken_edges.append(f"Source '{source}' not found")
        if target not in node_ids:
            broken_edges.append(f"Target '{target}' not found")
    
    if broken_edges:
        print(f"❌ Found {len(broken_edges)} broken edges:")
        for error in broken_edges[:3]:  # Show first 3
            print(f"   • {error}")
        return False
    else:
        print("✅ All edges are consistent!")
    
    print("\n🎉 Name change test passed!")
    print(f"   • Node ID updated: '{old_id}' → '{new_id}'")
    print(f"   • {edges_updated} edges updated")
    print(f"   • Graph remains consistent")
    print("\n🖥️ The main app should now display the graph without errors!")
    
    return True

if __name__ == "__main__":
    success = test_name_change()
    sys.exit(0 if success else 1)
