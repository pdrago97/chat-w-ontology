"""
Unified Graph Curation Pipeline
A streamlined interface for document upload → extraction → conversational curation → graph updates
"""
import streamlit as st
import json
import os
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime

# Import existing components
from simple_extraction import extract_with_langextract, map_lx_to_graph, extract_from_file
try:
    from graph_utils import load_and_normalize_graph, save_graph_safely, validate_graph_structure
except ImportError:
    # Fallback functions if graph_utils not available
    def load_and_normalize_graph():
        import os
        graph_path = "../public/knowledge-graph.json"
        try:
            with open(graph_path, "r") as f:
                graph_data = json.load(f)
            return graph_data, [], []
        except FileNotFoundError:
            return {"nodes": [], "edges": []}, [], []

    def save_graph_safely(graph_data):
        import os
        graph_path = "../public/knowledge-graph.json"
        with open(graph_path, "w") as f:
            json.dump(graph_data, f, indent=2)
        return []

    def validate_graph_structure(graph_data):
        return [], []

try:
    from flexible_graph_utils import get_graph_stats
except ImportError:
    def get_graph_stats(graph_data):
        return {
            "data_type": "dict",
            "total_keys": len(graph_data.keys()) if isinstance(graph_data, dict) else 0,
            "node_count": len(graph_data.get("nodes", [])) if isinstance(graph_data, dict) else 0,
            "edge_count": len(graph_data.get("edges", [])) if isinstance(graph_data, dict) else 0,
            "has_nodes": "nodes" in graph_data if isinstance(graph_data, dict) else False,
            "has_edges": "edges" in graph_data if isinstance(graph_data, dict) else False
        }

def detect_graph_changes(old_graph, new_graph):
    """Simple change detection between two graphs"""
    changes = []

    old_node_ids = {node.get("id") for node in old_graph.get("nodes", [])}
    new_node_ids = {node.get("id") for node in new_graph.get("nodes", [])}

    # New nodes
    for node_id in new_node_ids - old_node_ids:
        node = next((n for n in new_graph.get("nodes", []) if n.get("id") == node_id), None)
        if node:
            changes.append({
                "type": "add_node",
                "data": node,
                "description": f"Add {node.get('type', 'Unknown')} node: {node_id}"
            })

    # New edges
    old_edges = {(e.get("source"), e.get("target"), e.get("relation")) for e in old_graph.get("edges", [])}
    new_edges = {(e.get("source"), e.get("target"), e.get("relation")) for e in new_graph.get("edges", [])}

    for edge_tuple in new_edges - old_edges:
        if all(edge_tuple):  # Make sure all parts exist
            changes.append({
                "type": "add_edge",
                "data": {"source": edge_tuple[0], "target": edge_tuple[1], "relation": edge_tuple[2]},
                "description": f"Add relationship: {edge_tuple[0]} -> {edge_tuple[2]} -> {edge_tuple[1]}"
            })

    return changes

@dataclass
class PipelineState:
    """Track pipeline progress and data"""
    stage: str = "upload"  # upload, extract, curate, resolve, preview, complete
    uploaded_files: List[Any] = None
    extracted_data: Dict = None
    curated_graph: Dict = None
    conflicts: List[Dict] = None
    final_graph: Dict = None
    conversation_history: List[Dict] = None
    
    def __post_init__(self):
        if self.uploaded_files is None:
            self.uploaded_files = []
        if self.extracted_data is None:
            self.extracted_data = {}
        if self.curated_graph is None:
            self.curated_graph = {"nodes": [], "edges": []}
        if self.conflicts is None:
            self.conflicts = []
        if self.final_graph is None:
            self.final_graph = {"nodes": [], "edges": []}
        if self.conversation_history is None:
            self.conversation_history = []

def init_pipeline_state():
    """Initialize or get pipeline state from session"""
    if "pipeline_state" not in st.session_state:
        st.session_state.pipeline_state = PipelineState()
    return st.session_state.pipeline_state

