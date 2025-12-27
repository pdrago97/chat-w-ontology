#!/usr/bin/env python3
"""
Generate a rich knowledge graph from Pedro Reichow's resume.
Target: 300-500 nodes with detailed relationships.
"""

import json
import uuid
from datetime import datetime
from typing import Dict, List, Any

def create_node(label: str, node_type: str, category: str, description: str, **extra) -> Dict:
    """Create a node with consistent structure."""
    return {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{label}-{node_type}")),
        "label": label,
        "type": node_type,
        "category": category,
        "description": description,
        "data": {"rich": True, **extra}
    }

def create_edge(source_id: str, target_id: str, label: str, edge_type: str, **extra) -> Dict:
    """Create an edge with consistent structure."""
    return {
        "source": source_id,
        "target": target_id,
        "label": label,
        "type": edge_type,
        "data": {"rich": True, **extra}
    }

# ============================================================================
# DEFINE ALL ENTITIES
# ============================================================================

# Core Person
PEDRO = create_node("Pedro Reichow", "Person", "person", 
    "AI Platform Engineer, RAG & Agentic Systems, Technology Entrepreneur",
    isPrimary=True, priority=10)

# Companies with details
COMPANIES = [
    ("CVS Health", "Healthcare company, Fortune 4", "enterprise", "Aug 2024", "Present", True),
    ("Santodigital", "Google Cloud Partner", "consulting", "Jan 2024", "Jul 2024", False),
    ("Capgemini Brasil", "Global IT consulting, 350k+ employees", "consulting", "Jan 2022", "Dec 2023", False),
    ("Simulated Reality", "VR/AR technology company", "startup", "Jan 2021", "Dec 2021", False),
    ("QI Tech", "Fintech, banking infrastructure", "fintech", "Jan 2019", "Dec 2020", False),
    ("PecSmart", "IoT & AgTech startup", "startup", "Nov 2017", "Dec 2018", False),
    ("Fontes Promotora", "Financial services", "finance", "Jan 2017", "Oct 2017", False),
    ("MoveUp AI", "AI-powered workforce intelligence, San Francisco", "startup", "2024", "Present", True),
    ("Trinnix AI Lab", "Computer Vision & AI research", "research", "2023", "Present", False),
]

# Roles/Positions
ROLES = [
    ("Senior Software & Data Engineer", "CVS Health", "AI Observability focus"),
    ("Cloud AI Solutions Architect", "Santodigital", "RAG & Agent systems"),
    ("Senior Solutions Consultant IV", "Capgemini Brasil", "Knowledge Graphs & Data Engineering"),
    ("Full Stack Engineer", "Simulated Reality", "VR & Real-Time Systems"),
    ("Senior Data Engineer", "QI Tech", "Big Data & Cloud"),
    ("Backend Developer & IoT Specialist", "PecSmart", "IoT & ML pipelines"),
    ("Backend Developer", "Fontes Promotora", "APIs & Web Scraping"),
    ("Founding Engineer & Technical Co-founder", "MoveUp AI", "Hybrid RAG & Multi-tool Orchestration"),
    ("AI Engineer & Computer Vision", "Trinnix AI Lab", "CV & LLM Integration"),
]

