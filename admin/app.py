# Simple Streamlit admin interface for knowledge curation
import streamlit as st
import json
import os
from flow import process_user_input, create_knowledge_flow
from graph_editor import render_graph_editor
from graph_utils import load_and_normalize_graph
from nodes import GenerateFromPDFNode

# Load current graph with consistency checks
def load_current_graph():
    graph, errors, warnings = load_and_normalize_graph()

    if errors:
        st.error("⚠️ Graph validation errors detected:")
        for error in errors:
            st.error(f"• {error}")

    if warnings:
        st.warning("ℹ️ Graph warnings:")
        for warning in warnings:
            st.warning(f"• {warning}")

    return graph

# Streamlit app
st.title("🧠 Knowledge Graph Admin")
st.write("Curate Pedro's profile knowledge through chat, PDF processing, and manual editing")

# Initialize session state
if "messages" not in st.session_state:
    st.session_state.messages = []

# Create tabs
tab1, tab2, tab3, tab4 = st.tabs(["💬 Chat Curation v2", "📄 PDF Generation", "📝 Manual Editor", "🛠️ Flexible Editor"])

current_graph = load_current_graph()

with tab1:
    from chat_curation_v2 import render_chat_curation_v2
    render_chat_curation_v2()



with tab2:
    st.header("📄 PDF-based Graph Generation")
    st.write("Upload multiple PDF files and generate comprehensive knowledge graph")

    # File upload
    uploaded_files = st.file_uploader(
        "Choose PDF files",
        type="pdf",
        accept_multiple_files=True,
        help="Upload one or more PDF files (resumes, CVs, portfolios, etc.)"
    )

    if uploaded_files:
        st.write(f"📁 **{len(uploaded_files)} file(s) uploaded:**")
        for file in uploaded_files:
            st.write(f"• {file.name} ({file.size} bytes)")

    col1, col2 = st.columns([1, 1])

    with col1:
        if st.button("🚀 Generate Graph from Uploaded PDFs", type="primary", disabled=not uploaded_files):
            with st.spinner("Processing PDF files with PocketFlow..."):
                try:
                    from nodes import ProcessPDFsNode
                    from flow import create_pdf_generation_flow

                    # Create shared data with uploaded files
                    shared = {"uploaded_files": uploaded_files}

                    # Process PDFs and generate graph
                    pdf_processor = ProcessPDFsNode()
                    pdf_generator = GenerateFromPDFNode()

                    # Process PDFs
                    pdf_processor.run(shared)

                    if "pdf_contents" in shared:
                        # Generate graph from processed content
                        pdf_generator.run(shared)

                        if "pdf_generated_graph" in shared:
                            # Save generated graph
                            with open("../public/knowledge-graph.json", "w") as f:
                                json.dump(shared["pdf_generated_graph"], f, indent=2)

                            st.success("✅ Graph generated successfully from uploaded PDFs!")
                            st.info("🔄 Main application will auto-refresh in 30 seconds, or click Refresh button")

                            # Show summary
                            graph = shared["pdf_generated_graph"]
                            st.metric("Nodes Created", len(graph.get("nodes", [])))
                            st.metric("Connections Created", len(graph.get("edges", [])))

                            with st.expander("📊 View Generated Graph"):
                                st.json(graph)

                            # Force refresh of current graph display
                            st.session_state.current_graph = shared["pdf_generated_graph"]
                            st.rerun()
                        else:
                            st.warning("⚠️ No graph generated from PDF content.")
                    else:
                        st.error("❌ Failed to process PDF files.")

                except Exception as e:
                    st.error(f"❌ Error processing PDFs: {e}")
                    import traceback
                    st.code(traceback.format_exc())

    with col2:
        if st.button("🔄 Use Existing PDF (Fallback)"):
            with st.spinner("Using existing PDF processor..."):
                try:
                    # Use existing PDF processor as fallback
                    pdf_node = GenerateFromPDFNode()
                    shared = {}

                    # Run PDF processing
                    result = pdf_node.run(shared)

                    if "pdf_graph_error" in shared:
                        st.error(f"❌ Error: {shared['pdf_graph_error']}")
                    elif "pdf_generated_graph" in shared:
                        # Save generated graph
                        with open("../public/knowledge-graph.json", "w") as f:
                            json.dump(shared["pdf_generated_graph"], f, indent=2)

                        st.success("✅ Graph generated from existing PDF!")
                        st.rerun()
                    else:
                        st.warning("⚠️ No graph generated. Check PDF processor setup.")

                except Exception as e:
                    st.error(f"❌ Error generating graph: {e}")

    st.info("💡 Upload multiple PDF files for comprehensive graph generation, or use the fallback option to process existing PDF content.")

with tab3:
    st.header("📝 Manual Graph Editor")
    render_graph_editor(current_graph)

with tab4:
    from flexible_graph_editor import render_flexible_graph_editor
    render_flexible_graph_editor()

# Sidebar with current graph info and examples
with st.sidebar:
    st.header("📊 Current Graph Stats")
    current_graph = load_current_graph()
    st.metric("Nodes", len(current_graph.get("nodes", [])))
    st.metric("Edges", len(current_graph.get("edges", [])))

    if st.button("🔄 Refresh Main App"):
        st.success("Graph updated! Refresh the main application to see changes.")

    st.header("💡 Example Commands")
    st.markdown("""
    **Add Experience:**
    - "I worked at Microsoft as a Senior Developer from 2023-2024 using React and Node.js"

    **Add Skills:**
    - "Add my new AI/ML skills: TensorFlow, PyTorch, Scikit-learn"

    **Add Education:**
    - "I got my Master's in Computer Science from MIT in 2020"

    **Update Existing:**
    - "Update my QI Tech experience to include Apache Kafka and Redis"

    **Remove Items:**
    - "Remove the old internship at Company X"
    """)

    st.header("🔧 Graph Nodes")
    if current_graph.get("nodes"):
        node_types = {}
        for node in current_graph["nodes"]:
            node_type = node.get("type", "Unknown")
            if node_type not in node_types:
                node_types[node_type] = []
            node_types[node_type].append(node.get("id", "Unknown"))

        for node_type, node_ids in node_types.items():
            with st.expander(f"{node_type} ({len(node_ids)})"):
                for node_id in node_ids[:5]:  # Show first 5
                    st.text(f"• {node_id}")
                if len(node_ids) > 5:
                    st.text(f"... and {len(node_ids) - 5} more")
