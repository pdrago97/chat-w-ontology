# LangExtract POC: Streamlit app that reads resume PDF(s), extracts entities/relations,
# and emits a nodes/edges graph compatible with the main app (knowledge-graph.json),
# plus ontology-backed JSON-LD and a quick visual. Simple, local-only POC.
#
# Usage:
#   pip install streamlit langextract PyPDF2
#   export OPENAI_API_KEY=sk-...   # or LANGEXTRACT_API_KEY for Gemini path
#   streamlit run admin/langextract_poc.py --server.port 8510

from __future__ import annotations
import io
import json
import os
import requests
from typing import Any, Dict, List, Optional

import streamlit as st

# Optional dependency; give a friendly message if missing
try:
    import langextract as lx  # type: ignore
except Exception:
    lx = None  # type: ignore

try:
    from PyPDF2 import PdfReader
except Exception:
    PdfReader = None  # type: ignore

PROMPT = (
    """
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
    - Avoid overlapping spans; high precision on span boundaries; avoid hallucinating.
    """.strip()
)

EXAMPLES: List[Any] = []  # minimal; prompt should be enough for POC


def extract_pdf_text(uploaded_pdf) -> str:
    if not PdfReader:
        raise RuntimeError("PyPDF2 not installed. pip install PyPDF2")
    content = uploaded_pdf.read()
    reader = PdfReader(io.BytesIO(content))
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    return text


def map_lx_to_graph(raw: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
    """Map LangExtract extractions to { nodes, edges }. Compact version."""
    def iter_extractions():
        if isinstance(raw.get("extractions"), list):
            for ex in raw["extractions"]:
                yield ex
        for item in (raw.get("annotations") or raw.get("items") or []) or []:
            for ex in item.get("extractions", []) if isinstance(item, dict) else []:
                yield ex

    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    node_index: Dict[str, Dict[str, Any]] = {}

    def slug(s: str) -> str:
        return (s.lower().strip().replace(" ", "_").replace("/", "-")[:80]) or "node"

    def add_node(ntype: str, label: str, extra: Dict[str, Any]):
        node_id = str(extra.get("id") or slug(label) or slug(ntype + "_" + label))
        if node_id in node_index:
            node_index[node_id].update(extra)
            return
        node = {"id": node_id, "label": label or node_id, "type": ntype, **extra}
        node_index[node_id] = node
        nodes.append(node)

    for ex in iter_extractions():
        if not isinstance(ex, dict):
            continue
        clazz = str(ex.get("extraction_class") or ex.get("class") or "").strip()
        text = str(ex.get("extraction_text") or ex.get("text") or "").strip()
        attrs = ex.get("attributes") if isinstance(ex.get("attributes"), dict) else {}

        if clazz in {"Person", "Education", "Experience", "Project", "Skill", "Group", "Status"}:
            add_node(clazz, text or attrs.get("name") or attrs.get("full_name") or clazz, attrs)
            continue

        if clazz in {"Relation", "Edge"}:
            rel = str(attrs.get("relation") or "related_to").strip()
            sid, tid = attrs.get("sourceId"), attrs.get("targetId")
            stext, ttext = attrs.get("source_text"), attrs.get("target_text")

            def resolve(label_or_id: Optional[str]) -> Optional[str]:
                if not label_or_id:
                    return None
                lid = str(label_or_id)
                if lid in node_index:
                    return lid
                for n in nodes:
                    if str(n.get("label")).lower() == lid.lower():
                        return n["id"]
                return slug(lid)

            src = str(sid or resolve(stext) or "").strip()
            tgt = str(tid or resolve(ttext) or "").strip()
            if src and tgt and src != tgt:
                edges.append({"id": f"{src}-{rel}-{tgt}", "source": src, "target": tgt, "relation": rel, "weight": 1})

    return {"nodes": nodes, "edges": edges}


def summarize_lx(raw: Dict[str, Any]) -> Dict[str, Any]:
    def iter_extractions():
        if isinstance(raw.get("extractions"), list):
            for ex in raw["extractions"]:
                yield ex
        for item in (raw.get("annotations") or raw.get("items") or []) or []:
            for ex in item.get("extractions", []) if isinstance(item, dict) else []:
                yield ex
    cls_counts: Dict[str,int] = {}
    attrs_by_cls: Dict[str,set] = {}
    samples: List[Dict[str,Any]] = []
    relations: List[Dict[str,Any]] = []
    total = 0
    for ex in iter_extractions():
        if not isinstance(ex, dict):
            continue
        total += 1
        clazz = str(ex.get("extraction_class") or ex.get("class") or "").strip() or "Unknown"
        text = str(ex.get("extraction_text") or ex.get("text") or "").strip()
        attrs = ex.get("attributes") if isinstance(ex.get("attributes"), dict) else {}
        cls_counts[clazz] = cls_counts.get(clazz,0)+1
        if clazz not in attrs_by_cls: attrs_by_cls[clazz] = set()
        for k in (attrs or {}).keys(): attrs_by_cls[clazz].add(str(k))
        if len(samples) < 20:
            samples.append({"class": clazz, "text": text[:200], "attr_keys": sorted(list(attrs.keys())) if attrs else []})
        if clazz in {"Relation","Edge"} and attrs:
            relations.append({k: attrs.get(k) for k in ["relation","source_text","target_text","sourceId","targetId"]})
    return {
        "total_extractions": total,
        "classes": {k: cls_counts[k] for k in sorted(cls_counts)},
        "attributes_by_class": {k: sorted(list(v)) for k, v in attrs_by_cls.items()},
        "relation_samples": relations[:20],
        "top_level_keys": list(raw.keys())[:20],
        "samples": samples,
    }


# ---------- Supabase upsert helpers (REST; no extra client required) ----------

def supabase_upsert_cognee(graph: Dict[str, Any], supabase_url: str, service_key: str) -> Dict[str, Any]:
    nodes = graph.get("nodes") or []
    edges = graph.get("edges") or []
    nodes_payload = [
        {"node_id": n.get("id"), "label": n.get("label") or n.get("title"), "type": n.get("type") or "Entity", "props": n}
        for n in nodes if n.get("id")
    ]
    edges_payload = [
        {"source": e.get("source"), "target": e.get("target"), "kind": e.get("relation"), "weight": e.get("weight", 1.0), "props": e}
        for e in edges if e.get("source") and e.get("target") and e.get("relation")
    ]
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation",
    }
    out: Dict[str, Any] = {"nodes": 0, "edges": 0}
    if nodes_payload:
        r = requests.post(f"{supabase_url}/rest/v1/cognee_nodes_public?on_conflict=node_id", headers=headers, json=nodes_payload, timeout=60)
        if not r.ok:
            raise RuntimeError(f"Nodes upsert failed {r.status_code}: {r.text[:200]}")
        out["nodes"] = len(r.json() or [])
    if edges_payload:
        r = requests.post(f"{supabase_url}/rest/v1/cognee_edges_public?on_conflict=source,target,kind", headers=headers, json=edges_payload, timeout=60)
        if not r.ok:
            raise RuntimeError(f"Edges upsert failed {r.status_code}: {r.text[:200]}")
        out["edges"] = len(r.json() or [])
    return out