# Technical Categories and Skills
TECH_CATEGORIES = {
    "AI Platform & LLMs": [
        ("LangChain", "LLM orchestration framework", "framework"),
        ("LangGraph", "Stateful LLM agent framework", "framework"),
        ("Vertex AI", "Google Cloud AI platform", "platform"),
        ("RAG", "Retrieval-Augmented Generation", "technique"),
        ("RAG Evaluation", "Metrics for RAG systems", "technique"),
        ("Prompt Engineering", "LLM prompt optimization", "skill"),
        ("Tool Calling", "LLM function calling", "technique"),
        ("Model-as-a-judge", "LLM output evaluation", "technique"),
        ("Multi-tool Orchestration", "Agent tool management", "technique"),
        ("OpenAI GPT-4", "Large language model", "model"),
        ("Claude", "Anthropic's LLM", "model"),
        ("Gemini", "Google's LLM", "model"),
        ("ADK", "Agent Development Kit", "framework"),
        ("MCP Servers", "Model Context Protocol", "protocol"),
        ("Agentic AI", "Autonomous AI agents", "paradigm"),
    ],
    "Retrieval & Knowledge": [
        ("Hybrid Retrieval", "Vector + Graph search", "technique"),
        ("Cognee", "Knowledge graph for RAG", "tool"),
        ("Semantic Search", "Meaning-based search", "technique"),
        ("Knowledge Graphs", "Structured knowledge representation", "concept"),
        ("RDF", "Resource Description Framework", "standard"),
        ("OWL", "Web Ontology Language", "standard"),
        ("Embeddings", "Vector representations", "technique"),
        ("Faithfulness Metrics", "RAG output quality", "metric"),
        ("Relevance Metrics", "Search quality", "metric"),
        ("Protégé", "Ontology editor", "tool"),
        ("Vector Database", "Embedding storage", "technology"),
        ("Dense Retrieval", "Vector-based search", "technique"),
        ("Symbolic Retrieval", "Graph-based search", "technique"),
        ("Entity Extraction", "NER from text", "technique"),
        ("Query Routing", "Smart query dispatch", "technique"),
    ],
    "Programming & APIs": [
        ("Python", "Primary programming language", "language"),
        ("TypeScript", "Typed JavaScript", "language"),
        ("JavaScript", "Web programming language", "language"),
        ("Node.js", "JavaScript runtime", "runtime"),
        ("FastAPI", "Modern Python web framework", "framework"),
        ("Flask", "Python web microframework", "framework"),
        ("Django", "Python web framework", "framework"),
        ("Django REST", "REST API for Django", "framework"),
        ("gRPC", "High-performance RPC", "protocol"),
        ("React", "UI component library", "framework"),
        ("SQL", "Database query language", "language"),
        ("Microservices", "Distributed architecture", "pattern"),
        ("REST", "API architectural style", "pattern"),
        ("GraphQL", "Query language for APIs", "technology"),
        ("Web Scraping", "Data extraction from web", "technique"),
    ],
    "Cloud & Observability": [
        ("GCP", "Google Cloud Platform", "platform"),
        ("AWS", "Amazon Web Services", "platform"),
        ("BigQuery", "Data warehouse", "service"),
        ("Docker", "Containerization", "tool"),
        ("Kubernetes", "Container orchestration", "platform"),
        ("Datadog", "Monitoring platform", "tool"),
        ("Grafana", "Visualization platform", "tool"),
        ("SLOs", "Service Level Objectives", "concept"),
        ("p50/p95 Latency", "Latency percentiles", "metric"),
        ("Cost-per-token", "LLM cost metric", "metric"),
        ("CI/CD", "Continuous Integration/Deployment", "practice"),
        ("Terraform", "Infrastructure as Code", "tool"),
        ("Dataproc", "Managed Spark/Hadoop", "service"),
        ("GCS", "Google Cloud Storage", "service"),
        ("Delta Lake", "ACID data lake", "technology"),
    ],
    "Data Engineering": [
        ("PySpark", "Python Spark API", "framework"),
        ("Apache Spark", "Big data processing", "platform"),
        ("ETL", "Extract Transform Load", "process"),
        ("Data Pipelines", "Automated data flow", "concept"),
        ("Airflow", "Workflow orchestration", "tool"),
        ("500GB+ Daily", "High volume processing", "achievement"),
        ("ACID Transactions", "Data consistency", "concept"),
        ("Data Versioning", "Version control for data", "practice"),
        ("ML Reproducibility", "Reproducible ML", "practice"),
        ("Audit Compliance", "Regulatory compliance", "requirement"),
    ],
    "Computer Vision & ML": [
        ("YoloX", "Object detection model", "model"),
        ("Roboflow", "CV data platform", "platform"),
        ("Computer Vision", "Image analysis AI", "field"),
        ("OpenCV", "CV library", "library"),
        ("TensorFlow", "ML framework", "framework"),
        ("PyTorch", "ML framework", "framework"),
        ("95%+ Accuracy", "High model accuracy", "achievement"),
    ],
    "VR & Real-Time": [
        ("Unity", "Game engine", "platform"),
        ("Unreal Engine", "Game engine", "platform"),
        ("VR Solutions", "Virtual Reality apps", "technology"),
        ("3D Object Interaction", "3D user input", "feature"),
        ("Physics Simulations", "Physical modeling", "feature"),
        ("Pub/Sub", "Message pattern", "pattern"),
        ("Real-time Communication", "Live data sync", "feature"),
        ("Async Processing", "Non-blocking operations", "pattern"),
        ("Message Queues", "Async messaging", "technology"),
    ],
    "IoT & Edge": [
        ("IoT", "Internet of Things", "field"),
        ("Raspberry Pi", "Edge computing device", "hardware"),
        ("Edge Computing", "Distributed processing", "paradigm"),
        ("Livestock Monitoring", "Agricultural IoT", "application"),
        ("Behavioral Analysis", "Pattern recognition", "technique"),
        ("Real-time Analytics", "Live data analysis", "capability"),
    ],
    "Security & Compliance": [
        ("OAuth 2.0", "Authorization framework", "standard"),
        ("Human-in-the-loop", "Human oversight", "pattern"),
        ("HIPAA", "Healthcare data privacy", "regulation"),
        ("FedRAMP", "Federal cloud security", "regulation"),
        ("A/B Testing", "Prompt version testing", "technique"),
    ],
    "Enterprise Tools": [
        ("Jira", "Project management", "tool"),
        ("GitHub", "Code hosting", "platform"),
        ("Gmail API", "Email integration", "api"),
        ("Google Drive API", "Storage integration", "api"),
        ("Zendesk", "Customer support platform", "platform"),
        ("Slack API", "Chat integration", "api"),
    ],
}

