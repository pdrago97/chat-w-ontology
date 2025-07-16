"""
Flexible, Schema-Agnostic Graph Utilities
Supports any JSON structure while providing helpful transformations
"""
import json
import os
from typing import Dict, List, Tuple, Any

# Core configuration - but flexible
DEFAULT_PERSON_ID = "Pedro Reichow"
GRAPH_FILE_PATH = os.path.join(os.path.dirname(__file__), "..", "public", "knowledge-graph.json")

def load_graph_flexible() -> Dict[str, Any]:
    """
    Load graph with maximum flexibility - accepts any valid JSON
    """
    try:
        if os.path.exists(GRAPH_FILE_PATH):
            with open(GRAPH_FILE_PATH, "r") as f:
                data = json.load(f)
                
            # Ensure it's a dict
            if not isinstance(data, dict):
                print(f"Warning: Graph file contains {type(data)}, converting to dict")
                data = {"raw_data": data}
                
            return data
        else:
            # Create minimal default
            return {
                "nodes": [
                    {
                        "id": DEFAULT_PERSON_ID,
                        "type": "Person",
                        "contact": {},
                        "location": "Santa Catarina, Brazil"
                    }
                ],
                "edges": []
            }
    except Exception as e:
        print(f"Error loading graph: {e}")
        return {"nodes": [], "edges": [], "error": str(e)}

def save_graph_flexible(graph_data: Dict[str, Any]) -> List[str]:
    """
    Save any valid JSON structure as graph
    Returns list of warnings (never fails)
    """
    warnings = []
    
    try:
        # Ensure it's serializable
        json.dumps(graph_data)
        
        # Save to file
        with open(GRAPH_FILE_PATH, "w") as f:
            json.dump(graph_data, f, indent=2)
            
        print(f"✅ Graph saved successfully to {GRAPH_FILE_PATH}")
        
    except (ValueError, TypeError) as e:
        warnings.append(f"JSON serialization error: {e}")
        # Try to save a safe version
        safe_data = {"error": "Invalid JSON data", "original_error": str(e)}
        with open(GRAPH_FILE_PATH, "w") as f:
            json.dump(safe_data, f, indent=2)
            
    except Exception as e:
        warnings.append(f"Save error: {e}")
        
    return warnings

def validate_flexible(graph_data: Dict[str, Any]) -> Tuple[List[str], List[str]]:
    """
    Gentle validation - provides suggestions, never blocks saving
    """
    errors = []  # Only for truly broken data
    warnings = []  # Suggestions for better structure
    
    if not isinstance(graph_data, dict):
        errors.append("Data must be a JSON object")
        return errors, warnings
    
    # Check for common graph structures
    has_nodes = "nodes" in graph_data and isinstance(graph_data["nodes"], list)
    has_edges = "edges" in graph_data and isinstance(graph_data["edges"], list)
    
    if not has_nodes and not has_edges:
        warnings.append("💡 Consider adding 'nodes' and 'edges' arrays for graph visualization")
    
    if has_nodes:
        nodes = graph_data["nodes"]
        
        # Check for IDs
        nodes_with_ids = [n for n in nodes if isinstance(n, dict) and "id" in n]
        if len(nodes_with_ids) < len(nodes):
            warnings.append(f"💡 {len(nodes) - len(nodes_with_ids)} nodes missing 'id' field")
        
        # Check for person node
        person_nodes = [n for n in nodes if isinstance(n, dict) and n.get("type") == "Person"]
        if not person_nodes:
            warnings.append("💡 Consider adding a Person node for better visualization")
        elif len(person_nodes) > 1:
            warnings.append(f"💡 Found {len(person_nodes)} Person nodes - first will be primary")
    
    if has_edges:
        edges = graph_data["edges"]
        
        # Check edge structure
        valid_edges = [e for e in edges if isinstance(e, dict) and "source" in e and "target" in e]
        if len(valid_edges) < len(edges):
            warnings.append(f"💡 {len(edges) - len(valid_edges)} edges missing 'source'/'target' fields")
    
    return errors, warnings

