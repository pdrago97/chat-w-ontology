"""
Pipeline Utilities
Supporting functions for the unified graph curation pipeline
"""
import json
import os
from typing import Dict, List, Any, Tuple, Optional
from datetime import datetime
import difflib
from dataclasses import dataclass

@dataclass
class ConflictInfo:
    """Information about a graph conflict"""
    node_id: str
    conflict_type: str  # "duplicate", "similar", "update"
    existing_node: Dict
    new_node: Dict
    similarity_score: float
    suggested_action: str  # "merge", "replace", "keep_both", "skip"

def detect_node_conflicts(existing_graph: Dict, new_graph: Dict) -> List[ConflictInfo]:
    """Detect conflicts between existing and new graph nodes"""
    conflicts = []
    
    existing_nodes = {node.get("id"): node for node in existing_graph.get("nodes", [])}
    new_nodes = new_graph.get("nodes", [])
    
    for new_node in new_nodes:
        new_id = new_node.get("id")
        if not new_id:
            continue
            
        # Direct ID match
        if new_id in existing_nodes:
            existing_node = existing_nodes[new_id]
            similarity = calculate_node_similarity(existing_node, new_node)
            
            conflict = ConflictInfo(
                node_id=new_id,
                conflict_type="duplicate" if similarity > 0.9 else "update",
                existing_node=existing_node,
                new_node=new_node,
                similarity_score=similarity,
                suggested_action="merge" if similarity > 0.7 else "replace"
            )
            conflicts.append(conflict)
        
        # Check for similar nodes (fuzzy matching)
        else:
            for existing_id, existing_node in existing_nodes.items():
                if are_nodes_similar(existing_node, new_node):
                    similarity = calculate_node_similarity(existing_node, new_node)
                    
                    if similarity > 0.6:  # Threshold for similarity
                        conflict = ConflictInfo(
                            node_id=new_id,
                            conflict_type="similar",
                            existing_node=existing_node,
                            new_node=new_node,
                            similarity_score=similarity,
                            suggested_action="merge" if similarity > 0.8 else "keep_both"
                        )
                        conflicts.append(conflict)
                        break
    
    return conflicts

def are_nodes_similar(node1: Dict, node2: Dict) -> bool:
    """Check if two nodes are similar based on type and key attributes"""
    # Must be same type
    if node1.get("type") != node2.get("type"):
        return False
    
    node_type = node1.get("type", "").lower()
    
    # Type-specific similarity checks
    if node_type == "person":
        return are_persons_similar(node1, node2)
    elif node_type == "experience":
        return are_experiences_similar(node1, node2)
    elif node_type == "education":
        return are_educations_similar(node1, node2)
    elif node_type == "project":
        return are_projects_similar(node1, node2)
    elif node_type == "skill":
        return are_skills_similar(node1, node2)
    
    # Generic similarity based on ID or title
    id1 = node1.get("id", "").lower()
    id2 = node2.get("id", "").lower()
    title1 = node1.get("title", node1.get("name", "")).lower()
    title2 = node2.get("title", node2.get("name", "")).lower()
    
    return (id1 and id2 and id1 == id2) or (title1 and title2 and title1 == title2)

def are_persons_similar(person1: Dict, person2: Dict) -> bool:
    """Check if two person nodes are similar"""
    name1 = person1.get("id", "").lower()
    name2 = person2.get("id", "").lower()
    
    # Check if names are similar
    if name1 and name2:
        similarity = difflib.SequenceMatcher(None, name1, name2).ratio()
        return similarity > 0.8
    
    return False

def are_experiences_similar(exp1: Dict, exp2: Dict) -> bool:
    """Check if two experience nodes are similar"""
    company1 = exp1.get("id", "").lower()
    company2 = exp2.get("id", "").lower()
    
    title1 = exp1.get("title", "").lower()
    title2 = exp2.get("title", "").lower()
    
    # Same company or very similar titles
    if company1 and company2:
        company_sim = difflib.SequenceMatcher(None, company1, company2).ratio()
        if company_sim > 0.8:
            return True
    
    if title1 and title2:
        title_sim = difflib.SequenceMatcher(None, title1, title2).ratio()
        if title_sim > 0.8:
            return True
    
    return False

def are_educations_similar(edu1: Dict, edu2: Dict) -> bool:
    """Check if two education nodes are similar"""
    inst1 = edu1.get("id", "").lower()
    inst2 = edu2.get("id", "").lower()
    
    if inst1 and inst2:
        similarity = difflib.SequenceMatcher(None, inst1, inst2).ratio()
        return similarity > 0.8
    
    return False

def are_projects_similar(proj1: Dict, proj2: Dict) -> bool:
    """Check if two project nodes are similar"""
    name1 = proj1.get("id", proj1.get("name", "")).lower()
    name2 = proj2.get("id", proj2.get("name", "")).lower()
    
    if name1 and name2:
        similarity = difflib.SequenceMatcher(None, name1, name2).ratio()
        return similarity > 0.8
    
    return False

def are_skills_similar(skill1: Dict, skill2: Dict) -> bool:
    """Check if two skill nodes are similar"""
    name1 = skill1.get("id", skill1.get("name", "")).lower()
    name2 = skill2.get("id", skill2.get("name", "")).lower()
    
    if name1 and name2:
        # Skills are similar if names are very close
        similarity = difflib.SequenceMatcher(None, name1, name2).ratio()
        return similarity > 0.9
    
    return False

