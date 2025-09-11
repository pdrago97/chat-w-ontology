"""
Standalone Graph Curation Pipeline
No external dependencies on flow/pocketflow systems
"""
import streamlit as st
import json
import os
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime
import html
import openai

# Import our simple extraction functions
from simple_extraction import extract_with_openai, extract_from_file

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

def load_existing_graph():
    """Load existing knowledge graph"""
    graph_path = "../public/knowledge-graph.json"
    try:
        with open(graph_path, "r") as f:
            return json.load(f), [], []
    except FileNotFoundError:
        return {"nodes": [], "edges": []}, [], []
    except Exception as e:
        return {"nodes": [], "edges": []}, [f"Error loading graph: {e}"], []

def save_graph(graph_data):
    """Save graph to file"""
    graph_path = "../public/knowledge-graph.json"
    try:
        # Create backup
        backup_path = f"../public/knowledge-graph-backup-{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        if os.path.exists(graph_path):
            import shutil
            shutil.copy2(graph_path, backup_path)
        
        # Save new graph
        with open(graph_path, "w") as f:
            json.dump(graph_data, f, indent=2)
        return True, f"Backup created: {backup_path}"
    except Exception as e:
        return False, f"Error saving graph: {e}"

def detect_conflicts(existing_graph, new_graph):
    """Simple conflict detection"""
    conflicts = []
    existing_ids = {node.get("id") for node in existing_graph.get("nodes", [])}
    new_ids = {node.get("id") for node in new_graph.get("nodes", [])}
    
    overlapping = existing_ids.intersection(new_ids)
    
    for node_id in overlapping:
        existing_node = next((n for n in existing_graph["nodes"] if n.get("id") == node_id), {})
        new_node = next((n for n in new_graph["nodes"] if n.get("id") == node_id), {})
        
        conflicts.append({
            "node_id": node_id,
            "existing": existing_node,
            "new": new_node,
            "type": "duplicate"
        })
    
    return conflicts

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
                
                # Extract with OpenAI
                extraction_result = extract_with_openai(all_text, "gpt-4o-mini")
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
            method = state.extracted_data.get("meta", {}).get("method", "AI")
            st.metric("Method", method)
        
        # Preview extracted entities
        with st.expander("🔍 Preview Extracted Entities", expanded=True):
            for i, node in enumerate(nodes[:10]):
                node_type = node.get("type", "Unknown")
                node_id = node.get("id", f"node_{i}")
                st.write(f"**{node_type}**: {node_id}")
                if i >= 9 and len(nodes) > 10:
                    st.write(f"... and {len(nodes) - 10} more entities")
                    break
        
        # Continue to curation
        col1, col2 = st.columns([1, 3])
        with col1:
            if st.button("💬 Continue", type="primary"):
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
    """Stage 3: Review and Curation"""
    st.header("💬 Review Extracted Data")
    st.write("Review the extracted entities and relationships before proceeding")
    
    nodes = state.curated_graph.get("nodes", [])
    edges = state.curated_graph.get("edges", [])
    
    col1, col2 = st.columns(2)
    with col1:
        st.metric("Current Nodes", len(nodes))
    with col2:
        st.metric("Current Edges", len(edges))
    
    # Create tabs for different views
    tab1, tab2 = st.tabs(["📊 Entity List", "🕸️ Graph Preview"])

    with tab1:
        # Show entities by type
        if nodes:
            node_types = {}
            for node in nodes:
                node_type = node.get("type", "Unknown")
                if node_type not in node_types:
                    node_types[node_type] = []
                node_types[node_type].append(node)

            st.subheader("📊 Entities by Type")
            for node_type, type_nodes in node_types.items():
                with st.expander(f"{node_type} ({len(type_nodes)} items)"):
                    for node in type_nodes:
                        st.write(f"• **{node.get('id', 'Unknown')}**")
                        if node.get("description"):
                            st.write(f"  _{node['description']}_")
                        # Show additional fields
                        for key, value in node.items():
                            if key not in ['id', 'type', 'description'] and value:
                                st.write(f"  - {key}: {value}")

    with tab2:
        # Graph visualization preview
        st.subheader("🕸️ Network Preview")
        st.write("Visual representation of extracted entities and relationships")

        if nodes and edges:
            # Create a simple network visualization using pandas and streamlit
            import pandas as pd

            # Show network statistics
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Nodes", len(nodes))
            with col2:
                st.metric("Edges", len(edges))
            with col3:
                density = len(edges) / (len(nodes) * (len(nodes) - 1)) if len(nodes) > 1 else 0
                st.metric("Density", f"{density:.3f}")

            # Show node type distribution
            node_type_counts = {}
            for node in nodes:
                node_type = node.get("type", "Unknown")
                node_type_counts[node_type] = node_type_counts.get(node_type, 0) + 1

            if node_type_counts:
                st.write("**Node Type Distribution:**")
                df = pd.DataFrame(list(node_type_counts.items()), columns=['Type', 'Count'])
                st.bar_chart(df.set_index('Type'))

            # Interactive 3D Graph Preview
            st.subheader("🌐 Interactive 3D Preview")
            st.write("**Live preview of extracted data (same visualization as main website)**")

            # Create 3D graph for extracted data only
            extracted_graph_html = create_3d_graph_html(state.curated_graph)
            st.components.v1.html(extracted_graph_html, height=400, scrolling=False)

            st.info("💡 **Controls**: Click & drag to rotate • Scroll to zoom • Click nodes for details")

            # Show sample relationships as text backup
            with st.expander("📋 Relationship Details"):
                st.write("**Sample Relationships:**")
                sample_edges = edges[:10]  # Show first 10
                for edge in sample_edges:
                    source = edge.get("source", "Unknown")
                    target = edge.get("target", "Unknown")
                    relation = edge.get("relation", "connected_to")
                    st.write(f"• **{source}** → _{relation}_ → **{target}**")

                if len(edges) > 10:
                    st.write(f"... and {len(edges) - 10} more relationships")

        else:
            st.info("No graph data to visualize yet")
    
    # Simple feedback
    st.subheader("💭 Quick Feedback")
    feedback = st.text_area(
        "Any comments about the extracted data?",
        placeholder="e.g., 'Missing my experience at Company X' or 'Python skill level should be Expert'"
    )
    
    if feedback:
        st.info(f"💡 Noted: {feedback}")
    
    # Continue to conflict resolution
    col1, col2, col3 = st.columns([1, 1, 2])
    with col1:
        if st.button("🔧 Check Conflicts", type="primary"):
            state.stage = "resolve"
            st.rerun()
    
    with col2:
        if st.button("⬅️ Back"):
            state.stage = "extract"
            st.rerun()

