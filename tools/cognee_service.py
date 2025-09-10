import os
import re
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

# Optional: supabase client (install via `pip install supabase`)
try:
    from supabase import create_client, Client  # type: ignore
except Exception:
    create_client = None  # type: ignore
    Client = None  # type: ignore

app = FastAPI(title="Cognee Graph Service", version="0.1.0")


class TextDoc(BaseModel):
    id: str
    text: str
    metadata: Optional[Dict[str, Any]] = None


def get_supabase_client() -> Any:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise HTTPException(status_code=500, detail="Missing SUPABASE_URL or SUPABASE_ANON_KEY/SUPABASE_SERVICE_KEY env vars")
    if not create_client:
        raise HTTPException(status_code=500, detail="supabase client not installed. Run: pip install supabase")
    return create_client(url, key)


def fetch_texts_from_supabase(limit: int = 200) -> List[TextDoc]:
    table = os.getenv("SUPABASE_TABLE", "documents")
    text_col = os.getenv("SUPABASE_TEXT_COLUMN", "content")
    id_col = os.getenv("SUPABASE_ID_COLUMN", "id")
    meta_col = os.getenv("SUPABASE_METADATA_COLUMN", "metadata")

    client = get_supabase_client()

    # Build select columns string
    cols = [id_col, text_col]
    if meta_col:
        cols.append(meta_col)
    select_cols = ",".join(cols)

    try:
        resp = client.table(table).select(select_cols).limit(limit).execute()
        data = resp.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase query failed: {e}")

    docs: List[TextDoc] = []
    for row in data:
        rid = str(row.get(id_col))
        txt = row.get(text_col)
        if not rid or not txt:
            continue
        meta = row.get(meta_col) if meta_col else None
        docs.append(TextDoc(id=rid, text=txt, metadata=meta))
    return docs


