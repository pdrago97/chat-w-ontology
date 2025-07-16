# PocketFlow flow for knowledge graph curation
from pocketflow import Flow
from nodes import ProcessPDFsNode, GenerateFromPDFNode, ProcessConversationNode, GenerateGraphNode, ValidateGraphNode

def create_knowledge_flow():
    """Create the knowledge curation flow"""

    # Create nodes
    process_node = ProcessConversationNode()
    generate_node = GenerateGraphNode()
    validate_node = ValidateGraphNode()

    # Connect nodes
    process_node - "generate_graph" >> generate_node
    generate_node - "validate_graph" >> validate_node

    # Create flow
    return Flow(start=process_node)

def process_user_input(user_message, current_graph=None):
    """Process user input and update knowledge graph"""
    
    shared = {
        "user_message": user_message,
        "current_graph": current_graph or {"nodes": [], "edges": []}
    }
    
    # Create and run flow
    flow = create_knowledge_flow()
    flow.run(shared)
    
    return shared.get("final_graph"), shared.get("extracted_info")

def create_pdf_generation_flow():
    """Create flow for generating graph from PDF"""
    pdf_node = GenerateFromPDFNode()
    return Flow(start=pdf_node)

def create_pdf_upload_flow():
    """Create flow for processing uploaded PDFs"""
    process_node = ProcessPDFsNode()
    generate_node = GenerateFromPDFNode()
    validate_node = ValidateGraphNode()

    # Connect nodes
    process_node - "generate_graph" >> generate_node
    generate_node - "validate_graph" >> validate_node

    return Flow(start=process_node)
