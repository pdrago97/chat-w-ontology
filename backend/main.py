import os
import asyncio
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv

# Load env from root BEFORE importing cognee
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

# Ensure API key is set for Cognee
if os.getenv("OPENAI_API_KEY"):
    os.environ["LLM_API_KEY"] = os.getenv("OPENAI_API_KEY").strip()

import cognee

from models import ChatRequest, ChatResponse, GraphResponse, GraphNode, GraphEdge

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "ok", "service": "Cognee Backend"}

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # Simple search using Cognee
        # In a real RAG, we would use cognee.search to get context and then LLM to answer
        # For now, assuming cognee.search returns relevant chunks
        
        search_results = await cognee.search(request.message)
        
        # We need to pass this context to an LLM. 
        # Since Cognee might have built-in RAG, let's check.
        # If not, we'll do a simple manual RAG here using OpenAI directly if needed, 
        # but Cognee usually handles the retrieval part.
        
        # For now, let's construct a simple answer or use an LLM if I had one configured.
        # I will use the OpenAI client to generate the answer based on search results.
        
        from openai import OpenAI
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        context = "\n".join([str(r) for r in search_results])
        
        system_prompt = f"""You are an AI assistant for Pedro Reichow. 
        Use the following context to answer the user's question about Pedro.
        If the answer is not in the context, say you don't know.
        
        Context:
        {context}
        """
        
        completion = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.message}
            ]
        )
        
        answer = completion.choices[0].message.content
        return ChatResponse(response=answer)

    except Exception as e:
        print(f"Chat error: {e}")
        # Fallback if Cognee fails (e.g. empty graph)
        return ChatResponse(response=f"I'm unable to access my memory right now. Error: {str(e)}")

@app.post("/ingest")
async def run_ingestion():
    try:
        import ingest
        await ingest.main()
        return {"status": "Ingestion completed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/graph", response_model=GraphResponse)
async def get_graph():
    try:
        # Retrieve graph data. 
        # Since Cognee doesn't have a simple "dump graph" method in the quickstart,
        # We will search for key entities to build a subgraph.
        # Or we can try to access the internal graph storage if possible.
        
        # Retrieve graph data using the engine directly
        from cognee.infrastructure.databases.graph.get_graph_engine import get_graph_engine
        engine = await get_graph_engine()
        
        # Try to get the full graph
        # get_graph_data() returns a tuple (nodes, edges)
        graph_data = await engine.get_graph_data()
        
        if isinstance(graph_data, tuple) and len(graph_data) == 2:
            nodes_raw, edges_raw = graph_data
        else:
            nodes_raw = []
            edges_raw = []
        
        # Map to response model
        mapped_nodes = []
        for n in nodes_raw:
            # n is likely (id, properties_dict)
            if isinstance(n, tuple) and len(n) >= 2:
                node_id = n[0]
                props = n[1] if isinstance(n[1], dict) else {}
            else:
                node_id = str(n.get("id", "unknown")) if isinstance(n, dict) else str(n)
                props = n if isinstance(n, dict) else {}

            mapped_nodes.append(GraphNode(
                id=str(node_id),
                label=props.get("name", props.get("title", str(node_id))),
                type=props.get("type", "node"),
                category=props.get("type", "node"),
                title=props.get("name", props.get("title", str(node_id))),
                description=props.get("description", props.get("text", "")),
                data=props
            ))
            
        mapped_edges = []
        for e in edges_raw:
            # e is likely (source, target, properties_dict)
            if isinstance(e, tuple) and len(e) >= 3:
                source = e[0]
                target = e[1]
                props = e[2] if isinstance(e[2], dict) else {}
            elif isinstance(e, tuple) and len(e) == 2:
                 # Maybe (source, target) without props?
                 source = e[0]
                 target = e[1]
                 props = {}
            else:
                source = str(e.get("source", "unknown")) if isinstance(e, dict) else "unknown"
                target = str(e.get("target", "unknown")) if isinstance(e, dict) else "unknown"
                props = e if isinstance(e, dict) else {}

            mapped_edges.append(GraphEdge(
                id=f"{source}_{target}",
                source=str(source),
                target=str(target),
                relation=props.get("relationship", "related"),
                type=props.get("relationship", "related"),
                weight=props.get("weight", 1),
                data=props
            ))

        return GraphResponse(nodes=mapped_nodes, edges=mapped_edges, lastUpdated="2025-11-25")

    except Exception as e:
        print(f"Graph error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