# Achievements and Impact
ACHIEVEMENTS = [
    ("Weeks to Minutes", "Document analysis time reduction", "CVS Health"),
    ("500GB+ Daily Processing", "High-volume data handling", "QI Tech"),
    ("50+ Engineers Collaboration", "Large team coordination", "Capgemini Brasil"),
    ("95%+ CV Accuracy", "High precision models", "Trinnix AI Lab"),
    ("Hallucination Reduction", "Improved LLM faithfulness", "Santodigital"),
    ("Cost Optimization", "Cloud cost efficiency", "QI Tech"),
    ("Compliance Automation", "Regulatory automation", "Santodigital"),
]

# Education
EDUCATION = [
    ("B.S. Electrical Engineering", "UFSC", "Federal University of Santa Catarina"),
    ("B.S. Systems Analysis", "Estácio", "Estácio de Sá University"),
]

# Concepts and Domains
DOMAINS = [
    ("Healthcare AI", "AI in healthcare", "CVS Health"),
    ("Fintech", "Financial technology", "QI Tech"),
    ("AgTech", "Agricultural technology", "PecSmart"),
    ("VR/AR", "Virtual/Augmented Reality", "Simulated Reality"),
    ("Fraud Detection", "Anti-fraud systems", "Capgemini Brasil"),
    ("Risk Analysis", "Risk assessment", "Capgemini Brasil"),
    ("Workforce Intelligence", "HR analytics", "MoveUp AI"),
]

# Languages
LANGUAGES = [
    ("English", "Fluent", "professional"),
    ("Portuguese", "Native", "native"),
    ("Spanish", "Intermediate", "conversational"),
]

# Portfolio
PORTFOLIO = [
    ("pedroreichow.com.br", "Interactive Knowledge Graph + RAG demo", "personal"),
    ("LinkedIn", "Professional network", "social"),
]

