# LangExtract POC — Quick Start

This POC lets you upload a resume PDF, run Google LangExtract to extract structured entities/relations, preview its semantic features, and export/merge the result as a graph for the main Remix app.

## Two ways to run LangExtract

1) Preferred: Python library (requires Python >= 3.10)
   - Create a venv with Python 3.11+
   - Install: `pip install streamlit PyPDF2`
   - Install LangExtract: `pip install "git+https://github.com/google/langextract.git@main"`
   - Set `OPENAI_API_KEY` or `LANGEXTRACT_API_KEY`
   - Run: `streamlit run admin/langextract_poc.py --server.port 8510`

2) Fallback for Python 3.9 environments: local service
   - In one terminal: `python -m pip install fastapi uvicorn pydantic requests`
   - `python -m pip install "git+https://github.com/google/langextract.git@main"` (service still needs py>=3.10)
   - Or run the provided FastAPI wrapper if you have a newer Python elsewhere
     - `uvicorn tools.langextract_service:app --reload --port 8788`
   - POC will POST to `LANGEXTRACT_SERVICE_URL` (default `http://127.0.0.1:8788`)

## Semantic features shown
- total_extractions
- classes (counts per extraction_class)
- attributes_by_class (all observed attribute keys per class)
- relation_samples (relation, source_text, target_text, sourceId, targetId)
- samples (first 20 items with class, text, and attribute keys)

## Exporting for the Remix app
- Use "Save as main knowledge-graph.json" to overwrite
- Or "Append (merge nodes/edges)" to incrementally build up the graph
- Then open the Remix UI and select "Curated JSON" source to view