def render_progress_bar(current_stage: str):
    """Show pipeline progress"""
    stages = ["upload", "extract", "curate", "resolve", "preview", "complete"]
    stage_names = ["📄 Upload", "🔍 Extract", "💬 Curate", "🔧 Resolve", "👁️ Preview", "✅ Complete"]
    
    current_idx = stages.index(current_stage) if current_stage in stages else 0
    
    cols = st.columns(len(stages))
    for i, (stage, name) in enumerate(zip(stages, stage_names)):
        with cols[i]:
            if i < current_idx:
                st.success(name)
            elif i == current_idx:
                st.info(f"**{name}**")
            else:
                st.write(name)

def render_upload_stage(state: PipelineState):
    """Stage 1: Document Upload"""
    st.header("📄 Document Upload")
    st.write("Upload your resume or documents to enhance your knowledge graph")
    
    # File upload
    uploaded_files = st.file_uploader(
        "Choose files to process",
        type=["pdf", "docx", "txt"],
        accept_multiple_files=True,
        help="Upload resume, CV, portfolio, or other professional documents"
    )
    
    if uploaded_files:
        st.write(f"📁 **{len(uploaded_files)} file(s) ready for processing:**")
        for file in uploaded_files:
            st.write(f"• {file.name} ({file.size:,} bytes)")
        
        state.uploaded_files = uploaded_files
        
        col1, col2 = st.columns([1, 3])
        with col1:
            if st.button("🚀 Start Extraction", type="primary"):
                state.stage = "extract"
                st.rerun()
        
        with col2:
            st.info("💡 Tip: Upload multiple documents for comprehensive extraction")
    
    else:
        st.info("👆 Upload documents to begin the curation process")

def render_extraction_stage(state: PipelineState):
    """Stage 2: AI-Powered Extraction"""
    st.header("🔍 AI Extraction")
    st.write("Extracting entities and relationships from your documents...")
    
    if not state.extracted_data:
        with st.spinner("🤖 Processing documents with AI..."):
            try:
                # Process uploaded files
                all_text = ""
                for file in state.uploaded_files:
                    content = file.read()
                    text = extract_from_file(content, file.name)
                    all_text += f"\n=== {file.name} ===\n{text}\n"
                
                # Extract with LangExtract
                extraction_result = extract_with_langextract(
                    text=all_text,
                    model_id="gpt-4o-mini",
                    passes=2,
                    workers=3
                )
                
                state.extracted_data = extraction_result
                st.success("✅ Extraction completed!")
                
            except Exception as e:
                st.error(f"❌ Extraction failed: {e}")
                return
    
    # Show extraction results
    if state.extracted_data:
        nodes = state.extracted_data.get("nodes", [])
        edges = state.extracted_data.get("edges", [])
        
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Entities Found", len(nodes))
        with col2:
            st.metric("Relationships", len(edges))
        with col3:
            confidence = state.extracted_data.get("meta", {}).get("confidence", "N/A")
            st.metric("Confidence", confidence)
        
        # Preview extracted entities
        with st.expander("🔍 Preview Extracted Entities", expanded=True):
            for i, node in enumerate(nodes[:10]):  # Show first 10
                node_type = node.get("type", "Unknown")
                node_id = node.get("id", f"node_{i}")
                st.write(f"**{node_type}**: {node_id}")
                if i >= 9 and len(nodes) > 10:
                    st.write(f"... and {len(nodes) - 10} more entities")
                    break
        
        # Continue to curation
        col1, col2 = st.columns([1, 3])
        with col1:
            if st.button("💬 Start Curation", type="primary"):
                state.curated_graph = {
                    "nodes": nodes.copy(),
                    "edges": edges.copy()
                }
                state.stage = "curate"
                st.rerun()
        
        with col2:
            if st.button("🔄 Re-extract"):
                state.extracted_data = {}
                st.rerun()