def run_langextract(
    text: str,
    model_id: str,
    api_key_override: Optional[str] = None,
    service_url_override: Optional[str] = None,
    timeout_s: int = 300,
    passes: int = 2,
    workers: int = 4,
) -> Dict[str, Any]:
    api_key = (api_key_override or os.environ.get("OPENAI_API_KEY") or os.environ.get("LANGEXTRACT_API_KEY"))
    if not api_key:
        raise RuntimeError("Set OPENAI_API_KEY or LANGEXTRACT_API_KEY")

    # 1) Preferred path: native Python library (requires Python >=3.10)
    if lx is not None:
        try:
            doc = lx.extract(
                text_or_documents=text,
                prompt_description=PROMPT,
                examples=EXAMPLES,
                model_id=model_id,
                api_key=api_key,
                language_model_type=lx.inference.OpenAILanguageModel,
                extraction_passes=passes,
                max_workers=workers,
                fence_output=True,
                use_schema_constraints=False,
            )
            doc_dict = doc.to_dict()  # type: ignore
            mapped = map_lx_to_graph(doc_dict)
            return {
                "raw": doc_dict,
                "nodes": mapped.get("nodes", []),
                "edges": mapped.get("edges", []),
                "proposed_changes": [],
                "meta": {"model_id": model_id, "extraction_passes": passes, "max_workers": workers},
            }
        except Exception:
            # fall back to service if available
            pass

    # 2) Fallback path: proxy to local FastAPI service if provided (works with Python 3.9)
    base = service_url_override or os.environ.get("LANGEXTRACT_SERVICE_URL") or "http://127.0.0.1:8788"
    try:
        r = requests.post(
            f"{base}/extract",
            headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {os.environ.get('LANGEXTRACT_SERVICE_TOKEN')}"} if os.environ.get('LANGEXTRACT_SERVICE_TOKEN') else {})},
            json={"text": text, "model_id": model_id, "extraction_passes": passes, "max_workers": workers},
            timeout=timeout_s,
        )
        if r.ok:
            return r.json()
        else:
            raise RuntimeError(f"Service error {r.status_code}: {r.text[:200]}")
    except Exception as e:
        raise RuntimeError("LangExtract not available locally and service fallback failed: " + str(e))