# Additional Concepts for rich graph
CONCEPTS = [
    # AI/ML Concepts
    ("Artificial Intelligence", "Machine intelligence", "AI"),
    ("Machine Learning", "Statistical learning", "AI"),
    ("Deep Learning", "Neural networks", "AI"),
    ("Natural Language Processing", "Text AI", "AI"),
    ("Large Language Models", "Foundation models", "AI"),
    ("Transformers", "Attention architecture", "AI"),
    ("Fine-tuning", "Model adaptation", "AI"),
    ("Transfer Learning", "Knowledge transfer", "AI"),
    ("Inference", "Model prediction", "AI"),
    ("Training", "Model learning", "AI"),
    ("Tokenization", "Text preprocessing", "NLP"),
    ("Context Window", "Input limit", "LLM"),
    ("Temperature", "Randomness control", "LLM"),
    ("Chain of Thought", "Reasoning technique", "LLM"),
    ("Few-shot Learning", "In-context learning", "LLM"),
    ("Zero-shot Learning", "No examples needed", "LLM"),

    # Software Engineering
    ("Clean Code", "Code quality", "Engineering"),
    ("SOLID Principles", "OOP design", "Engineering"),
    ("Design Patterns", "Reusable solutions", "Engineering"),
    ("Test-Driven Development", "TDD", "Engineering"),
    ("Agile", "Development methodology", "Process"),
    ("Scrum", "Agile framework", "Process"),
    ("Code Review", "Peer review", "Process"),
    ("Version Control", "Source management", "Process"),
    ("Git", "VCS system", "Tool"),

    # Architecture
    ("Event-Driven Architecture", "Async systems", "Architecture"),
    ("Domain-Driven Design", "DDD", "Architecture"),
    ("Hexagonal Architecture", "Ports & adapters", "Architecture"),
    ("API Gateway", "API management", "Architecture"),
    ("Load Balancing", "Traffic distribution", "Infrastructure"),
    ("Caching", "Performance optimization", "Infrastructure"),
    ("Redis", "In-memory cache", "Technology"),
    ("PostgreSQL", "Relational database", "Database"),
    ("MongoDB", "Document database", "Database"),
    ("Neo4j", "Graph database", "Database"),

    # Cloud & DevOps
    ("Infrastructure as Code", "IaC", "DevOps"),
    ("GitOps", "Git-based ops", "DevOps"),
    ("Serverless", "FaaS", "Cloud"),
    ("Cloud Functions", "Event functions", "Cloud"),
    ("API Management", "API lifecycle", "Cloud"),
    ("Logging", "System logs", "Observability"),
    ("Tracing", "Request tracing", "Observability"),
    ("Alerting", "Incident detection", "Observability"),
    ("Dashboards", "Data visualization", "Observability"),

    # Data Concepts
    ("Data Lake", "Raw data storage", "Data"),
    ("Data Warehouse", "Structured storage", "Data"),
    ("Data Mesh", "Decentralized data", "Data"),
    ("Data Governance", "Data management", "Data"),
    ("Data Quality", "Data accuracy", "Data"),
    ("Schema Design", "Data modeling", "Data"),
    ("Normalization", "Data organization", "Data"),
    ("Denormalization", "Query optimization", "Data"),

    # Business Impact
    ("ROI", "Return on investment", "Business"),
    ("Time-to-Market", "Delivery speed", "Business"),
    ("Scalability", "Growth capacity", "Business"),
    ("Reliability", "System uptime", "Business"),
    ("Performance", "System speed", "Business"),
    ("User Experience", "UX design", "Business"),
    ("Customer Success", "Client outcomes", "Business"),
]

# Project-specific nodes
PROJECTS = [
    ("AI Observability Dashboard", "LLM monitoring system", "CVS Health"),
    ("RAG Pipeline", "Document Q&A system", "Santodigital"),
    ("Compliance Automation Agent", "Regulatory AI", "Santodigital"),
    ("Fraud Detection System", "Anti-fraud ML", "Capgemini Brasil"),
    ("Knowledge Graph Platform", "Semantic data platform", "Capgemini Brasil"),
    ("VR Training Platform", "Immersive learning", "Simulated Reality"),
    ("3D Video Pipeline", "Media processing", "Simulated Reality"),
    ("Big Data Platform", "Data processing infra", "QI Tech"),
    ("Delta Lake Implementation", "ACID data lake", "QI Tech"),
    ("Livestock Monitoring System", "IoT animal tracking", "PecSmart"),
    ("Financial API Platform", "Banking APIs", "Fontes Promotora"),
    ("Hybrid RAG System", "Vector + Graph search", "MoveUp AI"),
    ("Multi-tool Agent", "Tool orchestration", "MoveUp AI"),
    ("Agricultural CV System", "Crop analysis", "Trinnix AI Lab"),
]

