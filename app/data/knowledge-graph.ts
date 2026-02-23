// Knowledge Graph Data - Embedded for production reliability
export const knowledgeGraphData = {
  "nodes": [
    {
      "id": "Pedro Reichow",
      "type": "Person",
      "title": "Cloud AI Solutions Architect • Agent Developer • Technical Entrepreneur",
      "location": "Santa Catarina, Brazil",
      "contact": {
        "email": "pedroreichow3@gmail.com",
        "linkedin": "https://www.linkedin.com/in/pedroreichow",
        "portfolio": "https://pedroreichow.com.br/"
      },
      "summary": "AI & Data Engineering leader with 8+ years of experience across fintech, healthcare, and enterprise SaaS. Currently building production AI agent systems at Santodigital (Google Cloud Partner). Co-founded two AI ventures: MoveUp AI and Trinnix AI Lab."
    },
    {
      "id": "Santodigital",
      "type": "Experience",
      "title": "Cloud AI Solutions Architect & Agent Developer",
      "years": "Jan 2024 - Present",
      "duration": "1.5+ years",
      "location": "Brazil (Google Cloud Premier Partner)",
      "description": "Designed and shipped 8+ production AI agent systems using Google ADK, building full-stack interfaces for document intelligence, semantic chunking, and enterprise federation.",
      "responsibilities": [
        "Shipped 8+ production AI agent systems for enterprise clients using Google ADK",
        "Built end-to-end document intelligence pipelines and vector indexing on Vertex AI + BigQuery",
        "Architected dynamic federation integrations connecting AI agents to client ERP and CRM",
        "Designed production RAG pipelines with offline evaluation suites (RAGAS)"
      ],
      "achievements": [
        "Reduced hallucination rates by 35% via agentic reinforcement loops",
        "Processed 100K+ documents across client deployments"
      ],
      "technologies": ["Google ADK", "Vertex AI", "BigQuery", "RAGAS", "React", "FastAPI", "Vector Indexes"]
    },
    {
      "id": "CVS Health",
      "type": "Experience",
      "title": "Senior Data & AI Engineer | AI Observability Lead",
      "years": "Aug 2024 - Dec 2025",
      "duration": "1+ year",
      "location": "Remote",
      "description": "Led AI observability tracking faithfulness and relevancy across HIPAA/FedRAMP-compliant environments for a major healthcare provider.",
      "responsibilities": [
        "Defined and implemented SLOs for AI pipeline latency and cost-per-token monitoring",
        "Built real-time observability dashboards using Datadog and Grafana",
        "Led a team of 4 engineers developing enterprise agentic applications",
        "Designed data ingestion pipelines processing clinical datasets (200GB+ daily)"
      ],
      "achievements": [
        "Improved accuracy by 22% through prompt version A/B testing",
        "Successfully integrated multiple LLMs with predictive multi-step reasoning"
      ],
      "technologies": ["Datadog", "Grafana", "Python", "TypeScript", "Apache Spark", "Airflow", "LLMs"]
    },
    {
      "id": "MoveUp AI",
      "type": "Experience",
      "title": "Founding Engineer & Technical Co-founder",
      "years": "Jan 2025 - Jul 2025",
      "duration": "7 months",
      "location": "San Francisco, CA (Remote)",
      "description": "Co-founding AI-powered workforce intelligence platform serving 15+ enterprise teams with integrated Slack workflows, knowledge graphs, and team analytics.",
      "responsibilities": [
        "Architected knowledge graph infrastructure with FalkorDB and Neo4j",
        "Built graph-based multi-agent orchestration system using LangGraph and Agno",
        "Designed MCP (Model Context Protocol) servers in TypeScript for agent communication",
        "Built end-to-end autonomous workflows with N8N orchestration"
      ],
      "achievements": [
        "Reduced analyst workload by ~60% through automated reporting",
        "Architected intelligent contextual memory reasoning across 50K+ documents"
      ],
      "technologies": ["TypeScript", "MCP Protocol", "Python", "Agno", "LangGraph", "Zep", "Supabase", "Neo4j", "N8N", "Slack API"]
    },
    {
      "id": "Trinnix AI Lab",
      "type": "Experience",
      "title": "Co-founder & Lead AI Engineer",
      "years": "Feb 2024 - Nov 2024",
      "duration": "10 months",
      "location": "Brazil",
      "description": "Led development of AI solutions focusing on computer vision and LLM integration for agricultural technology and precision farming applications.",
      "responsibilities": [
        "Developed and deployed agricultural monitoring systems using YOLOv8 and Roboflow",
        "Architected ontological knowledge graphs with Neo4j",
        "Integrated commercial LLMs (GPT-4o, Claude 3.5, Gemini 1.5)",
        "Built scalable TypeScript platforms with tRPC and Node.js for geospatial analysis"
      ],
      "achievements": [
        "Achieved >95% accuracy in plant disease detection and livestock behavior analysis"
      ],
      "technologies": ["YOLOv8", "Roboflow", "Neo4j", "GPT-4o", "Claude 3.5", "Gemini 1.5", "TypeScript", "tRPC", "Node.js"]
    },
    {
      "id": "Capgemini Brasil",
      "type": "Experience",
      "title": "Senior Solutions Consultant & Knowledge Engineer",
      "years": "Jan 2022 - Dec 2023",
      "duration": "2 years",
      "location": "Brazil",
      "description": "Architected enterprise knowledge graph platform using Anzo Analytics with RDF/OWL ontologies for fraud detection and risk scoring.",
      "responsibilities": [
        "Designed domain ontologies with Protégé and built SPARQL query interfaces",
        "Built Python API middleware with FastAPI wrapping SPARQL endpoints",
        "Led data modeling initiatives across a 50+ engineer team",
        "Implemented ETL pipelines with PySpark and Airflow (100GB+ daily)"
      ],
      "achievements": [
        "Handled 2K+ requests/sec in production API",
        "Processed 10M+ entity relationships across distributed stores"
      ],
      "technologies": ["Python", "RDF/OWL/SKOS", "Anzo Analytics", "FastAPI", "Protégé", "SPARQL", "PySpark", "Airflow"]
    },
    {
      "id": "Simulated Reality",
      "type": "Experience",
      "title": "Full Stack Engineer | VR, Real-Time & 3D Systems",
      "years": "Jan 2021 - Dec 2021",
      "duration": "1 year",
      "location": "Brazil",
      "description": "Built scalable backend for VR training and healthcare wellness applications with Node.js and React serving 10K+ concurrent sessions.",
      "technologies": ["Node.js", "React", "WebSocket", "RabbitMQ", "TensorFlow", "Blockchain"]
    },
    {
      "id": "QI Tech",
      "type": "Experience",
      "title": "Senior Data Engineer",
      "years": "Jan 2019 - Dec 2020",
      "duration": "2 years",
      "location": "Fintech",
      "description": "Processed 500GB+ daily financial transactions using PySpark on GCP Dataproc and architected Delta Lake on GCS.",
      "technologies": ["PySpark", "GCP Dataproc", "Delta Lake", "Airflow", "BigQuery", "gRPC"]
    }
  ],
  "skills": [
    {
      "category": "Artificial Intelligence & Machine Learning",
      "items": [
        "LangGraph, LangChain, CrewAI, Agno",
        "Google ADK",
        "Multi-Agent Orchestration",
        "MCP Servers",
        "Computer Vision (YOLOv8, OpenCV)",
        "Large Language Models (GPT-4o, Claude, Gemini)",
        "RAG Pipelines"
      ],
      "proficiency": "Expert"
    },
    {
      "category": "Data Engineering & Knowledge Search",
      "items": [
        "Neo4j, FalkorDB, RDF/OWL/SKOS Ontologies",
        "Vector Databases (Supabase, Pinecone, Chroma)",
        "Apache Spark (PySpark, Spark SQL, Streaming)",
        "Apache Airflow",
        "Delta Lake",
        "SPARQL, Protégé"
      ],
      "proficiency": "Expert"
    },
    {
      "category": "Programming & Cloud",
      "items": [
        "Python, TypeScript, JavaScript, SQL",
        "FastAPI, Django, React, Node.js",
        "GCP (BigQuery, Vertex AI, Dataproc)",
        "AWS (S3, Redshift, EMR)",
        "Docker, Kubernetes, Terraform"
      ],
      "proficiency": "Expert"
    }
  ]
};