# ---------------- Streamlit UI ----------------

st.set_page_config(page_title="LangExtract POC", page_icon="🧩", layout="wide")
st.title("🧩 LangExtract POC — Resume → Graph")
st.caption("Upload resume PDF(s), extract entities/relations with LangExtract, preview and export nodes/edges and JSON‑LD.")

# Sidebar controls
model = st.sidebar.text_input("Model ID", value=os.environ.get("LANGEXTRACT_MODEL_ID", "gpt-4o-mini"))
openai_key_ui = st.sidebar.text_input("OpenAI API Key (optional)", type="password", value(os.environ.get("OPENAI_API_KEY", "")))
service_url_ui = st.sidebar.text_input("Service URL", value=os.environ.get("LANGEXTRACT_SERVICE_URL", "http://127.0.0.1:8788"))
show_jsonld = st.sidebar.checkbox("Show JSON‑LD preview", value=True)

st.sidebar.markdown("---")
supabase_url_ui = st.sidebar.text_input("Supabase URL", value=os.environ.get("SUPABASE_URL", ""))
supabase_key_ui = st.sidebar.text_input("Supabase Service Key", type="password", value=os.environ.get("SUPABASE_SERVICE_KEY", ""))

if st.sidebar.button("Test service"):
    try:
        r = requests.post(f"{service_url_ui}/extract", headers={"Content-Type":"application/json"}, json={"text":"ping","model_id": model, "extraction_passes":1, "max_workers":1}, timeout=30)
        st.sidebar.success(f"Service OK {r.status_code} — {len(r.text)} bytes")
    except Exception as e:
        st.sidebar.error(f"Service test failed: {e}")

with st.sidebar.expander("Having trouble?", expanded=False):
    st.markdown("- Prefer setting OPENAI_API_KEY in your shell.\n- Or paste the key above (stored only in Streamlit session state).\n- Python < 3.10? The app uses the local Docker service fallback.")

# Uploader (single for clarity; easy to extend to multiple)
uploaded = st.file_uploader("Upload a PDF resume", type=["pdf"])  # single for simplicity

