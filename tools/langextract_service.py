"""
LangExtract FastAPI microservice (Option A friendly):
- POST /extract: run LangExtract on text or URL
- Returns: {
    raw: <AnnotatedDocument-ish dict>,
    nodes: [...],
    edges: [...],
    proposed_changes: GraphChange[],
    meta: { model_id, passes, durations }
  }

Notes:
- Uses OpenAI by default (your OPENAI_API_KEY). You can change model_id to Gemini later.
- Keeps code compact and defensive. Designed for local-only deployments.
"""
from __future__ import annotations
import os
import time
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Request, status
from pydantic import BaseModel

# LangExtract imports (with OpenAI provider)
import langextract as lx  # type: ignore

app = FastAPI(title="LangExtract Service", version="0.1")

# Optional bearer token for simple auth when exposed behind a proxy
SERVICE_TOKEN = os.environ.get("LANGEXTRACT_SERVICE_TOKEN")


# --------- Pydantic models ---------
class ExtractRequest(BaseModel):
    text: Optional[str] = None
    url: Optional[str] = None
    model_id: Optional[str] = "gpt-4o-mini"  # OpenAI path by default
    extraction_passes: Optional[int] = 2
    max_workers: Optional[int] = 6
    max_char_buffer: Optional[int] = 1200
    include_visualization: Optional[bool] = False


class ExtractResponse(BaseModel):
    raw: Dict[str, Any]
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    proposed_changes: List[Dict[str, Any]]
    meta: Dict[str, Any]
    visualization_html: Optional[str] = None


# --------- Prompt & examples (resume ontology) ---------
PROMPT = """
Extract a curriculum/resume knowledge graph:
- Entities (use exact text spans): Person, Education, Experience, Project, Skill, Group, Status
- Relations (also as extractions): worked_at, studied_at, built, used, member_of, collaborated_with, reported_to
- Do not paraphrase entity text; use exact source text spans
- Provide attributes per entity, e.g.:
  Person: { full_name, headline?, location? }
  Education: { institution, degree?, field?, start_date?, end_date? }
  Experience: { role, company, start_date?, end_date?, location?, highlights? }
  Project: { name, summary?, repo_url?, stack? }
  Skill: { name, level? }
  Group: { name, kind? }
  Status: { label }
- For relations, include attributes: { relation, source_text?, target_text?, sourceId?, targetId? }
- Avoid overlapping spans; high precision on span boundaries.
""".strip()

EXAMPLES = [
    lx.data.ExampleData(
        text=(
            "Pedro worked at MoveUp AI as Lead Engineer (2019–2020), built a recommender, "
            "and used Python and React. Graduated from UFSC."),
        extractions=[
            lx.data.Extraction(
                extraction_class="Person",
                extraction_text="Pedro",
                attributes={"full_name": "Pedro"},
            ),
            lx.data.Extraction(
                extraction_class="Experience",
                extraction_text="worked at MoveUp AI as Lead Engineer (2019–2020)",
                attributes={
                    "role": "Lead Engineer",
                    "company": "MoveUp AI",
                    "start_date": "2019",
                    "end_date": "2020",
                },
            ),
            lx.data.Extraction(
                extraction_class="Project",
                extraction_text="recommender",
                attributes={"name": "Recommender", "stack": ["Python", "React"]},
            ),
            lx.data.Extraction(
                extraction_class="Skill",
                extraction_text="Python",
                attributes={"name": "Python"},
            ),
            lx.data.Extraction(
                extraction_class="Education",
                extraction_text="Graduated from UFSC",
                attributes={"institution": "UFSC"},
            ),
            lx.data.Extraction(
                extraction_class="Relation",
                extraction_text="worked at",
                attributes={
                    "relation": "worked_at",
                    "source_text": "Pedro",
                    "target_text": "MoveUp AI",
                },
            ),
        ],
    )
]


# --------- Utilities ---------
def _slug(s: str) -> str:
    return (
        s.lower().strip().replace(" ", "_").replace("/", "-").replace("|", "-")
    )[:80]


def _result_to_dict(doc: Any) -> Dict[str, Any]:
    """LangExtract returns an AnnotatedDocument-like object. Convert to dict defensively."""
    try:
        # Many LX objects provide .to_dict()
        return doc.to_dict()  # type: ignore[attr-defined]
    except Exception:
        # Fallback: try vars()
        try:
            return dict(doc) if isinstance(doc, dict) else {k: getattr(doc, k) for k in dir(doc) if not k.startswith("_")}
        except Exception:
            return {"raw": str(doc)}