def render_curation_stage(state: PipelineState):
    """Stage 3: Conversational Curation"""
    st.header("💬 Conversational Curation")
    st.write("Let's refine the extracted data through conversation")
    
    # Show current graph stats
    nodes = state.curated_graph.get("nodes", [])
    edges = state.curated_graph.get("edges", [])
    
    col1, col2 = st.columns(2)
    with col1:
        st.metric("Current Nodes", len(nodes))
    with col2:
        st.metric("Current Edges", len(edges))
    
    # Chat interface
    st.subheader("🤖 AI Assistant")
    
    # Display conversation history
    for msg in state.conversation_history:
        with st.chat_message(msg["role"]):
            st.write(msg["content"])
    
    # Chat input
    if prompt := st.chat_input("Ask questions or request changes to the graph..."):
        # Add user message
        state.conversation_history.append({"role": "user", "content": prompt})

        with st.chat_message("user"):
            st.write(prompt)

        # Simple AI response (no complex processing for now)
        with st.chat_message("assistant"):
            response = f"I understand you want to: '{prompt}'. "

            # Simple keyword-based responses
            if any(word in prompt.lower() for word in ["add", "include", "missing"]):
                response += "To add information, you can manually edit the extracted data or continue to the next stage where conflicts will be resolved."
            elif any(word in prompt.lower() for word in ["remove", "delete", "wrong"]):
                response += "To remove incorrect information, you can edit the data in the preview stage before applying changes."
            elif any(word in prompt.lower() for word in ["skill", "technology", "tech"]):
                response += "I can help you organize skills and technologies. Consider grouping them by category or proficiency level."
            else:
                response += "I'm here to help you refine the graph. You can ask about adding information, removing incorrect data, or organizing the extracted entities."

            st.write(response)

            # Add some curation suggestions
            st.write("**Available actions:**")
            st.write("• Continue to conflict resolution to merge with existing graph")
            st.write("• Review and organize extracted entities by type")
            st.write("• Add missing relationships between entities")

        state.conversation_history.append({"role": "assistant", "content": response})
    
    # Continue to conflict resolution
    col1, col2, col3 = st.columns([1, 1, 2])
    with col1:
        if st.button("🔧 Check Conflicts", type="primary"):
            state.stage = "resolve"
            st.rerun()
    
    with col2:
        if st.button("⬅️ Back to Extract"):
            state.stage = "extract"
            st.rerun()

def render_conflict_resolution_stage(state: PipelineState):
    """Stage 4: Conflict Resolution"""
    st.header("🔧 Conflict Resolution")
    st.write("Checking for conflicts with existing graph...")
    
    # Load existing graph
    existing_graph, errors, warnings = load_and_normalize_graph()
    
    # Detect conflicts (simplified)
    conflicts = []
    existing_node_ids = {node.get("id") for node in existing_graph.get("nodes", [])}
    new_node_ids = {node.get("id") for node in state.curated_graph.get("nodes", [])}
    
    overlapping_ids = existing_node_ids.intersection(new_node_ids)
    
    if overlapping_ids:
        st.warning(f"⚠️ Found {len(overlapping_ids)} potential conflicts")
        
        for node_id in list(overlapping_ids)[:5]:  # Show first 5
            st.write(f"**Conflict**: Node '{node_id}' exists in both graphs")
            
            col1, col2 = st.columns(2)
            with col1:
                st.write("**Existing:**")
                existing_node = next((n for n in existing_graph["nodes"] if n.get("id") == node_id), {})
                st.json(existing_node, expanded=False)
            
            with col2:
                st.write("**New:**")
                new_node = next((n for n in state.curated_graph["nodes"] if n.get("id") == node_id), {})
                st.json(new_node, expanded=False)
    else:
        st.success("✅ No conflicts detected!")
    
    # Continue to preview
    col1, col2, col3 = st.columns([1, 1, 2])
    with col1:
        if st.button("👁️ Preview Changes", type="primary"):
            state.stage = "preview"
            st.rerun()
    
    with col2:
        if st.button("⬅️ Back to Curate"):
            state.stage = "curate"
            st.rerun()

