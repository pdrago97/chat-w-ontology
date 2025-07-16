# Monaco-style JSON editor for knowledge graph
import streamlit as st
import json
from streamlit_ace import st_ace
from graph_utils import save_graph_safely, validate_graph_structure, normalize_person_references

def render_graph_editor(current_graph):
    """Render Monaco-style editor for graph JSON"""
    
    st.header("📝 Manual Graph Editor")
    st.write("Edit the knowledge graph JSON directly. Changes will be saved when you click 'Save Graph'.")
    
    # Convert graph to pretty JSON
    graph_json = json.dumps(current_graph, indent=2)
    
    # Monaco-style editor using streamlit-ace
    edited_content = st_ace(
        value=graph_json,
        language='json',
        theme='monokai',
        key="graph_editor",
        height=400,
        auto_update=False,
        font_size=14,
        tab_size=2,
        wrap=False,
        show_gutter=True,
        show_print_margin=True
    )
    
    col1, col2, col3 = st.columns([1, 1, 2])
    
    with col1:
        if st.button("💾 Save Graph", type="primary"):
            try:
                # Parse JSON
                new_graph = json.loads(edited_content)

                # Normalize and validate using centralized utils
                new_graph = normalize_person_references(new_graph)
                errors, warnings = validate_graph_structure(new_graph)

                # Show validation results
                if errors:
                    st.error("❌ Validation errors:")
                    for error in errors:
                        st.error(f"• {error}")
                    return None

                if warnings:
                    st.warning("⚠️ Validation warnings:")
                    for warning in warnings:
                        st.warning(f"• {warning}")

                # Save using safe method
                save_warnings = save_graph_safely(new_graph)

                st.success("✅ Graph saved successfully!")
                if save_warnings:
                    for warning in save_warnings:
                        st.info(f"ℹ️ {warning}")

                st.info("🔄 Main application will auto-refresh in 30 seconds, or click Refresh button")
                st.rerun()
                return new_graph
                
            except json.JSONDecodeError as e:
                st.error(f"❌ Invalid JSON: {e}")
                return None
            except Exception as e:
                st.error(f"❌ Error saving graph: {e}")
                return None
    
    with col2:
        if st.button("🔄 Reset"):
            st.rerun()
    
    with col3:
        st.write(f"**Nodes:** {len(current_graph.get('nodes', []))}, **Edges:** {len(current_graph.get('edges', []))}")
    
    return None

def validate_graph_structure(graph):
    """Validate graph structure and return issues"""
    issues = []
    
    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])
    
    # Check for required fields
    if not isinstance(nodes, list):
        issues.append("'nodes' must be an array")
    if not isinstance(edges, list):
        issues.append("'edges' must be an array")
    
    # Check node structure
    node_ids = set()
    for i, node in enumerate(nodes):
        if not isinstance(node, dict):
            issues.append(f"Node {i} must be an object")
            continue
        
        if "id" not in node:
            issues.append(f"Node {i} missing required 'id' field")
        else:
            node_id = node["id"]
            if node_id in node_ids:
                issues.append(f"Duplicate node ID: {node_id}")
            node_ids.add(node_id)
    
    # Check edge structure
    for i, edge in enumerate(edges):
        if not isinstance(edge, dict):
            issues.append(f"Edge {i} must be an object")
            continue
        
        for field in ["source", "target", "relation"]:
            if field not in edge:
                issues.append(f"Edge {i} missing required '{field}' field")
        
        # Check if source and target exist
        if "source" in edge and edge["source"] not in node_ids:
            issues.append(f"Edge {i} source '{edge['source']}' not found in nodes")
        if "target" in edge and edge["target"] not in node_ids:
            issues.append(f"Edge {i} target '{edge['target']}' not found in nodes")
    
    return issues
