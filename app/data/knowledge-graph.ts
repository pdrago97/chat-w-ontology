// Knowledge Graph Data - Embedded for production reliability
export const knowledgeGraphData = {
  "nodes": [
    {
      "id": "Pedro Reichow",
      "type": "Person",
      "title": "Senior AI Engineer • Data Specialist • Technology Entrepreneur",
      "location": "Santa Catarina, Brazil",
      "contact": {
        "email": "pedro_reichow@hotmail.com",
        "linkedin": "https://www.linkedin.com/in/pedroreichow",
        "portfolio": "https://talk-to-my-resume.vercel.app/"
      },
      "summary": "Experienced AI Engineer and Data Specialist with 5+ years building production-ready artificial intelligence solutions and scalable data systems. Expert in computer vision, large language model integration, and high-performance data pipelines processing 500GB+ daily."
    },
    {
      "id": "Capgemini Brasil",
      "type": "Experience",
      "title": "Senior Solutions Consultant (Solutions Consultant IV)",
      "years": "Jan 2025 - Present",
      "duration": "8+ months",
      "location": "Brazil",
      "description": "Lead enterprise-level AI and data engineering solutions for large-scale clients, specializing in knowledge graphs, fraud detection, and generative AI implementations",
      "responsibilities": [
        "Architected microservices in Python for serving agentic AI systems with RAG capabilities",
        "Built sophisticated ontologies using Protégé and RDF/OWL, integrated with Anzo Analytics",
        "Developed advanced graph navigation interfaces using TypeScript and Cytoscape.js for fraud detection",
        "Collaborate with 50+ engineers and consultants on enterprise-scale data engineering optimizations"
      ],
      "achievements": [
        "Led enterprise AI implementations for large-scale clients",
        "Delivered complex business intelligence and fraud risk analysis solutions",
        "Managed teams of 50+ engineers and consultants"
      ],
      "technologies": [
        "Python", "RAG", "Protégé", "RDF/OWL", "Anzo Analytics", "TypeScript", "Cytoscape.js", "Microservices", "Fraud Detection", "Knowledge Graphs"
      ]
    },
    {
      "id": "MoveUp AI",
      "type": "Experience",
      "title": "Founding Engineer & Technical Co-founder",
      "years": "Jan 2025 - Present",
      "duration": "8+ months",
      "location": "San Francisco, CA - Remote",
      "description": "Co-founding AI-powered workforce intelligence platform serving 15+ enterprise teams with integrated Slack workflows, knowledge graphs, and team analytics",
      "responsibilities": [
        "Architected TypeScript MCP (Model Context Protocol) servers enabling seamless AI agent communication",
        "Built sophisticated Python agents using Agno, LangChain, and LangGraph for intelligent team insights",
        "Implemented Zep memory systems and Supabase vector databases integrated with commercial LLMs",
        "Developed comprehensive Slack integrations and N8N automation workflows"
      ],
      "achievements": [
        "Serving 15+ enterprise teams with AI-powered workforce intelligence",
        "Built unified AI agent interface accessing 6+ enterprise tools",
        "50%+ reduction in information gathering time through natural language queries"
      ],
      "technologies": [
        "TypeScript", "MCP Protocol", "Python", "Agno", "LangChain", "LangGraph", "Zep", "Supabase", "OpenAI", "Anthropic", "Slack API", "N8N", "Vector Databases"
      ]
    },
    {
      "id": "Trinnix AI Lab",
      "type": "Experience",
      "title": "AI Engineer & Computer Vision Specialist",
      "years": "Feb 2024 - Nov 2024",
      "duration": "10 months",
      "location": "Brazil",
      "description": "Led development of AI solutions focusing on computer vision and LLM integration for agricultural technology and precision farming applications",
      "responsibilities": [
        "Developed and deployed agricultural monitoring systems using YoloX and Roboflow",
        "Built ontological knowledge graphs using Neo4j for agricultural data analysis",
        "Integrated multiple LLMs (GPT-4o, Claude 3.5, Gemini 1.5) with advanced prompt engineering",
        "Built scalable TypeScript platforms with tRPC and Node.js for geospatial analysis"
      ],
      "achievements": [
        "Achieved >95% accuracy in plant disease detection and livestock behavior analysis",
        "Successfully integrated multiple LLMs for automated reporting and intelligent alerting"
      ],
      "technologies": [
        "YoloX", "Roboflow", "Neo4j", "GPT-4o", "Claude 3.5", "Gemini 1.5", "TypeScript", "tRPC", "Node.js", "Computer Vision", "Prompt Engineering"
      ]
    }
  ],
  "skills": [
    {
      "category": "Artificial Intelligence & Machine Learning",
      "items": [
        "Computer Vision (YoloX, OpenCV)",
        "Large Language Models (GPT-4o, Claude, Gemini)",
        "Natural Language Processing",
        "Prompt Engineering",
        "Neural Networks",
        "Deep Learning Frameworks",
        "RAG (Retrieval Augmented Generation)",
        "Agentic AI Systems"
      ],
      "proficiency": "Expert"
    },
    {
      "category": "Data Engineering & Big Data",
      "items": [
        "Apache Spark (PySpark, Spark SQL, Streaming)",
        "BigQuery",
        "Data Lake/Warehouse Architecture",
        "ETL/ELT Pipelines",
        "Data Modeling",
        "Performance Optimization",
        "Real-time Processing",
        "Distributed Computing"
      ],
      "proficiency": "Expert"
    },
    {
      "category": "Programming & Development",
      "items": [
        "Python",
        "TypeScript",
        "JavaScript",
        "SQL",
        "GraphQL",
        "React",
        "Django",
        "FastAPI",
        "Flask",
        "Microservices Architecture"
      ],
      "proficiency": "Expert"
    },
    {
      "category": "Cloud & Infrastructure",
      "items": [
        "AWS (S3, Redshift, Glue, Lambda, EMR)",
        "Google Cloud Platform (BigQuery, Dataproc, Composer)",
        "Azure (App Service, Blob Storage)",
        "Docker",
        "Kubernetes",
        "Infrastructure-as-Code",
        "CI/CD",
        "Red Hat OpenShift"
      ],
      "proficiency": "Expert"
    }
  ]
};