def render_preview_stage(state: PipelineState):
    """Stage 5: Preview & Apply"""
    st.header("👁️ Preview & Apply")
    st.write("Review all changes before applying to your knowledge graph")
    
    # Prepare final graph (merge with existing)
    existing_graph, _, _ = load_and_normalize_graph()
    
    # Simple merge strategy (append new nodes/edges)
    final_nodes = existing_graph.get("nodes", []).copy()
    final_edges = existing_graph.get("edges", []).copy()
    
    # Add new nodes (avoid duplicates by ID)
    existing_ids = {node.get("id") for node in final_nodes}
    for node in state.curated_graph.get("nodes", []):
        if node.get("id") not in existing_ids:
            final_nodes.append(node)
    
    # Add new edges
    for edge in state.curated_graph.get("edges", []):
        final_edges.append(edge)
    
    state.final_graph = {"nodes": final_nodes, "edges": final_edges}
    
    # Show summary
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Total Nodes", len(final_nodes))
    with col2:
        st.metric("Total Edges", len(final_edges))
    with col3:
        new_nodes = len(final_nodes) - len(existing_graph.get("nodes", []))
        st.metric("New Nodes", new_nodes)
    
    # Validation
    errors, warnings = validate_graph_structure(state.final_graph)
    
    if errors:
        st.error("❌ Validation errors found:")
        for error in errors:
            st.error(f"• {error}")
    elif warnings:
        st.warning("⚠️ Validation warnings:")
        for warning in warnings:
            st.warning(f"• {warning}")
    else:
        st.success("✅ Graph validation passed!")
    
    # Apply changes
    col1, col2, col3 = st.columns([1, 1, 2])
    with col1:
        if st.button("✅ Apply Changes", type="primary", disabled=bool(errors)):
            try:
                save_graph_safely(state.final_graph)
                state.stage = "complete"
                st.success("🎉 Graph updated successfully!")
                st.rerun()
            except Exception as e:
                st.error(f"❌ Failed to save graph: {e}")
    
    with col2:
        if st.button("⬅️ Back to Resolve"):
            state.stage = "resolve"
            st.rerun()

def render_complete_stage(state: PipelineState):
    """Stage 6: Complete"""
    st.header("🎉 Pipeline Complete!")
    st.success("Your knowledge graph has been successfully updated!")
    
    # Show final stats
    final_stats = get_graph_stats(state.final_graph)
    
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Total Nodes", final_stats.get("node_count", 0))
    with col2:
        st.metric("Total Edges", final_stats.get("edge_count", 0))
    with col3:
        st.metric("Data Quality", "✅ Validated")
    
    # Next steps
    st.subheader("🚀 Next Steps")
    st.write("• View your updated graph in the main application")
    st.write("• Run additional curation cycles with new documents")
    st.write("• Use manual editors for fine-tuning")
    
    if st.button("🔄 Start New Pipeline", type="primary"):
        # Reset state
        st.session_state.pipeline_state = PipelineState()
        st.rerun()

def main():
    """Main pipeline interface"""
    st.set_page_config(
        page_title="Graph Curation Pipeline",
        page_icon="🧠",
        layout="wide"
    )
    
    st.title("🧠 Unified Graph Curation Pipeline")
    st.write("**Transform documents into knowledge graphs through guided AI curation**")
    
    # Initialize state
    state = init_pipeline_state()
    
    # Show progress
    render_progress_bar(state.stage)
    st.divider()
    
    # Render current stage
    if state.stage == "upload":
        render_upload_stage(state)
    elif state.stage == "extract":
        render_extraction_stage(state)
    elif state.stage == "curate":
        render_curation_stage(state)
    elif state.stage == "resolve":
        render_conflict_resolution_stage(state)
    elif state.stage == "preview":
        render_preview_stage(state)
    elif state.stage == "complete":
        render_complete_stage(state)
    
    # Debug info (can be removed)
    with st.sidebar:
        st.subheader("🔧 Pipeline State")
        st.write(f"**Current Stage**: {state.stage}")
        st.write(f"**Files**: {len(state.uploaded_files)}")
        st.write(f"**Extracted**: {'✅' if state.extracted_data else '❌'}")
        st.write(f"**Curated**: {len(state.curated_graph.get('nodes', []))} nodes")

if __name__ == "__main__":
    main()
