"""
Flexible Graph Editor - Schema Agnostic
Allows editing any JSON structure without rigid validation
"""
import streamlit as st
import json
from streamlit_ace import st_ace
from flexible_graph_utils import (
    load_graph_flexible, 
    save_graph_flexible, 
    validate_flexible,
    auto_fix_common_issues,
    get_graph_stats,
    transform_for_cytoscape
)

def render_flexible_graph_editor():
    """Render flexible graph editor that accepts any JSON"""
    
    st.header("🛠️ Flexible Graph Editor")
    st.write("**Schema-agnostic editor** - Edit any JSON structure. System will adapt for visualization.")
    
    # Load current graph
    current_graph = load_graph_flexible()
    
    # Show current stats
    stats = get_graph_stats(current_graph)
    
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Data Type", stats["data_type"])
    with col2:
        st.metric("Keys", stats["total_keys"])
    with col3:
        st.metric("Nodes", stats["node_count"] if stats["has_nodes"] else "N/A")
    with col4:
        st.metric("Edges", stats["edge_count"] if stats["has_edges"] else "N/A")
    
    # Show validation info
    errors, warnings = validate_flexible(current_graph)
    
    if errors:
        st.error("🚨 Critical Issues:")
        for error in errors:
            st.error(f"• {error}")
    
    if warnings:
        with st.expander("💡 Suggestions for Better Visualization", expanded=False):
            for warning in warnings:
                st.info(warning)
    
    # Auto-fix option
    if warnings:
        if st.button("🔧 Auto-Fix Common Issues", key="flexible_autofix"):
            fixed_graph = auto_fix_common_issues(current_graph.copy())
            current_graph = fixed_graph
            st.success("✅ Applied automatic fixes!")
            st.rerun()
    
    # JSON Editor
    st.subheader("📝 JSON Editor")
    st.write("Edit the graph structure directly. Any valid JSON is accepted.")
    
    # Convert to pretty JSON string
    try:
        json_string = json.dumps(current_graph, indent=2)
    except Exception as e:
        json_string = f'{{"error": "Could not serialize current data", "details": "{str(e)}"}}'
    
    # Monaco editor
    edited_json = st_ace(
        value=json_string,
        language='json',
        theme='monokai',
        key="flexible_graph_editor",
        height=400,
        auto_update=False,
        font_size=14,
        tab_size=2,
        wrap=False,
        annotations=None
    )
    
    # Save button
    col1, col2, col3 = st.columns([1, 1, 2])
    
    with col1:
        if st.button("💾 Save Graph", type="primary", key="flexible_save_graph"):
            try:
                # Parse JSON
                new_graph = json.loads(edited_json)
                
                # Validate (but don't block)
                errors, warnings = validate_flexible(new_graph)
                
                if errors:
                    st.error("❌ Critical errors found:")
                    for error in errors:
                        st.error(f"• {error}")
                    st.error("Please fix these issues before saving.")
                else:
                    # Save the graph
                    save_warnings = save_graph_flexible(new_graph)
                    
                    st.success("✅ Graph saved successfully!")
                    
                    if warnings:
                        st.warning("⚠️ Suggestions:")
                        for warning in warnings:
                            st.warning(f"• {warning}")
                    
                    if save_warnings:
                        st.info("ℹ️ Save notes:")
                        for warning in save_warnings:
                            st.info(f"• {warning}")
                    
                    st.info("🔄 Main application will auto-refresh in 30 seconds")
                    st.rerun()
                    
            except json.JSONDecodeError as e:
                st.error(f"❌ Invalid JSON syntax: {e}")
                st.error("Please fix the JSON syntax and try again.")
            except Exception as e:
                st.error(f"❌ Unexpected error: {e}")
    
    with col2:
        if st.button("🔄 Reset to Current", key="flexible_reset"):
            st.rerun()
    
    with col3:
        if st.button("👁️ Preview Cytoscape Transform", key="flexible_preview"):
            try:
                new_graph = json.loads(edited_json)
                cyto_data = transform_for_cytoscape(new_graph)
                
                st.subheader("🔍 Cytoscape Preview")
                st.write("This is how your data will appear in the main visualization:")
                st.json(cyto_data)
                
            except Exception as e:
                st.error(f"Preview error: {e}")
    
    # Help section
    with st.expander("📚 Help & Examples", expanded=False):
        st.markdown("""
        ### 🎯 **Flexible Schema Support**
        
        This editor accepts **any valid JSON structure**. The system will automatically adapt for visualization.
        
        ### 📋 **Recommended Structure**
        ```json
        {
          "nodes": [
            {
              "id": "unique_id",
              "type": "NodeType",
              "custom_field": "any_value"
            }
          ],
          "edges": [
            {
              "source": "source_id",
              "target": "target_id", 
              "relation": "RELATIONSHIP_TYPE"
            }
          ]
        }
        ```
        
        ### ✨ **But You Can Also Use:**
        - Custom node properties
        - Different field names
        - Nested objects
        - Arrays of data
        - Any JSON structure
        
        ### 🔧 **Auto-Fixes Available:**
        - Missing `nodes`/`edges` arrays
        - Nodes without `id` fields
        - Edges without `source`/`target`
        - Invalid data types
        
        ### 🎨 **Visualization Notes:**
        - System transforms your data for Cytoscape compatibility
        - Missing fields get sensible defaults
        - Invalid references are filtered out
        - Custom properties are preserved
        """)
    
    # Advanced section
    with st.expander("🔬 Advanced Tools", expanded=False):
        st.subheader("🧪 Data Analysis")
        
        if st.button("📊 Analyze Current Structure", key="flexible_analyze"):
            st.json(stats)

        if st.button("🔍 Show Raw Data", key="flexible_raw"):
            st.code(json.dumps(current_graph, indent=2), language="json")

        if st.button("🎭 Show Cytoscape Transform", key="flexible_transform"):
            cyto_data = transform_for_cytoscape(current_graph)
            st.json(cyto_data)
        
        st.subheader("🛠️ Quick Templates")
        
        col1, col2 = st.columns(2)
        
        with col1:
            if st.button("📝 Minimal Graph", key="flexible_template_minimal"):
                template = {
                    "nodes": [{"id": "node1", "type": "Example"}],
                    "edges": []
                }
                st.code(json.dumps(template, indent=2), language="json")

        with col2:
            if st.button("👤 Person Profile", key="flexible_template_person"):
                template = {
                    "nodes": [
                        {
                            "id": "Pedro Reichow",
                            "type": "Person",
                            "contact": {"email": "pedro@example.com"},
                            "skills": ["Python", "JavaScript"]
                        }
                    ],
                    "edges": []
                }
                st.code(json.dumps(template, indent=2), language="json")