if uploaded is not None:
    with st.expander("Preview extracted plain text", expanded=False):
        try:
            text = extract_pdf_text(uploaded)
        except Exception as e:
            st.error(f"PDF parse failed: {e}")
            text = ""
        st.caption(f"Characters extracted: {len(text)}")
        st.text_area("Text", value=text[:20000], height=260)

    if st.button("Extract with LangExtract", type="primary", use_container_width=True):
        if not text:
            st.warning("No text extracted from the PDF.")
        else:
            with st.spinner("Running LangExtract…"):
                try:
                    resp = run_langextract(
                        text,
                        model,
                        api_key_override=openai_key_ui or None,
                        service_url_override=service_url_ui,
                    )
                    # Support both shapes: {raw, nodes, edges, ...} or plain raw doc
                    if isinstance(resp, dict) and "raw" in resp:
                        raw_doc = resp.get("raw") or {}
                        nodes_edges = {"nodes": resp.get("nodes") or [], "edges": resp.get("edges") or []}
                        mapped = nodes_edges if (nodes_edges["nodes"] or nodes_edges["edges"]) else map_lx_to_graph(raw_doc)
                        summary = summarize_lx(raw_doc)
                    else:
                        raw_doc = resp  # type: ignore
                        mapped = map_lx_to_graph(raw_doc)
                        summary = summarize_lx(raw_doc)
                except Exception as e:
                    st.error(f"Extraction failed: {e}")
                    mapped = {"nodes": [], "edges": []}
                    summary = {"error": str(e)}

            nodes = mapped.get("nodes", [])
            edges = mapped.get("edges", [])
            st.success(f"Extracted {len(nodes)} nodes and {len(edges)} edges.")

            # Show semantic features summary FIRST (as requested)
            st.subheader("LangExtract semantic features (summary)")
            st.json(summary)

            c1, c2 = st.columns(2)
            with c1:
                st.subheader("Nodes")
                st.dataframe(nodes, use_container_width=True, height=320)
            with c2:
                st.subheader("Edges")
                st.dataframe(edges, use_container_width=True, height=320)

            # JSON‑LD preview and download (uses app/services/ontology.ts logic concept)
            def to_jsonld_py(graph: Dict[str, Any]) -> Dict[str, Any]:
                ns = {"ex": "https://moveup.ai/ontology#", "schema": "https://schema.org/"}
                def cls(t: str) -> str:
                    t = (t or "").lower()
                    return {
                        "person": ns["schema"]+"Person",
                        "company": ns["schema"]+"Organization",
                        "project": ns["schema"]+"CreativeWork",
                        "skill": ns["schema"]+"DefinedTerm",
                        "skills": ns["schema"]+"DefinedTerm",
                        "education": ns["schema"]+"EducationalOrganization",
                        "certification": ns["schema"]+"EducationalOccupationalCredential",
                        "experience": ns["ex"]+"Experience",
                        "technology": ns["ex"]+"Technology",
                    }.get(t, ns["ex"]+"Entity")
                def pred(r: str) -> str:
                    R = (r or "").upper()
                    mapping = {
                        "WORKED_AT": ns["schema"]+"worksFor",
                        "ROLE_AT": ns["ex"]+"hasRole",
                        "USED_SKILL": ns["ex"]+"usedSkill",
                        "BUILT": ns["ex"]+"built",
                        "STUDIED_AT": ns["schema"]+"alumniOf",
                        "CERTIFIED": ns["ex"]+"hasCredential",
                        "CONTRIBUTED_TO": ns["schema"]+"contributor",
                    }
                    return mapping.get(R, ns["ex"]+"relatedTo")
                def uri(x: str) -> str:
                    return "https://moveup.ai/id/" + (x or "").replace(" ", "%20")
                node_objs = [
                    {"@id": uri(n.get("id") or n.get("label") or f"n{i}"),
                     "@type": cls(n.get("type") or "Entity"),
                     "schema:name": n.get("label") or n.get("name")}
                    for i, n in enumerate(graph.get("nodes", []))
                ]
                edge_objs = [
                    {"@id": uri(e.get("id") or f"e{i}"), "@type": ns["ex"]+"Relation",
                     "subject": uri(str(e.get("source"))),
                     "predicate": pred(str(e.get("relation"))),
                     "object": uri(str(e.get("target"))) }
                    for i, e in enumerate(graph.get("edges", [])) if e.get("source") and e.get("target")
                ]
                return {"@context": {"@vocab": ns["ex"], "schema": ns["schema"], "name": "schema:name"}, "@graph": node_objs + edge_objs}

            graph = {"nodes": nodes, "edges": edges}
            jsonld_obj = to_jsonld_py(graph)

            if show_jsonld:
                with st.expander("JSON‑LD preview", expanded=False):
                    st.code(json.dumps(jsonld_obj, indent=2), language="json")
                st.download_button("Download JSON‑LD", json.dumps(jsonld_obj, indent=2), file_name="langextract-graph.jsonld", mime="application/ld+json")

            # Download and Save
            out = graph
            st.download_button("Download nodes/edges JSON", json.dumps(out, indent=2), file_name="langextract-graph.json", mime="application/json")

            c3, c4 = st.columns(2)
            with c3:
                if st.button("Save to Supabase (langextract_graphs)"):
                    try:
                        if not supabase_url_ui or not supabase_key_ui:
                            raise RuntimeError("Provide Supabase URL and Service Key in the sidebar")
                        payload = {
                            "source": "streamlit-poc",
                            "meta": { "model": model, "service_url": service_url_ui },
                            "graph": out,
                        }
                        headers = {"apikey": supabase_key_ui, "Authorization": f"Bearer {supabase_key_ui}", "Content-Type": "application/json", "Prefer": "return=representation"}
                        r = requests.post(f"{supabase_url_ui}/rest/v1/langextract_graphs", headers=headers, json=payload, timeout=60)
                        if not r.ok:
                            raise RuntimeError(f"Supabase insert failed {r.status_code}: {r.text[:200]}")
                        st.success("Saved current graph JSON to public.langextract_graphs")
                    except Exception as e:
                        st.error(f"Save failed: {e}")
            with c4:
                if st.button("Append to knowledge-graph.json (merge nodes/edges)"):
                    try:
                        target = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public", "knowledge-graph.json"))
                        os.makedirs(os.path.dirname(target), exist_ok=True)
                        prev = {"nodes": [], "edges": []}
                        if os.path.exists(target):
                            with open(target) as f:
                                prev = json.load(f)
                        # simple merge by id and (source,target,relation)
                        pn = {n.get("id"): n for n in prev.get("nodes", []) if n.get("id")}
                        for n in nodes:
                            if n.get("id") in pn:
                                pn[n["id"]].update(n)
                            else:
                                prev["nodes"].append(n)
                        pe = {(e.get("source"), e.get("relation"), e.get("target")) for e in prev.get("edges", [])}
                        for e in edges:
                            key = (e.get("source"), e.get("relation"), e.get("target"))
                            if key not in pe:
                                prev["edges"].append(e)
                        with open(target, "w") as f:
                            json.dump(prev, f, indent=2)
                        st.success("Appended/merged into knowledge-graph.json")
                    except Exception as e:
                        st.error(f"Append failed: {e}")
else:
    st.info("Upload a PDF to begin.")