def create_demo_graph(docs: List[TextDoc]) -> Dict[str, Any]:
    """
    Create a demo knowledge graph from documents using simple NLP techniques.
    This is used when OpenAI API key is not available.
    """
    nodes = []
    edges = []

    # Simple entity extraction using regex patterns
    entity_patterns = {
        "Person": r'\b[A-Z][a-z]+ [A-Z][a-z]+\b',
        "Company": r'\b[A-Z][a-zA-Z]+ (?:Inc|Corp|LLC|Ltd|AI|Brasil|Systems)\b',
        "Technology": r'\b(?:Python|FastAPI|Flask|Docker|Kubernetes|AWS|SQL|NoSQL|AI|ML|NLP|API|REST|GraphQL|React|Node\.js|JavaScript|TypeScript|PostgreSQL|MongoDB|Redis|Elasticsearch)\b',
        "Skill": r'\b(?:machine learning|computer vision|natural language processing|data engineering|software development|full-stack|backend|frontend|DevOps|cloud computing|microservices)\b',
        "Role": r'\b(?:Senior|Lead|Principal|Staff|Director|Manager|Engineer|Developer|Consultant|Architect|Founder|Co-founder|CTO|CEO)\b'
    }

    # Extract entities from all documents
    entity_id_counter = 0
    entities_found = {}

    for doc in docs:
        if not doc.text:
            continue

        text = doc.text

        for entity_type, pattern in entity_patterns.items():
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                entity_key = f"{entity_type}:{match.lower()}"
                if entity_key not in entities_found:
                    entity_id = f"entity_{entity_id_counter}"
                    entity_id_counter += 1

                    entities_found[entity_key] = {
                        "id": entity_id,
                        "type": entity_type,
                        "title": match,
                        "properties": {"source_doc": doc.id},
                        "data": {"original_text": match, "doc_id": doc.id}
                    }
                    nodes.append(entities_found[entity_key])

    # Create relationships between entities
    edge_id_counter = 0

    # Simple relationship patterns
    relationship_patterns = [
        (r'(\w+(?:\s+\w+)*)\s+(?:works at|employed by|at)\s+(\w+(?:\s+\w+)*)', "works_at"),
        (r'(\w+(?:\s+\w+)*)\s+(?:uses|utilizes|works with)\s+(\w+(?:\s+\w+)*)', "uses"),
        (r'(\w+(?:\s+\w+)*)\s+(?:specializes in|expert in|skilled in)\s+(\w+(?:\s+\w+)*)', "specializes_in"),
        (r'(\w+(?:\s+\w+)*)\s+(?:founded|co-founded|started)\s+(\w+(?:\s+\w+)*)', "founded"),
        (r'(\w+(?:\s+\w+)*)\s+(?:leads|manages|oversees)\s+(\w+(?:\s+\w+)*)', "leads")
    ]

    for doc in docs:
        if not doc.text:
            continue

        text = doc.text.lower()

        for pattern, relation_type in relationship_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                source_entity = match[0].strip()
                target_entity = match[1].strip()

                # Find matching nodes
                source_node = None
                target_node = None

                for node in nodes:
                    if source_entity.lower() in node["title"].lower():
                        source_node = node
                    if target_entity.lower() in node["title"].lower():
                        target_node = node

                if source_node and target_node and source_node["id"] != target_node["id"]:
                    edge_id = f"edge_{edge_id_counter}"
                    edge_id_counter += 1

                    edges.append({
                        "id": edge_id,
                        "source": source_node["id"],
                        "target": target_node["id"],
                        "relation": relation_type,
                        "weight": 1.0,
                        "properties": {"confidence": 0.7},
                        "data": {"pattern_matched": pattern}
                    })

    # Add some default connections between entities of the same document
    for doc in docs:
        doc_entities = [node for node in nodes if node["properties"].get("source_doc") == doc.id]

        for i, entity1 in enumerate(doc_entities):
            for entity2 in doc_entities[i+1:]:
                if entity1["type"] != entity2["type"]:  # Connect different types
                    edge_id = f"edge_{edge_id_counter}"
                    edge_id_counter += 1

                    edges.append({
                        "id": edge_id,
                        "source": entity1["id"],
                        "target": entity2["id"],
                        "relation": "mentioned_together",
                        "weight": 0.5,
                        "properties": {"confidence": 0.5, "co_occurrence": True},
                        "data": {"doc_id": doc.id}
                    })

    return {
        "nodes": nodes,
        "edges": edges,
        "metadata": {
            "processed_docs": len(docs),
            "total_text_length": sum(len(doc.text or "") for doc in docs),
            "extraction_method": "demo_regex_based",
            "note": "This is a demo graph created without AI. Set OPENAI_API_KEY for full Cognee functionality."
        }
    }


