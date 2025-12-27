#!/usr/bin/env python3
"""
Process resume.html with Cognee to generate a knowledge graph.
Outputs JSON in the format expected by the app.

Usage:
    cd tools
    source .venv/bin/activate
    export OPENAI_API_KEY="your-key"
    python cognee_from_resume.py
"""
import asyncio
import json
import os
from pathlib import Path

# Cognee imports
import cognee
from cognee.api.v1.search import SearchType
from cognee.infrastructure.databases.graph import get_graph_engine
from datetime import datetime

# Configuration
RESUME_PATH = Path(__file__).parent.parent / "public" / "assets" / "resume.html"
OUTPUT_PATH = Path(__file__).parent.parent / "app" / "data" / "cognee-graph.json"


async def process_resume():
    """Process resume.html with Cognee and extract knowledge graph."""

    # Configure Cognee with OpenAI API key
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable is required")

    print("🔑 Configuring Cognee with OpenAI...")
    cognee.config.set_llm_config({
        "llm_provider": "openai",
        "llm_model": "gpt-4o-mini",
        "llm_api_key": api_key,
    })

    print(f"📄 Reading resume from: {RESUME_PATH}")
    
    if not RESUME_PATH.exists():
        raise FileNotFoundError(f"Resume not found at {RESUME_PATH}")
    
    resume_content = RESUME_PATH.read_text(encoding="utf-8")
    print(f"   Read {len(resume_content)} characters")
    
    # Reset Cognee state for fresh processing
    print("🔄 Resetting Cognee state...")
    await cognee.prune.prune_data()
    await cognee.prune.prune_system(metadata=True)
    
    # Add the resume content
    print("📥 Adding resume to Cognee...")
    await cognee.add(resume_content, dataset_name="pedro_resume")
    
    # Process with Cognee (cognify)
    print("🧠 Processing with Cognee (this may take a minute)...")
    await cognee.cognify()
    
    # Extract knowledge graph directly from graph engine
    print("🔍 Extracting knowledge graph from Kuzu...")
    graph_engine = await get_graph_engine()
    raw_graph = await graph_engine.get_graph_data()

    # get_graph_data returns a tuple: (nodes_list, edges_list)
    raw_nodes, raw_edges = raw_graph
    print(f"   Raw graph: {len(raw_nodes)} nodes, {len(raw_edges)} edges")

    # Transform to our format
    nodes = []
    edges = []
    node_ids = set()

    # Process nodes - each is a tuple: (node_id, properties_dict)
    for node_tuple in raw_nodes:
        node_id = str(node_tuple[0])
        props = node_tuple[1] if len(node_tuple) > 1 else {}

        if not node_id or node_id in node_ids:
            continue

        node_ids.add(node_id)

        # Extract node properties
        label = props.get('name') or props.get('label') or props.get('type', 'Unknown')
        node_type = props.get('type', 'Entity')
        description = props.get('description') or props.get('text', '')

        # Skip internal document chunks (keep only entities)
        if node_type in ['DocumentChunk', 'TextDocument']:
            continue

        # Determine category based on type or name
        name_lower = str(label).lower()
        type_lower = str(node_type).lower()

        if 'person' in type_lower or 'person' in name_lower:
            category = 'person'
        elif 'org' in type_lower or 'organization' in name_lower:
            category = 'organization'
        elif 'profession' in type_lower or 'engineer' in name_lower or 'developer' in name_lower:
            category = 'role'
        elif 'programming' in type_lower or 'framework' in type_lower or 'library' in type_lower:
            category = 'skill'
        elif 'university' in type_lower or 'education' in name_lower:
            category = 'education'
        elif 'date' in type_lower or name_lower.startswith('20'):
            category = 'date'
        elif 'website' in type_lower:
            category = 'project'
        else:
            category = 'concept'

        nodes.append({
            "id": node_id,
            "label": str(label)[:100].title() if label else "Unknown",
            "type": str(node_type),
            "category": category,
            "description": str(description)[:500],
            "data": {"cognee": True}
        })

    # Rebuild node_ids after filtering
    node_ids = {n["id"] for n in nodes}

    # Process edges - each is a tuple: (source_id, target_id, rel_type, props_dict)
    for edge_tuple in raw_edges:
        source = str(edge_tuple[0])
        target = str(edge_tuple[1])
        rel_type = edge_tuple[2] if len(edge_tuple) > 2 else "RELATED_TO"

        if source in node_ids and target in node_ids:
            edges.append({
                "source": source,
                "target": target,
                "label": str(rel_type),
                "type": str(rel_type),
                "data": {"cognee": True}
            })

    graph_data = {
        "nodes": nodes,
        "edges": edges,
        "lastUpdated": datetime.now().isoformat(),
        "source": "cognee",
        "resumePath": str(RESUME_PATH),
        "nodeCount": len(nodes),
        "edgeCount": len(edges)
    }

    # Save to file
    print(f"💾 Saving graph to: {OUTPUT_PATH}")
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(graph_data, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"✅ Done! Generated {len(nodes)} nodes and {len(edges)} edges")
    return graph_data


if __name__ == "__main__":
    result = asyncio.run(process_resume())
    print("\n📊 Preview:")
    print(f"   Nodes: {result['nodeCount']}")
    print(f"   Edges: {result['edgeCount']}")
    if result['nodes']:
        print("\n   Sample nodes:")
        for node in result['nodes'][:5]:
            print(f"     - {node['label']} ({node['type']})")

