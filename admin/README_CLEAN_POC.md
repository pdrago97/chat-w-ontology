# Clean, Reliable LangExtract POC (no local Python gymnastics)

This uses a pinned Dockerized LangExtract service and Streamlit POC that work on your current Python (3.9 OK).

## 1) Start the LangExtract service (Docker)

From repo root:

```bash
make -C admin service
```

- Builds tools/langextract.Dockerfile (Python 3.11 slim)
- Installs FastAPI + LangExtract
- Exposes http://127.0.0.1:8788
- Uses your host OPENAI_API_KEY (forwarded automatically)

Stop:

```bash
make -C admin down
```

## 2) Run the Streamlit POC (host)

```bash
make -C admin poc
```

- Opens http://localhost:8510
- Upload your resume PDF and click Extract
- First panel shows LangExtract semantic features (class counts, attributes, relation samples)
- Then preview nodes/edges and optional JSON‑LD
- Save/Append to public/knowledge-graph.json for the Remix UI

## Why this is clean and reliable
- Reproducible service in a container (no dependency drift)
- Works even if your host venv is Python 3.9
- Minimal surface area: one Docker service + one Streamlit command
- Uses official upstream LangExtract (GitHub main) and FastAPI

