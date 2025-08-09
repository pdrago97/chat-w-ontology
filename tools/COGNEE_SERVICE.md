# Cognee FastAPI Service

A tiny service that fetches texts from Supabase and builds an ontology/knowledge graph using Cognee, returning the app-compatible `{nodes, edges}` shape.

## Endpoints

- `GET /health` — quick health check
- `GET /graph/from-supabase?limit=200` — fetch texts and return a graph JSON

## Environment Variables

- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_ANON_KEY` — a key with read access to the table
- `SUPABASE_TABLE` — table name that contains the text
- `SUPABASE_TEXT_COLUMN` — column with the text content (default: `content`)
- `SUPABASE_ID_COLUMN` — id column (default: `id`)
- `SUPABASE_METADATA_COLUMN` — optional jsonb column with metadata
- `COGNEE_SERVICE_PORT` — port for local dev (default: `8765`)

## Run (local)

```bash
cd tools
python3 -m venv .venv && source .venv/bin/activate
pip install fastapi uvicorn supabase  # plus cognee per docs
export SUPABASE_URL=...
export SUPABASE_ANON_KEY=...
export SUPABASE_TABLE=documents
# optional overrides
export SUPABASE_TEXT_COLUMN=content
export SUPABASE_METADATA_COLUMN=metadata

python cognee_service.py
# Service on http://127.0.0.1:8765
```

## Wire to Remix

A new Remix route `app/routes/api.graph.fromSupabase.tsx` proxies to this service.

```bash
# Call from your app
GET /api.graph.fromSupabase?limit=300
```

You can switch the service URL using `COGNEE_SERVICE_URL` env var when running Remix.

## Implementing Cognee

Edit `tools/cognee_service.py`, function `run_cognee(docs)` and replace the stub with a real Cognee pipeline per https://docs.cognee.ai. Outline:

1. Prepare inputs
   - texts = [d.text for d in docs]
   - metadata = d.metadata
2. Configure ontology or let Cognee infer
3. Run extraction to get entities and relations
4. Map to the app schema via `map_to_app_schema()`

Keep the output minimal and stable: id, type/title on nodes; source/target/relation on edges.

## Notes

- We intentionally avoid reading or writing your Postgres from the Remix app; Python service handles Supabase + Cognee.
- For incremental/filtered runs, add parameters (e.g., `q`, `topic`) and perform pgvector similarity on the Supabase side to select docs before Cognee.
- Keep it small; resist adding complexity beyond what the app needs.