def transform_for_cytoscape(graph_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform any graph structure to Cytoscape-compatible format
    This is where we handle the rigid schema requirements
    """
    try:
        # If already in good format, return as-is
        if "nodes" in graph_data and "edges" in graph_data:
            nodes = graph_data["nodes"]
            edges = graph_data["edges"]
            
            # Transform nodes to Cytoscape format
            cyto_nodes = []
            for node in nodes:
                if isinstance(node, dict) and "id" in node:
                    cyto_node = {
                        "data": {
                            "id": str(node["id"]),
                            "label": str(node.get("id", "Unknown")),
                            "type": node.get("type", "Unknown"),
                            **{k: v for k, v in node.items() if k not in ["id", "type"]}
                        }
                    }
                    cyto_nodes.append(cyto_node)
            
            # Transform edges to Cytoscape format
            cyto_edges = []
            for edge in edges:
                if isinstance(edge, dict) and "source" in edge and "target" in edge:
                    cyto_edge = {
                        "data": {
                            "source": str(edge["source"]),
                            "target": str(edge["target"]),
                            "label": edge.get("relation", ""),
                            **{k: v for k, v in edge.items() if k not in ["source", "target", "relation"]}
                        }
                    }
                    cyto_edges.append(cyto_edge)
            
            return {
                "elements": {
                    "nodes": cyto_nodes,
                    "edges": cyto_edges
                }
            }
        
        # Fallback: create minimal structure
        return {
            "elements": {
                "nodes": [
                    {
                        "data": {
                            "id": "fallback",
                            "label": "Data Structure",
                            "type": "Info"
                        }
                    }
                ],
                "edges": []
            }
        }
        
    except Exception as e:
        print(f"Error transforming for Cytoscape: {e}")
        return {
            "elements": {
                "nodes": [
                    {
                        "data": {
                            "id": "error",
                            "label": f"Transform Error: {str(e)[:50]}...",
                            "type": "Error"
                        }
                    }
                ],
                "edges": []
            }
        }

def auto_fix_common_issues(graph_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Automatically fix common structural issues
    """
    if not isinstance(graph_data, dict):
        return {"nodes": [], "edges": [], "original_data": graph_data}
    
    # Ensure nodes array exists
    if "nodes" not in graph_data:
        graph_data["nodes"] = []
    elif not isinstance(graph_data["nodes"], list):
        graph_data["nodes"] = []
    
    # Ensure edges array exists  
    if "edges" not in graph_data:
        graph_data["edges"] = []
    elif not isinstance(graph_data["edges"], list):
        graph_data["edges"] = []
    
    # Fix nodes without IDs
    for i, node in enumerate(graph_data["nodes"]):
        if isinstance(node, dict) and "id" not in node:
            node["id"] = f"node_{i}"
    
    # Fix edges with missing fields
    for i, edge in enumerate(graph_data["edges"]):
        if isinstance(edge, dict):
            if "source" not in edge:
                edge["source"] = f"unknown_source_{i}"
            if "target" not in edge:
                edge["target"] = f"unknown_target_{i}"
    
    return graph_data

def get_graph_stats(graph_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get statistics about any graph structure
    """
    stats = {
        "total_keys": len(graph_data.keys()) if isinstance(graph_data, dict) else 0,
        "has_nodes": False,
        "has_edges": False,
        "node_count": 0,
        "edge_count": 0,
        "data_type": type(graph_data).__name__
    }
    
    if isinstance(graph_data, dict):
        if "nodes" in graph_data and isinstance(graph_data["nodes"], list):
            stats["has_nodes"] = True
            stats["node_count"] = len(graph_data["nodes"])
        
        if "edges" in graph_data and isinstance(graph_data["edges"], list):
            stats["has_edges"] = True
            stats["edge_count"] = len(graph_data["edges"])
    
    return stats
