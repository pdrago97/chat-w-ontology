import os
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


def run_cognee(docs: List[TextDoc]) -> Dict[str, Any]:
    """
    Run Cognee to extract entities/relations and produce a graph.
    Replace this stub with the actual Cognee pipeline per https://docs.cognee.ai
    Expected return shape: { "nodes": [...], "edges": [...] }
    """
    try:
        import cognee  # noqa: F401
    except Exception:
        # Minimal, non-mocking fallback: return empty graph with a helpful message
        # so the caller knows the service is wired but Cognee is not installed yet.
        return {
            "nodes": [],
            "edges": [],
            "_warning": "Cognee not installed or not configured. Install and implement run_cognee().",
        }

    # TODO: Implement Cognee pipeline here.
    # Pseudocode outline (replace with real Cognee API calls):
    # 1) Prepare inputs: texts = [d.text for d in docs]
    # 2) Configure ontology or allow Cognee to infer
    # 3) Run extraction producing entities and relations
    # 4) Map to {nodes:[{id,type,title,...}], edges:[{source,target,relation,...}]}

    raise HTTPException(status_code=501, detail="Cognee pipeline not implemented. See tools/COGNEE_SERVICE.md")


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