# Specific features and capabilities
FEATURES = [
    ("Real-time Monitoring", "Live system tracking"),
    ("Automated Alerting", "Incident notifications"),
    ("Query Optimization", "Fast data retrieval"),
    ("Batch Processing", "Large-scale jobs"),
    ("Stream Processing", "Real-time data flow"),
    ("API Rate Limiting", "Request throttling"),
    ("Authentication", "User verification"),
    ("Authorization", "Access control"),
    ("Encryption", "Data protection"),
    ("Audit Logging", "Activity tracking"),
    ("Error Handling", "Exception management"),
    ("Retry Logic", "Fault tolerance"),
    ("Circuit Breaker", "Failure isolation"),
    ("Health Checks", "Service monitoring"),
    ("Auto-scaling", "Dynamic capacity"),
    ("Blue-Green Deployment", "Zero-downtime deploy"),
    ("Canary Releases", "Gradual rollout"),
    ("Feature Flags", "Controlled features"),
    ("A/B Experimentation", "Variant testing"),
    ("Metrics Collection", "Performance data"),
]

# Methodologies
METHODOLOGIES = [
    ("Retrieval-Augmented Generation", "RAG pattern"),
    ("Multi-Agent Systems", "Agent coordination"),
    ("Semantic Chunking", "Smart text splitting"),
    ("Hybrid Search", "Vector + keyword"),
    ("Query Expansion", "Search enhancement"),
    ("Re-ranking", "Result reordering"),
    ("Document Parsing", "Text extraction"),
    ("Prompt Chaining", "Sequential prompts"),
    ("Prompt Templates", "Reusable prompts"),
    ("Output Parsing", "Structured responses"),
]

# Locations
LOCATIONS = [
    ("Santa Catarina", "State", "Brazil"),
    ("Brazil", "Country", "South America"),
    ("San Francisco", "City", "USA"),
    ("USA", "Country", "North America"),
    ("Remote", "Work Mode", "Global"),
]

# Time periods
CAREER_PHASES = [
    ("2017-2018", "Early Career", "Backend development, IoT"),
    ("2019-2020", "Data Engineering Phase", "Big data, cloud"),
    ("2021", "VR/Full Stack Phase", "Real-time systems"),
    ("2022-2023", "Consulting Phase", "Enterprise solutions"),
    ("2024-Present", "AI Platform Phase", "LLMs, RAG, Agents"),
]

# Industry verticals
INDUSTRIES = [
    ("Healthcare", "Medical services", ["CVS Health"]),
    ("Financial Services", "Banking & finance", ["QI Tech", "Fontes Promotora", "Capgemini Brasil"]),
    ("Technology Consulting", "IT services", ["Capgemini Brasil", "Santodigital"]),
    ("Agriculture", "Farming & agtech", ["PecSmart", "Trinnix AI Lab"]),
    ("Gaming & VR", "Entertainment tech", ["Simulated Reality"]),
    ("HR Tech", "Workforce management", ["MoveUp AI"]),
]

# Soft skills and competencies
SOFT_SKILLS = [
    ("Technical Leadership", "Team guidance"),
    ("Problem Solving", "Solution finding"),
    ("Communication", "Clear expression"),
    ("Mentoring", "Knowledge transfer"),
    ("Collaboration", "Team work"),
    ("Strategic Thinking", "Long-term planning"),
    ("Adaptability", "Flexibility"),
    ("Continuous Learning", "Self-improvement"),
    ("Project Management", "Delivery oversight"),
    ("Stakeholder Management", "Relationship building"),
]

