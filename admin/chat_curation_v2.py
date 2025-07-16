"""
Enhanced Chat Curation with Accept/Decline for Individual Changes
"""
import streamlit as st
import json
from flow import process_user_input, create_knowledge_flow
from graph_utils import load_and_normalize_graph, save_graph_safely, merge_graph_updates

def render_chat_curation_v2():
    """Render chat curation interface with accept/decline for individual changes"""
    
    st.header("💬 Chat Curation with Change Control")
    st.write("Chat to enhance Pedro's knowledge graph. Review and approve each suggested change individually.")
    
    # Initialize session state
    if "messages" not in st.session_state:
        st.session_state.messages = []
    if "pending_changes" not in st.session_state:
        st.session_state.pending_changes = []
    if "approved_changes" not in st.session_state:
        st.session_state.approved_changes = []
    
    # Load current graph
    current_graph, errors, warnings = load_and_normalize_graph()
    
    # Show current graph stats
    with st.expander("📊 Current Graph Stats", expanded=False):
        st.metric("Nodes", len(current_graph.get("nodes", [])))
        st.metric("Edges", len(current_graph.get("edges", [])))
        
        if errors:
            st.error("Graph has validation errors:")
            for error in errors:
                st.error(f"• {error}")
        
        if warnings:
            st.warning("Graph has warnings:")
            for warning in warnings:
                st.warning(f"• {warning}")
    
    # Chat interface
    st.subheader("💭 Chat with AI to Enhance Graph")
    
    # Display chat history
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.write(message["content"])
    
    # Chat input
    if prompt := st.chat_input("Ask about Pedro's experience or suggest improvements..."):
        # Add user message
        st.session_state.messages.append({"role": "user", "content": prompt})
        
        with st.chat_message("user"):
            st.write(prompt)
        
        # Process with AI
        with st.chat_message("assistant"):
            with st.spinner("Analyzing and generating suggestions..."):
                try:
                    # Create flow and process
                    flow = create_knowledge_flow()
                    result = process_user_input(prompt, current_graph, flow)
                    
                    if result and "final_graph" in result:
                        new_graph = result["final_graph"]
                        
                        # Compare graphs to find changes
                        changes = detect_graph_changes(current_graph, new_graph)
                        
                        if changes:
                            st.write("🔍 **I found information to enhance the graph:**")
                            
                            # Store pending changes
                            change_id = len(st.session_state.pending_changes)
                            st.session_state.pending_changes.append({
                                "id": change_id,
                                "prompt": prompt,
                                "changes": changes,
                                "new_graph": new_graph,
                                "timestamp": st.session_state.get("timestamp", "now")
                            })
                            
                            st.write(f"📝 **{len(changes)} changes suggested** - Review them below!")
                            
                        else:
                            st.write("💭 I understand your request, but I don't see specific changes needed for the graph right now.")
                            
                    else:
                        st.write("🤔 I couldn't generate specific graph updates from that request. Could you be more specific?")
                        
                except Exception as e:
                    st.error(f"Error processing request: {e}")
                    st.write("💭 I had trouble processing that request. Please try rephrasing.")
        
        # Add assistant response
        st.session_state.messages.append({
            "role": "assistant", 
            "content": "Suggestions generated - review changes below!"
        })
        
        st.rerun()
    
    # Show pending changes for review
    if st.session_state.pending_changes:
        st.subheader("🔍 Review Suggested Changes")
        
        for change_set in st.session_state.pending_changes:
            with st.expander(f"💡 Changes from: '{change_set['prompt'][:50]}...'", expanded=True):
                
                for i, change in enumerate(change_set["changes"]):
                    col1, col2, col3 = st.columns([6, 1, 1])
                    
                    with col1:
                        if change["type"] == "new_node":
                            st.write(f"**➕ Add Node:** `{change['data']['id']}`")
                            st.json(change["data"], expanded=False)
                            
                        elif change["type"] == "new_edge":
                            st.write(f"**🔗 Add Edge:** `{change['data']['source']}` → `{change['data']['target']}`")
                            st.write(f"Relation: `{change['data']['relation']}`")
                            
                        elif change["type"] == "update_node":
                            st.write(f"**✏️ Update Node:** `{change['node_id']}`")
                            st.write("Changes:")
                            st.json(change["updates"], expanded=False)
                    
                    with col2:
                        if st.button("✅", key=f"accept_{change_set['id']}_{i}", help="Accept this change"):
                            apply_single_change(current_graph, change)
                            st.success("Change accepted!")
                            st.rerun()
                    
                    with col3:
                        if st.button("❌", key=f"decline_{change_set['id']}_{i}", help="Decline this change"):
                            st.info("Change declined")
                            # Remove this change from pending
                            change_set["changes"].remove(change)
                            if not change_set["changes"]:
                                st.session_state.pending_changes.remove(change_set)
                            st.rerun()
                
                # Bulk actions
                st.write("---")
                col1, col2, col3 = st.columns(3)
                
                with col1:
                    if st.button(f"✅ Accept All", key=f"accept_all_{change_set['id']}"):
                        for change in change_set["changes"]:
                            apply_single_change(current_graph, change)
                        st.session_state.pending_changes.remove(change_set)
                        st.success(f"All {len(change_set['changes'])} changes accepted!")
                        st.rerun()
                
                with col2:
                    if st.button(f"❌ Decline All", key=f"decline_all_{change_set['id']}"):
                        st.session_state.pending_changes.remove(change_set)
                        st.info("All changes declined")
                        st.rerun()

def detect_graph_changes(old_graph, new_graph):
    """Detect specific changes between two graphs"""
    changes = []
    
    old_nodes = {node["id"]: node for node in old_graph.get("nodes", [])}
    new_nodes = {node["id"]: node for node in new_graph.get("nodes", [])}
    
    old_edges = set((e["source"], e["target"], e["relation"]) for e in old_graph.get("edges", []))
    new_edges = set((e["source"], e["target"], e["relation"]) for e in new_graph.get("edges", []))
    
    # New nodes
    for node_id, node in new_nodes.items():
        if node_id not in old_nodes:
            changes.append({
                "type": "new_node",
                "data": node
            })
        elif node != old_nodes[node_id]:
            # Updated node
            changes.append({
                "type": "update_node", 
                "node_id": node_id,
                "updates": node
            })
    
    # New edges
    for edge_tuple in new_edges:
        if edge_tuple not in old_edges:
            # Find the full edge data
            for edge in new_graph.get("edges", []):
                if (edge["source"], edge["target"], edge["relation"]) == edge_tuple:
                    changes.append({
                        "type": "new_edge",
                        "data": edge
                    })
                    break
    
    return changes

def apply_single_change(current_graph, change):
    """Apply a single change to the current graph"""
    try:
        if change["type"] == "new_node":
            current_graph["nodes"].append(change["data"])
            
        elif change["type"] == "new_edge":
            current_graph["edges"].append(change["data"])
            
        elif change["type"] == "update_node":
            for i, node in enumerate(current_graph["nodes"]):
                if node["id"] == change["node_id"]:
                    current_graph["nodes"][i] = change["updates"]
                    break
        
        # Save the updated graph
        save_graph_safely(current_graph)
        
    except Exception as e:
        st.error(f"Error applying change: {e}")