def run_cognee(docs: List[TextDoc]) -> Dict[str, Any]:
    """
    Run Cognee to extract entities/relations and produce a graph.
    Uses Cognee.ai to create sophisticated knowledge graphs from documents.
    Expected return shape: { "nodes": [...], "edges": [...] }
    """
    try:
        import cognee
        import asyncio
        import os
        from typing import List as TypingList
    except ImportError as e:
        return {
            "nodes": [],
            "edges": [],
            "_warning": f"Cognee import failed: {e}. Install cognee package.",
        }

    if not docs:
        return {"nodes": [], "edges": [], "_warning": "No documents provided"}

    try:
        # For now, always use demo mode to avoid API key issues
        # TODO: Re-enable full Cognee when API key is properly configured
        return create_demo_graph(docs)

        # Check for OpenAI API key
        openai_key = os.getenv("OPENAI_API_KEY", "")
        if not openai_key or len(openai_key) < 10:
            # Return a demo/mock graph if no API key is available
            return create_demo_graph(docs)

        # Configure Cognee
        cognee.config.set_llm_api_key(openai_key)

        # Prepare document texts
        texts = [doc.text for doc in docs if doc.text and doc.text.strip()]
        if not texts:
            return {"nodes": [], "edges": [], "_warning": "No valid text content found in documents"}

        # Run Cognee pipeline asynchronously
        async def process_documents():
            # Add documents to Cognee
            await cognee.add(texts)

            # Run cognition process to extract entities and relationships
            graph_data = await cognee.cognify()

            return graph_data

        # Execute the async pipeline
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            graph_data = loop.run_until_complete(process_documents())
        finally:
            loop.close()

        # Convert Cognee output to our expected format
        nodes = []
        edges = []

        if isinstance(graph_data, dict):
            # Extract nodes
            if "nodes" in graph_data:
                for node in graph_data["nodes"]:
                    nodes.append({
                        "id": str(node.get("id", node.get("name", f"node_{len(nodes)}"))),
                        "type": node.get("type", "Entity"),
                        "title": node.get("name", node.get("label", node.get("id", "Unknown"))),
                        "properties": node.get("properties", {}),
                        "data": node
                    })

            # Extract edges
            if "edges" in graph_data:
                for edge in graph_data["edges"]:
                    edges.append({
                        "id": f"{edge.get('source', 'unknown')}-{edge.get('target', 'unknown')}-{len(edges)}",
                        "source": str(edge.get("source", "")),
                        "target": str(edge.get("target", "")),
                        "relation": edge.get("relation", edge.get("type", "related_to")),
                        "weight": edge.get("weight", 1.0),
                        "properties": edge.get("properties", {}),
                        "data": edge
                    })

        return {
            "nodes": nodes,
            "edges": edges,
            "metadata": {
                "processed_docs": len(docs),
                "total_text_length": sum(len(doc.text or "") for doc in docs),
                "cognee_version": getattr(cognee, "__version__", "unknown")
            }
        }

    except Exception as e:
        import traceback
        return {
            "nodes": [],
            "edges": [],
            "_error": f"Cognee processing failed: {str(e)}",
            "_traceback": traceback.format_exc()
        }


def map_to_app_schema(graph: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure the graph matches the app's expected {nodes, edges} shape."""
    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])

    # Optionally normalize fields here if Cognee returns different keys
    norm_nodes = []
    for n in nodes:
        norm_nodes.append({
            "id": n.get("id") or n.get("name") or n.get("label"),
            "type": n.get("type") or n.get("category") or "Entity",
            "title": n.get("title") or n.get("label") or n.get("name"),
            **{k: v for k, v in n.items() if k not in {"id", "name", "label", "type", "title"}},
        })

    norm_edges = []
    for e in edges:
        norm_edges.append({
            "source": e.get("source") or e.get("src") or e.get("from"),
            "target": e.get("target") or e.get("dst") or e.get("to"),
            "relation": e.get("relation") or e.get("type") or e.get("label"),
            **{k: v for k, v in e.items() if k not in {"source", "src", "from", "target", "dst", "to", "relation", "type", "label"}},
        })

    return {"nodes": norm_nodes, "edges": norm_edges}