def _map_extractions_to_graph(raw: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
    """
    Map LangExtract extractions to nodes/edges.
    Expects raw["extractions"] or raw["annotations"][i]["extractions"]. Skips invalids gracefully.
    """
    def iter_extractions():
        # 1) direct top-level
        if isinstance(raw.get("extractions"), list):
            for ex in raw["extractions"]:
                yield ex
        # 2) nested under annotated_documents/items
        ann = raw.get("annotations") or raw.get("items") or []
        for item in ann or []:
            for ex in item.get("extractions", []) if isinstance(item, dict) else []:
                yield ex

    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    node_index: Dict[str, Dict[str, Any]] = {}

    for ex in iter_extractions():
        if not isinstance(ex, dict):
            continue
        clazz = str(ex.get("extraction_class") or ex.get("class") or "").strip()
        text = str(ex.get("extraction_text") or ex.get("text") or "").strip()
        attrs = ex.get("attributes") if isinstance(ex.get("attributes"), dict) else {}
        spans = ex.get("spans") if isinstance(ex.get("spans"), list) else []

        def add_node(ntype: str, label: str, extra: Dict[str, Any]):
            node_id = str(extra.get("id") or _slug(label) or _slug(ntype + "_" + label))
            if node_id in node_index:
                node_index[node_id].update(extra)
                return
            node = {
                "id": node_id,
                "label": label or node_id,
                "type": ntype,
                "sourceSpans": spans,
                **extra,
            }
            node_index[node_id] = node
            nodes.append(node)

        if clazz in {"Person", "Education", "Experience", "Project", "Skill", "Group", "Status"}:
            add_node(clazz, text or attrs.get("name") or attrs.get("full_name") or clazz, attrs)
            continue

        if clazz in {"Relation", "Edge"}:
            # Expect attributes with relation and either explicit ids or text names
            relation = str(attrs.get("relation") or "").strip() or "related_to"
            sid = attrs.get("sourceId")
            tid = attrs.get("targetId")
            stext = attrs.get("source_text")
            ttext = attrs.get("target_text")
            # Try to resolve nodes if text was seen earlier
            def resolve(label_or_id: Optional[str]) -> Optional[str]:
                if not label_or_id:
                    return None
                lid = str(label_or_id)
                if lid in node_index:
                    return lid
                # match by label
                for n in nodes:
                    if str(n.get("label")).lower() == lid.lower():
                        return n["id"]
                # fallback
                return _slug(lid)

            src = str(sid or resolve(stext) or "").strip()
            tgt = str(tid or resolve(ttext) or "").strip()
            if src and tgt and src != tgt:
                edges.append({
                    "id": f"{src}-{relation}-{tgt}",
                    "source": src,
                    "target": tgt,
                    "relation": relation,
                    "sourceSpans": spans,
                    "data": {k: v for k, v in attrs.items() if k not in {"relation","sourceId","targetId","source_text","target_text"}},
                })

    return {"nodes": nodes, "edges": edges}


def _auth_check(request: Request):
    # Simple bearer token check for optional protection
    if SERVICE_TOKEN:
        auth = request.headers.get("authorization") or request.headers.get("Authorization")
        if not auth or not auth.startswith("Bearer ") or auth.split(" ", 1)[1].strip() != SERVICE_TOKEN:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def _to_proposed_changes(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    changes: List[Dict[str, Any]] = []
    for n in nodes:
        changes.append({"type": "new_node", "data": n})
    for e in edges:
        changes.append({"type": "new_edge", "data": e})
    return changes


# --------- API ---------
@app.post("/extract", response_model=ExtractResponse)
def extract(req: ExtractRequest, request: Request):
    _auth_check(request)
    if not req.text and not req.url:
        raise HTTPException(status_code=400, detail="Provide 'text' or 'url'")

    # Provider key: OpenAI path uses OPENAI_API_KEY; for Gemini, LANGEXTRACT_API_KEY
    api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("LANGEXTRACT_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Missing OPENAI_API_KEY or LANGEXTRACT_API_KEY")

    t0 = time.time()
    # Call LangExtract
    try:
        doc = lx.extract(
            text_or_documents=req.url if req.url else req.text,
            prompt_description=PROMPT,
            examples=EXAMPLES,
            model_id=req.model_id or "gpt-4o-mini",
            api_key=api_key,
            language_model_type=lx.inference.OpenAILanguageModel,
            extraction_passes=max(1, int(req.extraction_passes or 1)),
            max_workers=max(1, int(req.max_workers or 1)),
            max_char_buffer=max(500, int(req.max_char_buffer or 1000)),
            fence_output=True,               # required for OpenAI in LangExtract
            use_schema_constraints=False,    # OpenAI path
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LangExtract failed: {e}")

    raw = _result_to_dict(doc)
    mapped = _map_extractions_to_graph(raw)
    nodes, edges = mapped["nodes"], mapped["edges"]
    changes = _to_proposed_changes(nodes, edges)

    visualization_html = None
    if req.include_visualization:
        try:
            # Generate HTML in-memory from a JSONL-like envelope
            # Save to temp JSONL
            from tempfile import NamedTemporaryFile
            from pathlib import Path

            tmp = NamedTemporaryFile("w", suffix=".jsonl", delete=False)
            try:
                # Wrap into the expected LX JSONL format
                import json
                tmp.write(json.dumps(raw) + "\n")
                tmp.flush()
                visualization_html = lx.visualize(tmp.name)
            finally:
                tmp.close()
                try:
                    Path(tmp.name).unlink(missing_ok=True)  # type: ignore[arg-type]
                except Exception:
                    pass
        except Exception:
            visualization_html = None

    return ExtractResponse(
        raw=raw,
        nodes=nodes,
        edges=edges,
        proposed_changes=changes,
        meta={
            "model_id": req.model_id,
            "extraction_passes": req.extraction_passes,
            "max_workers": req.max_workers,
            "elapsed_sec": round(time.time() - t0, 3),
        },
        visualization_html=visualization_html,
    )


# Run: uvicorn tools.langextract_service:app --reload --port 8788