def render_conflict_resolution_stage(state: PipelineState):
    """Stage 4: Conflict Resolution"""
    st.header("🔧 Conflict Resolution")
    st.write("Checking for conflicts with existing graph...")
    
    # Load existing graph
    existing_graph, errors, warnings = load_existing_graph()
    
    # Detect conflicts
    conflicts = detect_conflicts(existing_graph, state.curated_graph)
    
    if conflicts:
        st.warning(f"⚠️ Found {len(conflicts)} potential conflicts")
        
        for i, conflict in enumerate(conflicts[:5]):  # Show first 5
            st.write(f"**Conflict {i+1}**: Node '{conflict['node_id']}' exists in both graphs")
            
            col1, col2 = st.columns(2)
            with col1:
                st.write("**Existing:**")
                st.json(conflict["existing"], expanded=False)
            
            with col2:
                st.write("**New:**")
                st.json(conflict["new"], expanded=False)
            
            st.write("---")
    else:
        st.success("✅ No conflicts detected!")
    
    # Continue to preview
    col1, col2 = st.columns([1, 1])
    with col1:
        if st.button("👁️ Preview Changes", type="primary"):
            state.stage = "preview"
            st.rerun()
    
    with col2:
        if st.button("⬅️ Back"):
            state.stage = "curate"
            st.rerun()