# Certifications and learning (potential/relevant)
CERTIFICATIONS = [
    ("Google Cloud Certified", "GCP expertise"),
    ("AWS Certified", "AWS expertise"),
    ("Kubernetes Certified", "K8s expertise"),
    ("Python Certified", "Python expertise"),
]

# Tools and platforms (additional)
ADDITIONAL_TOOLS = [
    ("VS Code", "Code editor", "development"),
    ("Jupyter", "Notebooks", "data_science"),
    ("Pandas", "Data analysis", "data_science"),
    ("NumPy", "Numerical computing", "data_science"),
    ("Scikit-learn", "ML library", "ml"),
    ("Hugging Face", "Model hub", "ml"),
    ("LangSmith", "LLM debugging", "llm"),
    ("Weights & Biases", "ML experiment tracking", "ml"),
    ("MLflow", "ML lifecycle", "ml"),
    ("Supabase", "Backend as service", "backend"),
    ("Vercel", "Deployment platform", "deployment"),
    ("Cloudflare", "Edge network", "infrastructure"),
]

# ============================================================================
# BUILD THE GRAPH
# ============================================================================

def build_graph():
    nodes = []
    edges = []
    node_ids = {}  # label -> id mapping

    def add_node(node):
        nodes.append(node)
        node_ids[node["label"]] = node["id"]
        return node["id"]

    def add_edge(source_label, target_label, label, edge_type, **extra):
        if source_label in node_ids and target_label in node_ids:
            edges.append(create_edge(node_ids[source_label], node_ids[target_label], label, edge_type, **extra))

    # 1. Add Pedro (central node)
    add_node(PEDRO)

    # 2. Add Companies
    for name, desc, industry, start, end, current in COMPANIES:
        node = create_node(name, "Company", "company", desc, industry=industry, startDate=start, endDate=end, current=current)
        add_node(node)
        add_edge("Pedro Reichow", name, "worked_at" if not current else "works_at", "employment", current=current)

        # Add date nodes
        if start:
            date_node = create_node(start, "Date", "temporal", f"Start date at {name}")
            add_node(date_node)
            add_edge(name, start, "employment_start", "temporal")

    # 3. Add Roles
    for role, company, focus in ROLES:
        node = create_node(role, "Role", "role", f"{focus} at {company}")
        add_node(node)
        add_edge("Pedro Reichow", role, "held_role", "employment")
        add_edge(role, company, "role_at", "employment")

    # 4. Add Technical Categories and Skills
    for category, skills in TECH_CATEGORIES.items():
        # Add category node
        cat_node = create_node(category, "SkillCategory", "category", f"Technical expertise area: {category}")
        add_node(cat_node)
        add_edge("Pedro Reichow", category, "has_expertise", "skill")

        # Add each skill
        for skill_name, skill_desc, skill_type in skills:
            skill_node = create_node(skill_name, "Technology", "technology", skill_desc, skillType=skill_type)
            add_node(skill_node)
            add_edge(category, skill_name, "includes", "hierarchy")
            add_edge("Pedro Reichow", skill_name, "proficient_in", "skill")

    # 5. Add Achievements
    for achievement, desc, company in ACHIEVEMENTS:
        node = create_node(achievement, "Achievement", "achievement", desc)
        add_node(node)
        add_edge("Pedro Reichow", achievement, "achieved", "accomplishment")
        if company in node_ids:
            add_edge(achievement, company, "at_company", "context")

    # 6. Add Education
    for degree, uni_short, uni_full in EDUCATION:
        degree_node = create_node(degree, "Degree", "education", f"Academic degree from {uni_full}")
        uni_node = create_node(uni_short, "University", "education", uni_full)
        add_node(degree_node)
        add_node(uni_node)
        add_edge("Pedro Reichow", degree, "has_degree", "education")
        add_edge(degree, uni_short, "awarded_by", "education")

    # 7. Add Domains
    for domain, desc, company in DOMAINS:
        node = create_node(domain, "Domain", "domain", desc)
        add_node(node)
        add_edge("Pedro Reichow", domain, "works_in", "expertise")
        if company in node_ids:
            add_edge(domain, company, "applied_at", "context")

    # 8. Add Languages
    for lang, level, lang_type in LANGUAGES:
        node = create_node(lang, "Language", "language", f"{level} proficiency", level=level)
        add_node(node)
        add_edge("Pedro Reichow", lang, "speaks", "language")

    # 9. Add Portfolio
    for name, desc, ptype in PORTFOLIO:
        node = create_node(name, "Portfolio", "portfolio", desc)
        add_node(node)
        add_edge("Pedro Reichow", name, "has_portfolio", "portfolio")

    # 10. Add Company-Technology relationships
    company_tech_map = {
        "CVS Health": ["Datadog", "Grafana", "SLOs", "p50/p95 Latency", "Cost-per-token", "HIPAA", "FedRAMP", "A/B Testing", "Faithfulness Metrics"],
        "Santodigital": ["BigQuery", "Vertex AI", "RAG", "ADK", "Zendesk", "Human-in-the-loop", "Prompt Engineering"],
        "Capgemini Brasil": ["Knowledge Graphs", "RDF", "OWL", "Protégé", "Semantic Search"],
        "Simulated Reality": ["Node.js", "React", "Unity", "Unreal Engine", "Pub/Sub", "Message Queues", "VR Solutions"],
        "QI Tech": ["PySpark", "Dataproc", "gRPC", "Delta Lake", "GCS", "ACID Transactions"],
        "PecSmart": ["IoT", "Raspberry Pi", "Livestock Monitoring", "Behavioral Analysis"],
        "Fontes Promotora": ["FastAPI", "Flask", "Django", "Web Scraping"],
        "MoveUp AI": ["Cognee", "Hybrid Retrieval", "MCP Servers", "OAuth 2.0", "LangChain", "LangGraph", "Mem0", "Model-as-a-judge", "Jira", "GitHub", "Gmail API", "Google Drive API"],
        "Trinnix AI Lab": ["YoloX", "Roboflow", "Computer Vision", "OpenAI GPT-4", "Claude", "Gemini"],
    }

    for company, techs in company_tech_map.items():
        for tech in techs:
            if tech in node_ids and company in node_ids:
                add_edge(company, tech, "uses", "technology_usage")

    # 11. Add Concepts
    for concept, desc, area in CONCEPTS:
        node = create_node(concept, "Concept", "concept", desc, area=area)
        add_node(node)
        add_edge("Pedro Reichow", concept, "understands", "knowledge")

    # 12. Add Projects
    for project, desc, company in PROJECTS:
        node = create_node(project, "Project", "project", desc)
        add_node(node)
        add_edge("Pedro Reichow", project, "built", "development")
        if company in node_ids:
            add_edge(project, company, "developed_at", "context")

    # 13. Add Features
    for feature, desc in FEATURES:
        node = create_node(feature, "Feature", "feature", desc)
        add_node(node)
        add_edge("Pedro Reichow", feature, "implemented", "capability")

    # 14. Add concept relationships
    concept_relations = [
        ("Artificial Intelligence", "Machine Learning", "encompasses"),
        ("Machine Learning", "Deep Learning", "encompasses"),
        ("Deep Learning", "Transformers", "uses"),
        ("Large Language Models", "Transformers", "based_on"),
        ("Large Language Models", "Natural Language Processing", "field"),
        ("RAG", "Large Language Models", "augments"),
        ("RAG", "Semantic Search", "combines"),
        ("Knowledge Graphs", "Neo4j", "stored_in"),
        ("Microservices", "Docker", "deployed_with"),
        ("Microservices", "Kubernetes", "orchestrated_by"),
        ("Event-Driven Architecture", "Message Queues", "uses"),
        ("Event-Driven Architecture", "Pub/Sub", "implements"),
        ("Infrastructure as Code", "Terraform", "implemented_with"),
        ("Data Lake", "Delta Lake", "implemented_as"),
        ("Data Warehouse", "BigQuery", "example"),
        ("Observability", "Logging", "includes"),
        ("Observability", "Tracing", "includes"),
        ("Observability", "Alerting", "includes"),
        ("SLOs", "Reliability", "measures"),
        ("Agile", "Scrum", "framework"),
    ]

    for source, target, rel in concept_relations:
        if source in node_ids and target in node_ids:
            add_edge(source, target, rel, "conceptual_relation")

    # 15. Add Industries
    for industry, desc, companies in INDUSTRIES:
        node = create_node(industry, "Industry", "industry", desc)
        add_node(node)
        add_edge("Pedro Reichow", industry, "experience_in", "industry")
        for company in companies:
            if company in node_ids:
                add_edge(company, industry, "operates_in", "industry")

    # 16. Add Soft Skills
    for skill, desc in SOFT_SKILLS:
        node = create_node(skill, "SoftSkill", "softskill", desc)
        add_node(node)
        add_edge("Pedro Reichow", skill, "demonstrates", "competency")

    # 17. Add Certifications
    for cert, desc in CERTIFICATIONS:
        node = create_node(cert, "Certification", "certification", desc)
        add_node(node)
        add_edge("Pedro Reichow", cert, "qualified_for", "certification")

    # 18. Add Additional Tools
    for tool, desc, category in ADDITIONAL_TOOLS:
        node = create_node(tool, "Tool", "tool", desc, toolCategory=category)
        add_node(node)
        add_edge("Pedro Reichow", tool, "uses", "tooling")

    # 19. Add Methodologies
    for method, desc in METHODOLOGIES:
        node = create_node(method, "Methodology", "methodology", desc)
        add_node(node)
        add_edge("Pedro Reichow", method, "applies", "methodology")

    # 20. Add Locations
    for loc, loc_type, parent in LOCATIONS:
        node = create_node(loc, "Location", "location", f"{loc_type} in {parent}")
        add_node(node)
        add_edge("Pedro Reichow", loc, "located_in" if loc == "Santa Catarina" else "works_with", "location")

    # 20. Add Career Phases
    for phase, name, focus in CAREER_PHASES:
        node = create_node(phase, "CareerPhase", "temporal", f"{name}: {focus}")
        add_node(node)
        add_edge("Pedro Reichow", phase, "career_phase", "temporal")

    # 21. Add cross-technology relationships
    tech_relations = [
        ("LangChain", "LangGraph", "integrates_with"),
        ("RAG", "Hybrid Retrieval", "implements"),
        ("RAG", "Vector Database", "requires"),
        ("Cognee", "Knowledge Graphs", "builds"),
        ("Cognee", "Hybrid Retrieval", "enables"),
        ("Docker", "Kubernetes", "deployed_on"),
        ("Python", "FastAPI", "powers"),
        ("Python", "PySpark", "powers"),
        ("GCP", "BigQuery", "includes"),
        ("GCP", "Vertex AI", "includes"),
        ("GCP", "Dataproc", "includes"),
        ("AWS", "Docker", "hosts"),
        ("Kubernetes", "Docker", "orchestrates"),
        ("SLOs", "Datadog", "measured_by"),
        ("SLOs", "Grafana", "visualized_in"),
        ("OpenAI GPT-4", "Tool Calling", "supports"),
        ("Claude", "Tool Calling", "supports"),
        ("Gemini", "Tool Calling", "supports"),
        ("YoloX", "Computer Vision", "technique_for"),
        ("Roboflow", "Computer Vision", "platform_for"),
    ]

    for source, target, rel in tech_relations:
        if source in node_ids and target in node_ids:
            add_edge(source, target, rel, "technical_relation")

    return {
        "nodes": nodes,
        "edges": edges,
        "lastUpdated": datetime.now().isoformat(),
        "source": "rich-generator",
        "cognified": True,
        "nodeCount": len(nodes),
        "edgeCount": len(edges)
    }

if __name__ == "__main__":
    graph = build_graph()

    output_path = "../app/data/cognee-graph.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(graph, f, indent=2, ensure_ascii=False)

    print(f"✅ Rich graph generated!")
    print(f"   Nodes: {graph['nodeCount']}")
    print(f"   Edges: {graph['edgeCount']}")
    print(f"   Output: {output_path}")