// Helper function to generate contextual responses
export function generateContextualResponse(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Contact information
  if (lowerMessage.includes('contact') || lowerMessage.includes('reach') || lowerMessage.includes('email') || lowerMessage.includes('linkedin')) {
    return `You can contact Pedro Reichow through the following methods:

- **Email**: pedro_reichow@hotmail.com
- **LinkedIn**: [linkedin.com/in/pedroreichow](https://linkedin.com/in/pedroreichow)

Pedro is a highly experienced Senior AI Engineer and Data Specialist based in Santa Catarina, Brazil. He has over five years of expertise in building production-ready AI solutions and scalable data systems. His skillset includes advanced knowledge in computer vision, large language model integration, and developing high-performance data pipelines.

With a strong academic background, including a Bachelor of Science in Systems Analysis and Development and a Bachelor of Science in Electrical Engineering, Pedro has proven his ability to lead technical teams and deliver innovative solutions across multiple sectors such as agriculture, healthcare, and fintech. He has also co-founded a company focused on AI-powered workforce intelligence.

If you're looking to collaborate with a talented individual who has a passion for technology and a track record of success, reach out to Pedro today!`;
  }
  
  // Technical skills
  if (lowerMessage.includes('skill') || lowerMessage.includes('technical') || lowerMessage.includes('technology') || lowerMessage.includes('expertise')) {
    return `Pedro is a highly skilled Senior AI Engineer and Data Specialist with over 5 years of extensive experience in developing and implementing production-ready artificial intelligence solutions and scalable data systems. Here's a breakdown of his core technical skills:

### Areas of Expertise
1. **Artificial Intelligence & Machine Learning**
   - Expertise in computer vision and natural language processing.
   - Skilled in multi-modal AI systems and edge AI computing.

2. **Data Science & Engineering**
   - Advanced data processing with tools such as Pandas, managing high-performance data pipelines processing over 500GB daily.
   - Strong background in creating scalable, distributed systems and real-time analytics.

3. **Software Development & Full-Stack Solutions**
   - Proficient in frameworks including Django REST for backend development and ReactJS for frontend applications.
   - Experienced in cloud architecture and deployment strategies, utilizing AWS and Docker.

4. **Emerging Technologies**
   - Knowledge in IoT integration, VR/AR applications, and infrastructure for quantum computing.
   - Innovatively employs blockchain technologies to enhance data security.

5. **Development Practices & Methodologies**
   - Strong advocate of Test-Driven Development (TDD) and Agile methodologies.
   - Renowned for his performance optimization skills and system architecture design.

6. **Entrepreneurial Experience**
   - As a founding engineer at MoveUp AI, he co-founded an AI-powered workforce intelligence platform, showcasing his ability to lead and innovate.
   - Architected advanced server systems and developed intelligent Python agents, demonstrating his hands-on technical capabilities.

### Educational Background
- Bachelor of Science in Systems Analysis and Development.
- Bachelor of Science in Electrical Engineering.
- Technical Diploma in Electrotechnics.

Pedro's comprehensive skill set, combined with his entrepreneurial spirit and proven leadership, makes him an exceptional candidate for any organization looking to innovate and excel in AI and data-driven initiatives. His experience across diverse sectors including agritech, healthcare, and fintech positions him uniquely to create solutions that have a significant impact.`;
  }
  
  // General about Pedro
  return `Pedro Reichow is a seasoned AI Engineer, Data Specialist, and Technology Entrepreneur based in Santa Catarina, Brazil. With over 5 years of experience, he has a proven track record in developing production-ready artificial intelligence solutions and scalable data systems.

### Key Highlights of Pedro's Profile:

- **Expertise in AI and Data Solutions:** Pedro specializes in computer vision, large language model integration, and building high-performance data pipelines capable of processing over 500GB of data daily. His technical prowess is complemented by a strong foundation in full-stack development and cloud architecture.

- **Entrepreneurial Spirit:** As the Founding Engineer and Technical Co-founder at MoveUp AI—a cutting-edge AI-powered workforce intelligence platform—Pedro has demonstrated his innovative capabilities. He has successfully architected systems that enhance team analytics and integrate seamlessly with enterprise tools, showcasing his ability to bring ideas from conception to a market-ready product.

- **Range of Technologies:** His areas of expertise include multi-modal AI systems, real-time analytics, and emerging technologies such as IoT integration and Blockchain applications.

- **Professional Experience:** Currently serving as a Senior Solutions Consultant at Capgemini Brasil, Pedro has played significant roles in various projects, demonstrating exceptional leadership and mentoring skills. He has also been actively involved in shaping agile development practices and performance optimization strategies across different sectors, including agriculture, healthcare, and fintech.

- **Strong Academic Background:** Pedro holds a Bachelor of Science in Systems Analysis and Development and a Bachelor of Science in Electrical Engineering, equipping him with a robust understanding of both software and hardware aspects of technology.

### Achievements:

- Co-founded an enterprise-grade platform that provides integrated analytics and knowledge management tools to over 15 teams.
- Designed and developed advanced data processing pipelines to enhance business intelligence solutions.
- Successfully led various technical teams and initiatives, underscoring his capability to navigate complex project landscapes and deliver impactful results.

Pedro's unique combination of technical expertise, entrepreneurial experience, and leadership skills makes him a valuable asset for any organization looking to innovate and leverage cutting-edge technology in their operations. His passion for artificial intelligence and commitment to excellence positions him as a prime candidate for recruiters and entrepreneurs eager to collaborate on future-focused projects.`;
}
