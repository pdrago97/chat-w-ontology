from pydantic import BaseModel
from typing import List, Optional, Any

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Any]] = []

class ChatResponse(BaseModel):
    response: str

class GraphNode(BaseModel):
    id: str
    label: str
    type: str
    category: str
    title: str
    description: str
    data: dict

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    relation: str
    type: str
    weight: int
    data: dict

class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    lastUpdated: str