def create_3d_graph_html(graph_data):
    """Create interactive 3D graph HTML matching the main website"""

    # Convert graph data to format suitable for 3D visualization
    nodes_3d = []
    links_3d = []

    # Process nodes
    for node in graph_data.get("nodes", []):
        node_3d = {
            "id": node.get("id", ""),
            "name": node.get("id", ""),
            "type": node.get("type", "Unknown"),
            "group": node.get("type", "Unknown").lower(),
            "description": node.get("description", ""),
            "title": node.get("title", ""),
            "years": node.get("years", ""),
            "location": node.get("location", "")
        }

        # Add color based on type (matching main website colors)
        color_map = {
            "person": "#22c55e",      # green-500
            "experience": "#a855f7",  # purple-500
            "education": "#3b82f6",   # blue-500
            "project": "#f59e0b",     # amber-500
            "skill": "#f97316",       # orange-500
            "certification": "#ec4899", # pink-500
            "default": "#6b7280"      # gray-500
        }
        node_3d["color"] = color_map.get(node.get("type", "").lower(), color_map["default"])
        nodes_3d.append(node_3d)

    # Process edges
    for edge in graph_data.get("edges", []):
        link_3d = {
            "source": edge.get("source", ""),
            "target": edge.get("target", ""),
            "relation": edge.get("relation", "connected_to")
        }
        links_3d.append(link_3d)

    # Escape JSON for HTML
    nodes_json = html.escape(json.dumps(nodes_3d))
    links_json = html.escape(json.dumps(links_3d))

    # Create HTML for 3D graph (matching main website implementation)
    graph_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ margin: 0; padding: 0; background: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }}
            #graph-container {{ width: 100%; height: 580px; position: relative; }}
            .graph-info {{
                position: absolute;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 1000;
                background: rgba(255,255,255,0.9);
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                color: #374151;
                border: 1px solid #e5e7eb;
            }}
            .controls {{
                position: absolute;
                top: 10px;
                right: 10px;
                z-index: 1000;
                display: flex;
                gap: 8px;
            }}
            .control-btn {{
                background: rgba(255,255,255,0.9);
                border: 1px solid #e5e7eb;
                border-radius: 4px;
                padding: 6px 10px;
                font-size: 11px;
                cursor: pointer;
                color: #374151;
            }}
            .control-btn:hover {{
                background: rgba(255,255,255,1);
                border-color: #d1d5db;
            }}
        </style>
    </head>
    <body>
        <div id="graph-container">
            <div class="graph-info">
                nodes: {len(nodes_3d)} • edges: {len(links_3d)} • Interactive 3D Knowledge Graph
            </div>
            <div class="controls">
                <button class="control-btn" onclick="resetCamera()">Reset View</button>
                <button class="control-btn" onclick="toggleAutoRotate()">Auto Rotate</button>
            </div>
        </div>

        <script src="https://unpkg.com/3d-force-graph@1.70.19/dist/3d-force-graph.min.js"></script>
        <script>
            const graphData = {{
                nodes: {nodes_json},
                links: {links_json}
            }};

            let autoRotate = false;

            const Graph = ForceGraph3D()
                (document.getElementById('graph-container'))
                .graphData(graphData)
                .nodeId('id')
                .nodeLabel(node => {{
                    let label = `<div style="background: rgba(0,0,0,0.8); color: white; padding: 8px; border-radius: 4px; font-size: 12px; max-width: 200px;">`;
                    label += `<strong>${{node.name || node.id}}</strong><br/>`;
                    label += `<em>${{node.type}}</em>`;
                    if (node.description) label += `<br/>${{node.description}}`;
                    if (node.title) label += `<br/><strong>${{node.title}}</strong>`;
                    if (node.years) label += `<br/>${{node.years}}`;
                    if (node.location) label += `<br/>${{node.location}}`;
                    label += `</div>`;
                    return label;
                }})
                .nodeVal(node => 3 + Math.max(1, (node._degree || 0)))
                .nodeColor(node => node.color)
                .linkColor(() => 'rgba(71, 85, 105, 0.4)')
                .linkDirectionalParticles(0)
                .linkWidth(1.2)
                .backgroundColor('#f8fafc')
                .onNodeHover(node => {{
                    document.body.style.cursor = node ? 'pointer' : null;
                }})
                .onNodeClick(node => {{
                    // Focus on clicked node
                    const distance = 120;
                    const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
                    Graph.cameraPosition(
                        {{ x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }},
                        node,
                        1000
                    );
                }})
                .linkLabel(link => `${{link.source.id || link.source}} → ${{link.relation}} → ${{link.target.id || link.target}}`);

            // Set initial camera position
            Graph.cameraPosition({{ z: 300 }});

            // Control functions
            function resetCamera() {{
                Graph.cameraPosition({{ z: 300 }}, {{ x: 0, y: 0, z: 0 }}, 1000);
            }}

            function toggleAutoRotate() {{
                autoRotate = !autoRotate;
                const controls = Graph.controls();
                controls.autoRotate = autoRotate;
                controls.autoRotateSpeed = autoRotate ? 0.5 : 0;
            }}

            // Enable orbit controls
            const controls = Graph.controls();
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;

            // Auto-fit graph
            setTimeout(() => {{
                Graph.zoomToFit(1000);
            }}, 1000);
        </script>
    </body>
    </html>
    """

    return graph_html

def render_preview_stage(state: PipelineState):
    """Stage 5: Preview & Apply"""
    st.header("👁️ Preview & Apply")
    st.write("Review all changes before applying to your knowledge graph")

    # Add graph location info
    st.info("📍 **Graph Location**: `/home/pedro/projects/chat-w-ontology/public/knowledge-graph.json`")
    
    # Load existing graph
    existing_graph, _, _ = load_existing_graph()
    
    # Prepare final graph (simple merge - append new nodes)
    final_nodes = existing_graph.get("nodes", []).copy()
    final_edges = existing_graph.get("edges", []).copy()
    
    # Add new nodes (avoid duplicates by ID)
    existing_ids = {node.get("id") for node in final_nodes}
    new_nodes_added = 0
    
    for node in state.curated_graph.get("nodes", []):
        if node.get("id") not in existing_ids:
            final_nodes.append(node)
            new_nodes_added += 1
    
    # Add new edges
    new_edges_added = len(state.curated_graph.get("edges", []))
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
        st.metric("New Nodes", new_nodes_added)

    # Add 3D Graph Preview Section
    st.subheader("🌐 3D Graph Preview")
    st.write("Preview how your updated graph will look in the main application")

    # Graph Viewer Selection
    st.subheader("🎯 Graph Viewer Options")

    col1, col2 = st.columns([2, 1])
    with col1:
        viewer_option = st.selectbox(
            "Choose how to view your graph:",
            options=[
                "📊 Statistics & Charts",
                "🌐 Interactive 3D Preview",
                "🔮 Final Result Preview",
                "🚀 Main Website (localhost:5174)"
            ],
            index=0,
            help="Select different ways to visualize and validate your knowledge graph"
        )

    with col2:
        if viewer_option == "🚀 Main Website (localhost:5174)":
            if st.button("🌐 Open Main Site", type="primary"):
                st.info("🚀 **Opening main website**: http://localhost:5174")
                st.markdown("""
                <script>
                    window.open('http://localhost:5174', '_blank');
                </script>
                """, unsafe_allow_html=True)
                st.success("✅ Your updated graph is now live on the main website!")

    # Create tabs for different views
    if viewer_option == "📊 Statistics & Charts":
        tab1, tab2, tab3 = st.tabs(["📊 Current Graph", "🆕 New Data Only", "🔮 Final Result"])
    elif viewer_option == "🌐 Interactive 3D Preview":
        # Show 3D preview directly
        st.write("**Interactive 3D preview of your final merged graph:**")
        if len(final_nodes) > 0:
            graph_3d_html = create_3d_graph_html(state.final_graph)
            st.components.v1.html(graph_3d_html, height=600, scrolling=False)
            st.info("💡 **Interactive Controls**: Click and drag to rotate • Scroll to zoom • Click nodes for details")
        else:
            st.warning("No graph data to visualize")
        tab1 = tab2 = tab3 = None  # Skip tabs
    elif viewer_option == "🔮 Final Result Preview":
        # Show final result only
        tab1, tab2, tab3 = None, None, st.container()
    else:  # Main Website option
        st.info("""
        🌐 **Main Website Integration**

        Your knowledge graph is automatically loaded by the main website at **http://localhost:5174**.

        **Features available on main site:**
        - 🎯 **2D Cytoscape View**: Interactive network with advanced filtering
        - 🌐 **3D Force Graph**: Same as preview but with full controls
        - 💬 **AI Chat Integration**: Ask questions about your graph
        - 🔍 **Advanced Search**: Find specific nodes and relationships
        - 🎨 **Visual Customization**: Colors, layouts, and themes

        Click "Open Main Site" above to view your updated graph!
        """)
        tab1 = tab2 = tab3 = None  # Skip tabs

    # Only show tabs if they're defined
    if tab1 is not None or tab2 is not None or tab3 is not None:
        if tab1:
            with tab1:
                st.write("**Your existing knowledge graph:**")
                if existing_graph.get("nodes"):
                    # Show current graph stats
                    current_stats = f"""
                    - **Nodes**: {len(existing_graph.get('nodes', []))}
                    - **Edges**: {len(existing_graph.get('edges', []))}
                    - **Node Types**: {len(set(n.get('type') for n in existing_graph.get('nodes', [])))}
                    """
                    st.markdown(current_stats)

                    # Simple visualization using Streamlit's built-in charts
                    import pandas as pd

                    # Create node type distribution
                    node_types = {}
                    for node in existing_graph.get("nodes", []):
                        node_type = node.get("type", "Unknown")
                        node_types[node_type] = node_types.get(node_type, 0) + 1

                    if node_types:
                        df = pd.DataFrame(list(node_types.items()), columns=['Type', 'Count'])
                        st.bar_chart(df.set_index('Type'))
                else:
                    st.info("No existing graph data found")

        if tab2:
            with tab2:
                st.write("**Data extracted from your documents:**")
                new_stats = f"""
                - **New Nodes**: {len(state.curated_graph.get('nodes', []))}
                - **New Edges**: {len(state.curated_graph.get('edges', []))}
                - **Entity Types**: {len(set(n.get('type') for n in state.curated_graph.get('nodes', [])))}
                """
                st.markdown(new_stats)

                # Show new node types
                if state.curated_graph.get("nodes"):
                    import pandas as pd
                    new_node_types = {}
                    for node in state.curated_graph.get("nodes", []):
                        node_type = node.get("type", "Unknown")
                        new_node_types[node_type] = new_node_types.get(node_type, 0) + 1

                    if new_node_types:
                        df = pd.DataFrame(list(new_node_types.items()), columns=['Type', 'Count'])
                        st.bar_chart(df.set_index('Type'))

        if tab3:
            with tab3:
                st.write("**Final merged graph (what will be saved):**")
                final_stats = f"""
                - **Total Nodes**: {len(final_nodes)}
                - **Total Edges**: {len(final_edges)}
                - **Nodes Added**: {new_nodes_added}
                - **Edges Added**: {new_edges_added}
                """
                st.markdown(final_stats)

                # Show final distribution
                if final_nodes:
                    import pandas as pd
                    final_node_types = {}
                    for node in final_nodes:
                        node_type = node.get("type", "Unknown")
                        final_node_types[node_type] = final_node_types.get(node_type, 0) + 1

                    if final_node_types:
                        df = pd.DataFrame(list(final_node_types.items()), columns=['Type', 'Count'])
                        st.bar_chart(df.set_index('Type'))

                # Interactive 3D Graph Visualization
                st.subheader("🌐 Interactive 3D Graph")
                st.write("**Live preview of your knowledge graph (same as main website)**")

                if len(final_nodes) > 0:
                    # Create 3D graph HTML
                    graph_3d_html = create_3d_graph_html(state.final_graph)

                    # Display the 3D graph
                    st.components.v1.html(graph_3d_html, height=600, scrolling=False)

                    st.info("💡 **Interactive Controls**: Click and drag to rotate • Scroll to zoom • Click nodes for details")
                else:
                    st.warning("No graph data to visualize")

    st.success("✅ Ready to apply changes!")
    
    # File Management Section
    st.subheader("📁 Graph File Management")

    graph_path = "/home/pedro/projects/chat-w-ontology/public/knowledge-graph.json"

    col1, col2 = st.columns([2, 1])
    with col1:
        st.code(graph_path, language="bash")
        st.caption("This is where your knowledge graph is stored and read by your main application")

    with col2:
        # Check if file exists and show info
        if os.path.exists("../public/knowledge-graph.json"):
            file_size = os.path.getsize("../public/knowledge-graph.json")
            st.metric("Current Size", f"{file_size:,} bytes")
        else:
            st.warning("File not found")

    # Show what happens when you apply changes
    with st.expander("🔍 What happens when you apply changes?"):
        st.write("""
        1. **Backup Created**: Current graph saved as `knowledge-graph-backup-YYYYMMDD_HHMMSS.json`
        2. **Graph Updated**: New data merged with existing graph
        3. **File Saved**: Updated graph written to `knowledge-graph.json`
        4. **Main App Updated**: Your website will automatically use the new data
        """)

        st.info("💡 **Safe Process**: Your original data is always backed up before any changes")

    # Apply changes
    st.subheader("🚀 Apply Changes")
    col1, col2, col3, col4 = st.columns([1, 1, 1, 1])

    with col1:
        if st.button("✅ Apply Changes", type="primary"):
            success, message = save_graph(state.final_graph)
            if success:
                state.stage = "complete"
                st.success("🎉 Graph updated successfully!")
                st.info(message)
                st.rerun()
            else:
                st.error(f"❌ Failed to save: {message}")

    with col2:
        if st.button("💾 Export Preview"):
            # Allow user to download the final graph
            graph_json = json.dumps(state.final_graph, indent=2)
            st.download_button(
                label="📥 Download Final Graph",
                data=graph_json,
                file_name=f"knowledge-graph-preview-{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
                mime="application/json"
            )

    with col3:
        if st.button("🌐 View on Main Site"):
            st.info("🚀 **Opening main website**: http://localhost:5174")
            st.markdown("""
            <script>
                window.open('http://localhost:5174', '_blank');
            </script>
            """, unsafe_allow_html=True)
            st.write("Your updated graph will be visible on the main website!")

    with col4:
        if st.button("⬅️ Back"):
            state.stage = "resolve"
            st.rerun()

def render_complete_stage(state: PipelineState):
    """Stage 6: Complete"""
    st.header("🎉 Pipeline Complete!")
    st.success("Your knowledge graph has been successfully updated!")
    
    # Show final stats
    final_nodes = len(state.final_graph.get("nodes", []))
    final_edges = len(state.final_graph.get("edges", []))

    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Total Nodes", final_nodes)
    with col2:
        st.metric("Total Edges", final_edges)
    with col3:
        st.metric("Status", "✅ Updated")

    # Next steps with main website integration
    st.subheader("🚀 Next Steps")

    col1, col2 = st.columns([2, 1])
    with col1:
        st.write("✅ **Your graph has been successfully updated!**")
        st.write("• 🌐 **View on main website**: Your graph is now live at localhost:5174")
        st.write("• 🔄 **Run additional cycles**: Upload more documents to enhance your graph")
        st.write("• 📝 **Manual fine-tuning**: Use the admin editors for precise adjustments")
        st.write("• 💬 **AI Chat**: Ask questions about your updated graph")

    with col2:
        if st.button("🌐 Open Main Website", type="primary"):
            st.info("🚀 **Opening main website**: http://localhost:5174")
            st.markdown("""
            <script>
                window.open('http://localhost:5174', '_blank');
            </script>
            """, unsafe_allow_html=True)
            st.success("✅ Your updated graph is now visible!")

    st.divider()

    # Pipeline controls
    col1, col2 = st.columns(2)
    with col1:
        if st.button("🔄 Start New Pipeline"):
            st.session_state.pipeline_state = PipelineState()
            st.rerun()

    with col2:
        if st.button("📊 View Graph Stats"):
            st.info(f"""
            **Final Graph Statistics:**
            - Total Nodes: {final_nodes}
            - Total Edges: {final_edges}
            - File Location: `/home/pedro/projects/chat-w-ontology/public/knowledge-graph.json`
            - Last Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            """)

    # Success message
    st.success("🎉 **Pipeline Complete!** Your knowledge graph has been successfully updated and is ready to use on the main website.")

def main():
    """Main pipeline interface"""
    st.set_page_config(
        page_title="Graph Curation Pipeline",
        page_icon="🧠",
        layout="wide"
    )
    
    st.title("🧠 Standalone Graph Curation Pipeline")
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
    
    # Debug info
    with st.sidebar:
        st.subheader("🔧 Pipeline State")
        st.write(f"**Stage**: {state.stage}")
        st.write(f"**Files**: {len(state.uploaded_files)}")
        st.write(f"**Extracted**: {'✅' if state.extracted_data else '❌'}")
        st.write(f"**Nodes**: {len(state.curated_graph.get('nodes', []))}")

if __name__ == "__main__":
    main()