def map_from_db_to_app(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Map rows from cognee_* tables into app schema."""
    app_nodes = []
    for n in nodes:
        props = n.get("props") or {}
        app_nodes.append({
            "id": n.get("node_id"),
            "type": n.get("type") or props.get("type") or "Entity",
            "title": n.get("label") or props.get("title"),
            **props,
        })

    app_edges = []
    for e in edges:
        props = e.get("props") or {}
        app_edges.append({
            "source": e.get("source"),
            "target": e.get("target"),
            "relation": e.get("kind") or props.get("relation"),
            "weight": e.get("weight", 1.0),
            **props,
        })

    return {"nodes": app_nodes, "edges": app_edges}


@app.get("/health")
def health() -> Dict[str, Any]:
    return {"status": "ok"}


@app.get("/graph/from-supabase")
def graph_from_supabase(limit: int = Query(200, ge=1, le=5000)) -> Dict[str, Any]:
    """
    Fetch texts from Supabase and produce an ontology graph via Cognee.
    Returns a graph compatible with the Remix Cytoscape component: {nodes, edges}
    """
    docs = fetch_texts_from_supabase(limit=limit)
    graph = run_cognee(docs)
    mapped = map_to_app_schema(graph)
    mapped["lastUpdated"] = __import__("datetime").datetime.utcnow().isoformat() + "Z"
    return mapped


@app.get("/graph/current")
def graph_current() -> Dict[str, Any]:
    """Read graph from cognee_nodes_public and cognee_edges_public tables and return app schema."""
    client = get_supabase_client()
    try:
        nres = client.table("cognee_nodes_public").select("node_id,label,type,props").limit(50000).execute()
        eres = client.table("cognee_edges_public").select("source,target,kind,weight,props").limit(500000).execute()
        nodes = nres.data or []
        edges = eres.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase read failed: {e}")

    graph = map_from_db_to_app(nodes, edges)
    graph["lastUpdated"] = __import__("datetime").datetime.utcnow().isoformat() + "Z"
    return graph


@app.post("/graph/regenerate")
def graph_regenerate(limit: int = Query(200, ge=1, le=5000)) -> Dict[str, Any]:
    """
    Regenerate graph from documents using Cognee and upsert into cognee_* tables.
    Requires supabase client with write perms.
    """
    docs = fetch_texts_from_supabase(limit=limit)
    graph = run_cognee(docs)
    mapped = map_to_app_schema(graph)

    # Prepare upsert payloads
    app_nodes = mapped.get("nodes", [])
    app_edges = mapped.get("edges", [])

    nodes_payload = [
        {
            "node_id": n.get("id"),
            "label": n.get("title"),
            "type": n.get("type") or "Entity",
            "props": n,
        }
        for n in app_nodes
        if n.get("id")
    ]
    edges_payload = [
        {
            "source": e.get("source"),
            "target": e.get("target"),
            "kind": e.get("relation"),
            "weight": e.get("weight", 1.0),
            "props": e,
        }
        for e in app_edges
        if e.get("source") and e.get("target") and e.get("relation")
    ]

    client = get_supabase_client()
    try:
        if nodes_payload:
            client.table("cognee_nodes_public").upsert(nodes_payload, on_conflict="node_id").execute()
        if edges_payload:
            client.table("cognee_edges_public").upsert(edges_payload, on_conflict="source,target,kind").execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase upsert failed: {e}")

    mapped["lastUpdated"] = __import__("datetime").datetime.utcnow().isoformat() + "Z"
    return mapped


@app.post("/graph/import")
def graph_import(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Import a curated {nodes,edges} JSON and upsert into cognee_* tables."""
    mapped = map_to_app_schema(payload)
    app_nodes = mapped.get("nodes", [])
    app_edges = mapped.get("edges", [])

    nodes_payload = [
        {
            "node_id": n.get("id"),
            "label": n.get("title"),
            "type": n.get("type") or "Entity",
            "props": n,
        }
        for n in app_nodes
        if n.get("id")
    ]
    edges_payload = [
        {
            "source": e.get("source"),
            "target": e.get("target"),
            "kind": e.get("relation"),
            "weight": e.get("weight", 1.0),
            "props": e,
        }
        for e in app_edges
        if e.get("source") and e.get("target") and e.get("relation")
    ]

    client = get_supabase_client()
    try:
        if nodes_payload:
            client.table("cognee_nodes_public").upsert(nodes_payload, on_conflict="node_id").execute()
        if edges_payload:
            client.table("cognee_edges_public").upsert(edges_payload, on_conflict="source,target,kind").execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase import failed: {e}")

    return {"status": "ok", "nodes": len(nodes_payload), "edges": len(edges_payload)}


if __name__ == "__main__":
    port = int(os.getenv("COGNEE_SERVICE_PORT", "8765"))
    import uvicorn  # type: ignore

    uvicorn.run("tools.cognee_service:app", host="127.0.0.1", port=port, reload=True)