def calculate_node_similarity(node1: Dict, node2: Dict) -> float:
    """Calculate similarity score between two nodes"""
    if node1.get("type") != node2.get("type"):
        return 0.0
    
    # Compare key fields
    score = 0.0
    comparisons = 0
    
    # ID comparison
    id1 = str(node1.get("id", "")).lower()
    id2 = str(node2.get("id", "")).lower()
    if id1 and id2:
        score += difflib.SequenceMatcher(None, id1, id2).ratio()
        comparisons += 1
    
    # Title/name comparison
    title1 = str(node1.get("title", node1.get("name", ""))).lower()
    title2 = str(node2.get("title", node2.get("name", ""))).lower()
    if title1 and title2:
        score += difflib.SequenceMatcher(None, title1, title2).ratio()
        comparisons += 1
    
    # Type-specific comparisons
    node_type = node1.get("type", "").lower()
    if node_type == "experience":
        # Compare years/duration
        years1 = str(node1.get("years", "")).lower()
        years2 = str(node2.get("years", "")).lower()
        if years1 and years2:
            score += difflib.SequenceMatcher(None, years1, years2).ratio()
            comparisons += 1
    
    return score / max(comparisons, 1)

def merge_nodes(existing_node: Dict, new_node: Dict, merge_strategy: str = "enhance") -> Dict:
    """Merge two nodes based on strategy"""
    if merge_strategy == "replace":
        return new_node.copy()
    elif merge_strategy == "keep_existing":
        return existing_node.copy()
    elif merge_strategy == "enhance":
        # Merge by enhancing existing with new data
        merged = existing_node.copy()
        
        for key, value in new_node.items():
            if key not in merged or not merged[key]:
                # Add missing fields
                merged[key] = value
            elif isinstance(value, list) and isinstance(merged[key], list):
                # Merge lists (avoid duplicates)
                existing_items = set(str(item).lower() for item in merged[key])
                for item in value:
                    if str(item).lower() not in existing_items:
                        merged[key].append(item)
            elif isinstance(value, dict) and isinstance(merged[key], dict):
                # Merge dictionaries
                merged[key].update(value)
            elif len(str(value)) > len(str(merged[key])):
                # Use longer/more detailed value
                merged[key] = value
        
        return merged
    
    return existing_node.copy()

def create_backup(graph_data: Dict, backup_dir: str = "admin/backups") -> str:
    """Create a backup of the current graph"""
    os.makedirs(backup_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"knowledge_graph_backup_{timestamp}.json"
    backup_path = os.path.join(backup_dir, backup_filename)
    
    with open(backup_path, "w") as f:
        json.dump(graph_data, f, indent=2)
    
    return backup_path

def validate_pipeline_graph(graph_data: Dict) -> Tuple[List[str], List[str]]:
    """Validate graph data for pipeline requirements"""
    errors = []
    warnings = []
    
    if not isinstance(graph_data, dict):
        errors.append("Graph data must be a dictionary")
        return errors, warnings
    
    nodes = graph_data.get("nodes", [])
    edges = graph_data.get("edges", [])
    
    if not isinstance(nodes, list):
        errors.append("Nodes must be a list")
    
    if not isinstance(edges, list):
        errors.append("Edges must be a list")
    
    # Validate nodes
    node_ids = set()
    for i, node in enumerate(nodes):
        if not isinstance(node, dict):
            errors.append(f"Node {i} must be a dictionary")
            continue
        
        node_id = node.get("id")
        if not node_id:
            errors.append(f"Node {i} missing required 'id' field")
        elif node_id in node_ids:
            errors.append(f"Duplicate node ID: {node_id}")
        else:
            node_ids.add(node_id)
        
        if not node.get("type"):
            warnings.append(f"Node '{node_id}' missing 'type' field")
    
    # Validate edges
    for i, edge in enumerate(edges):
        if not isinstance(edge, dict):
            errors.append(f"Edge {i} must be a dictionary")
            continue
        
        source = edge.get("source")
        target = edge.get("target")
        
        if not source:
            errors.append(f"Edge {i} missing 'source' field")
        elif source not in node_ids:
            warnings.append(f"Edge {i} references unknown source node: {source}")
        
        if not target:
            errors.append(f"Edge {i} missing 'target' field")
        elif target not in node_ids:
            warnings.append(f"Edge {i} references unknown target node: {target}")
    
    return errors, warnings

def generate_pipeline_summary(state) -> Dict[str, Any]:
    """Generate a summary of the pipeline execution"""
    summary = {
        "timestamp": datetime.now().isoformat(),
        "files_processed": len(state.uploaded_files),
        "entities_extracted": len(state.extracted_data.get("nodes", [])),
        "relationships_extracted": len(state.extracted_data.get("edges", [])),
        "final_nodes": len(state.final_graph.get("nodes", [])),
        "final_edges": len(state.final_graph.get("edges", [])),
        "conflicts_resolved": len(state.conflicts),
        "conversation_turns": len(state.conversation_history),
        "stages_completed": ["upload", "extract", "curate", "resolve", "preview", "complete"].index(state.stage) + 1
    }
    
    return summary
