"""
Centralized utilities for maintaining graph consistency
"""
import json
import os

# Core node IDs that must remain consistent
CORE_NODE_IDS = {
    "person": "Pedro Reichow",  # Main person node - NEVER change this
    "person_aliases": ["Pedro Drago Reichow", "Pedro", "Pedro Reichow", "Pedro Drago"]
}

def normalize_person_references(graph_data):
    """
    Ensure all person references use the canonical ID
    """
    canonical_person_id = CORE_NODE_IDS["person"]
    
    # Fix person node ID
    for node in graph_data.get("nodes", []):
        if node.get("type") == "Person":
            # Check if this is a person node with any alias
            node_id = node.get("id", "")
            if any(alias.lower() in node_id.lower() for alias in CORE_NODE_IDS["person_aliases"]):
                node["id"] = canonical_person_id
                break
    
    # Fix all edge references
    for edge in graph_data.get("edges", []):
        # Fix source references
        if any(alias.lower() in edge.get("source", "").lower() for alias in CORE_NODE_IDS["person_aliases"]):
            edge["source"] = canonical_person_id
            
        # Fix target references  
        if any(alias.lower() in edge.get("target", "").lower() for alias in CORE_NODE_IDS["person_aliases"]):
            edge["target"] = canonical_person_id
    
    return graph_data

def validate_graph_structure(graph_data):
    """
    Validate that graph has proper structure and relationships
    """
    errors = []
    warnings = []
    
    # Check basic structure
    if "nodes" not in graph_data:
        errors.append("Graph must have 'nodes' array")
    if "edges" not in graph_data:
        errors.append("Graph must have 'edges' array")
        
    if errors:
        return errors, warnings
    
    nodes = graph_data["nodes"]
    edges = graph_data["edges"]
    
    # Check for person node
    person_nodes = [n for n in nodes if n.get("type") == "Person"]
    if not person_nodes:
        errors.append("Graph must contain at least one Person node")
    elif len(person_nodes) > 1:
        warnings.append(f"Found {len(person_nodes)} Person nodes, expected 1")
    
    # Check node IDs are unique
    node_ids = [n.get("id") for n in nodes]
    duplicates = set([x for x in node_ids if node_ids.count(x) > 1])
    if duplicates:
        errors.append(f"Duplicate node IDs found: {list(duplicates)}")
    
    # Check edge references
    node_id_set = set(node_ids)
    orphaned_edges = []
    
    for i, edge in enumerate(edges):
        source = edge.get("source")
        target = edge.get("target")
        
        if source not in node_id_set:
            orphaned_edges.append(f"Edge {i}: source '{source}' not found in nodes")
        if target not in node_id_set:
            orphaned_edges.append(f"Edge {i}: target '{target}' not found in nodes")
    
    if orphaned_edges:
        errors.extend(orphaned_edges)
    
    return errors, warnings

def load_and_normalize_graph():
    """
    Load graph from file and normalize it
    """
    graph_path = "../public/knowledge-graph.json"
    
    try:
        with open(graph_path, "r") as f:
            graph_data = json.load(f)
    except FileNotFoundError:
        # Create default graph if file doesn't exist
        graph_data = {
            "nodes": [
                {
                    "id": CORE_NODE_IDS["person"],
                    "type": "Person",
                    "contact": {},
                    "location": "Santa Catarina, Brazil"
                }
            ],
            "edges": []
        }
    
    # Normalize and validate
    graph_data = normalize_person_references(graph_data)
    errors, warnings = validate_graph_structure(graph_data)
    
    return graph_data, errors, warnings

def save_graph_safely(graph_data):
    """
    Save graph with normalization and validation
    """
    try:
        # Normalize before saving
        graph_data = normalize_person_references(graph_data)

        # Validate
        errors, warnings = validate_graph_structure(graph_data)

        if errors:
            raise ValueError(f"Graph validation failed: {errors}")

        # Save to file
        graph_path = "../public/knowledge-graph.json"
        with open(graph_path, "w") as f:
            json.dump(graph_data, f, indent=2)

        return warnings
    except Exception as e:
        print(f"Error in save_graph_safely: {e}")
        raise

def merge_graph_updates(current_graph, new_data):
    """
    Safely merge new data into existing graph
    """
    # Start with current graph
    merged = current_graph.copy()
    
    # Add new nodes (avoid duplicates)
    existing_node_ids = {node["id"] for node in merged.get("nodes", [])}
    
    for new_node in new_data.get("nodes", []):
        if new_node["id"] not in existing_node_ids:
            merged["nodes"].append(new_node)
        else:
            # Update existing node
            for i, existing_node in enumerate(merged["nodes"]):
                if existing_node["id"] == new_node["id"]:
                    # Merge properties, keeping existing ones
                    merged_node = {**existing_node, **new_node}
                    merged["nodes"][i] = merged_node
                    break
    
    # Add new edges (avoid duplicates)
    existing_edges = {
        (edge["source"], edge["target"], edge["relation"]) 
        for edge in merged.get("edges", [])
    }
    
    for new_edge in new_data.get("edges", []):
        edge_key = (new_edge["source"], new_edge["target"], new_edge["relation"])
        if edge_key not in existing_edges:
            merged["edges"].append(new_edge)
    
    return merged