// Helper function to generate contextual responses
export function generateContextualResponse(message: string, language: string = 'en'): string {
  const lowerMessage = message.toLowerCase();
  const isPt = language === 'pt';

  if (lowerMessage.includes('contact') || lowerMessage.includes('reach') || lowerMessage.includes('email') || lowerMessage.includes('linkedin') || lowerMessage.includes('contato') || lowerMessage.includes('email') || lowerMessage.includes('falar')) {
    if (isPt) {
      return `Você pode entrar em contato com Pedro através dos seguintes meios:

- **E-mail**: pedroreichow3@gmail.com
- **LinkedIn**: [linkedin.com/in/pedroreichow](https://linkedin.com/in/pedroreichow)
- **Site**: [pedroreichow.com.br](https://pedroreichow.com.br)

Pedro é um experiente Arquiteto de Soluções AI Cloud e Desenvolvedor de Agentes baseado em Santa Catarina, Brasil. Ele é especialista na construção de sistemas de agentes de IA em produção, pipelines de dados escaláveis e grafos de conhecimento.`;
    }
    return `You can contact Pedro Reichow through the following methods:

- **Email**: pedroreichow3@gmail.com
- **LinkedIn**: [linkedin.com/in/pedroreichow](https://linkedin.com/in/pedroreichow)
- **Website**: [pedroreichow.com.br](https://pedroreichow.com.br)

Pedro is a highly experienced Cloud AI Solutions Architect and Agent Developer based in Santa Catarina, Brazil. With over 8 years of expertise, he specializes in building production AI agent systems, scalable data pipelines, and advanced knowledge graphs.`;
  }

  if (lowerMessage.includes('skill') || lowerMessage.includes('technical') || lowerMessage.includes('technology') || lowerMessage.includes('expertise') || lowerMessage.includes('habilidade') || lowerMessage.includes('tecnologia') || lowerMessage.includes('ferramenta') || lowerMessage.includes('experiencia')) {
    if (isPt) {
      return `Pedro possui profunda expertise em IA, Engenharia de Dados e sistemas de nuvem full-stack:

### Áreas de Especialidade
1. **IA Agêntica e LLMs**
   - Proficiente no desenvolvimento de sistemas multi-agentes via LangGraph, Agno, CrewAI e Google ADK.
   - Especialista em lidar com pipelines de RAG, implantação de servidores MCP (Model Context Protocol) e construção de observabilidade de LLMs (RAGAS).
   
2. **Ciência de Dados e Grafos de Conhecimento**
   - Gerenciou grafos com mais de 10M+ relacionamentos usando Neo4j, FalkorDB e RDF/OWL em Anzo Analytics.
   - Implantou bancos de dados vetoriais de alto desempenho, incluindo Supabase, Pinecone e Chroma.

3. **Engenharia de Dados**
   - Construiu pipelines de ETL/ELT usando PySpark e Apache Airflow processando 500GB+ de tráfego diário no GCP / AWS.

4. **Experiência Empreendedora e Liderança**
   - Co-fundou a MoveUp AI, enviando orquestrações multi-agentes para análise de força de trabalho.
   - Co-fundou o Trinnix AI Lab, utilizando visão computacional (YOLOv8) e LLMs para AgTech.`;
    }
    return `Pedro holds deep expertise across AI, Data Engineering, and full-stack cloud systems:

### Areas of Expertise
1. **Agentic AI & LLMs**
   - Proficient in developing multi-agent systems via LangGraph, Agno, CrewAI, and Google ADK.
   - Expert in handling RAG pipelines, deploying Model Context Protocol (MCP) servers, and building LLM observability stacks (RAGAS).
   
2. **Data Science & Knowledge Graphs**
   - Managed graphs scaling over 10M+ relationships using Neo4j, FalkorDB, and RDF/OWL on Anzo Analytics.
   - Deployed high-performance vector databases including Supabase, Pinecone, and Chroma.

3. **Data Engineering**
   - Built ETL/ELT pipelines using PySpark and Apache Airflow processing 500GB+ of daily traffic on GCP / AWS.

4. **Entrepreneurial & Leadership Roles**
   - Co-founded MoveUp AI, shipping multi-agent orchestrations for workforce analytics.
   - Co-founded Trinnix AI Lab leveraging computer vision (YOLOv8) and LLMs for AgTech platforms.`;
  }

  // General fallback
  if (isPt) {
    return `Pedro Reichow é um experiente Arquiteto de Soluções AI Cloud, Desenvolvedor de Agentes e Empreendedor de Tecnologia com mais de 8 anos de experiência em fintech, saúde e SaaS empresarial.

### Destaques:
- **Sistemas de IA Agêntica:** Construindo atualmente sistemas de agente de IA em produção na Santodigital (Google Cloud Partner), com mais de 8 implantações incluindo inteligência de documentos, pipelines RAG e federação de dados corporativos.
- **Saúde e Escalabilidade:** Liderou equipe de observabilidade de IA na CVS Health para rastrear fidelidade e relevância em distribuições LLM usando Datadog e Grafana em nuvem HIPAA/FedRAMP.
- **Empreendedorismo:** Co-fundou anteriormente a MoveUp AI (sistemas de agentes de IA baseados em MCP para inteligência de força de trabalho) e Trinnix AI Lab (aplicando visão computacional e grafos de conhecimento em AgTech).
- **Dados Corporativos:** Ampla experiência liderando arquitetura de busca semântica e fraude em Anzo Analytics (Capgemini) e como Engenheiro de Dados Sênior processando mais de 500 GB diários na QI Tech (PySpark / GCP).

A combinação única de experiência prática que Pedro possui - desde dimensionamento do Spark até implantação de agentes LLM usando Google ADK, LangGraph e bases de dados vetoriais - torna-o um líder técnico de alto impacto para iniciativas ambiciosas de IA.`;
  }
  return `Pedro Reichow is a seasoned Cloud AI Solutions Architect, Agent Developer, and Technology Entrepreneur with 8+ years of experience across fintech, healthcare, and enterprise SaaS.

### Key Highlights:
- **Agentic AI Systems:** Currently building production AI agent systems at Santodigital (Google Cloud Partner), shipping 8+ enterprise deployments featuring document intelligence, RAG pipelines, and enterprise data federation.
- **Healthcare & Scalability:** Led AI Observability at CVS Health, handling metrics, faithfulness, and relevancy across federated LLM deployments scaling over clinical datasets.
- **Entrepreneurship:** Previously co-founded MoveUp AI (building MCP-enabled AI agents for workforce intelligence) and Trinnix AI Lab (applying computer vision and knowledge graphs to AgTech).
- **Enterprise Data:** Earlier extensive experience architecting semantic search and fraud detection systems using Anzo Analytics at Capgemini and serving as a Senior Data Engineer at QI Tech processing 500GB+ daily transactions via PySpark.

Pedro's unique blend of hands-on technical depth—ranging from Spark Streaming at scale to deploying LLM agents with Google ADK, LangGraph, vector databases, and MCP orchestration—makes him a high-impact technical leader for ambitious AI initiatives.`;
}
