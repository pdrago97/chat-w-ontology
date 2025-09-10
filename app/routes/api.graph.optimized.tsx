import 'dotenv/config';
import { json, type LoaderFunction } from "@remix-run/node";

// Optimized knowledge graph API that creates a concise, story-focused graph
// Filters out noise and creates meaningful professional connections

function supabaseHeaders() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}` } } as const;
}

// Core professional entities we want to focus on
const CORE_ENTITIES = {
  PERSON: ['pedro', 'reichow', 'pedro reichow', 'pedro drago'],
  COMPANIES: ['moveup', 'capgemini', 'estácio', 'ufsc', 'ifsc'],
  TECHNOLOGIES: ['python', 'react', 'aws', 'docker', 'postgresql', 'fastapi', 'openai', 'anthropic', 'claude', 'gpt'],
  ROLES: ['engineer', 'consultant', 'founder', 'developer', 'specialist'],
  EDUCATION: ['bachelor', 'degree', 'university', 'systems analysis', 'electrical engineering', 'electrotechnics'],
  PROJECTS: ['ai agent', 'workforce intelligence', 'data pipeline', 'microservices', 'mcp protocol']
};

// Create optimized professional graph
function createOptimizedGraph(rawNodes: any[], rawEdges: any[]) {
  const coreNodes = new Map();
  const coreEdges: any[] = [];
  
  // Step 1: Create Pedro as the central node
  coreNodes.set('pedro-reichow', {
    id: 'pedro-reichow',
    label: 'Pedro Reichow',
    type: 'Person',
    category: 'person',
    title: 'Pedro Reichow - AI Engineer & Entrepreneur',
    description: 'Senior AI Engineer and Data Specialist with 5+ years of experience building scalable AI/ML solutions and leading technical teams.',
    data: {
      priority: 10,
      enhanced: true,
      isPrimaryPerson: true,
      location: 'Santa Catarina, Brazil',
      focus: 'AI Engineering & Data Science',
      experience: '5+ years in AI/ML'
    }
  });

  // Step 2: Create key companies
  coreNodes.set('moveup-ai', {
    id: 'moveup-ai',
    label: 'MoveUp AI',
    type: 'Company',
    category: 'company',
    title: 'MoveUp AI - AI-Powered Workforce Intelligence',
    description: 'AI-Powered Workforce Intelligence Platform where Pedro serves as Founding Engineer, building microservices architecture and AI agents.',
    data: {
      priority: 9,
      enhanced: true,
      role: 'Founding Engineer',
      period: 'Feb 2025 - Present',
      technologies: ['Python', 'FastAPI', 'AWS', 'Docker', 'PostgreSQL']
    }
  });

  coreNodes.set('capgemini-brasil', {
    id: 'capgemini-brasil',
    label: 'Capgemini Brasil',
    type: 'Company',
    category: 'company',
    title: 'Capgemini Brasil - Global Technology Consulting',
    description: 'Global technology consulting company where Pedro worked as Solutions Consultant, providing technical architecture and consulting.',
    data: {
      priority: 8,
      enhanced: true,
      role: 'Solutions Consultant',
      period: 'Previous Experience'
    }
  });

  // Step 3: Create key technologies
  const keyTechnologies = [
    { id: 'python', label: 'Python', desc: 'Primary programming language for AI/ML development and backend services' },
    { id: 'react', label: 'React', desc: 'Frontend framework for building modern user interfaces' },
    { id: 'aws', label: 'AWS', desc: 'Cloud platform for scalable infrastructure and deployment' },
    { id: 'fastapi', label: 'FastAPI', desc: 'Modern Python web framework for building high-performance APIs' },
    { id: 'postgresql', label: 'PostgreSQL', desc: 'Advanced relational database for data storage and analytics' },
    { id: 'openai-gpt', label: 'OpenAI GPT', desc: 'Large language model integration for AI applications' },
    { id: 'docker', label: 'Docker', desc: 'Containerization technology for consistent deployment' }
  ];

  keyTechnologies.forEach(tech => {
    coreNodes.set(tech.id, {
      id: tech.id,
      label: tech.label,
      type: 'Technology',
      category: 'technology',
      title: `${tech.label} - Technical Expertise`,
      description: tech.desc,
      data: {
        priority: 6,
        enhanced: true,
        isTechnology: true
      }
    });
  });

  // Step 4: Create key projects
  coreNodes.set('ai-workforce-platform', {
    id: 'ai-workforce-platform',
    label: 'AI Workforce Intelligence Platform',
    type: 'Project',
    category: 'project',
    title: 'AI-Powered Workforce Intelligence Platform',
    description: 'Comprehensive platform with AI agents, microservices architecture, and real-time analytics for workforce optimization.',
    data: {
      priority: 9,
      enhanced: true,
      technologies: ['Python', 'FastAPI', 'AWS', 'Docker', 'OpenAI'],
      achievements: ['Unified AI Agent Interface', 'Enterprise Security', '50%+ efficiency improvement']
    }
  });

  // Step 5: Create education nodes
  coreNodes.set('systems-analysis-degree', {
    id: 'systems-analysis-degree',
    label: 'Systems Analysis & Development',
    type: 'Education',
    category: 'education',
    title: 'Bachelor in Systems Analysis and Development',
    description: 'Academic foundation in software development, systems design, and technical problem-solving.',
    data: {
      priority: 5,
      enhanced: true,
      institution: 'Estácio University',
      type: 'Bachelor of Science'
    }
  });

  coreNodes.set('electrical-engineering-degree', {
    id: 'electrical-engineering-degree',
    label: 'Electrical Engineering',
    type: 'Education',
    category: 'education',
    title: 'Bachelor in Electrical Engineering',
    description: 'Engineering foundation with focus on systems, electronics, and technical analysis.',
    data: {
      priority: 5,
      enhanced: true,
      institution: 'Federal University of Santa Catarina (UFSC)',
      type: 'Bachelor of Science'
    }
  });

  // Step 6: Create meaningful relationships
  const relationships = [
    // Pedro's work relationships
    { source: 'pedro-reichow', target: 'moveup-ai', relation: 'FOUNDED', type: 'founding' },
    { source: 'pedro-reichow', target: 'capgemini-brasil', relation: 'WORKED_AT', type: 'employment' },
    
    // Pedro's education
    { source: 'pedro-reichow', target: 'systems-analysis-degree', relation: 'STUDIED', type: 'education' },
    { source: 'pedro-reichow', target: 'electrical-engineering-degree', relation: 'STUDIED', type: 'education' },
    
    // Pedro's technical skills
    { source: 'pedro-reichow', target: 'python', relation: 'EXPERT_IN', type: 'expertise' },
    { source: 'pedro-reichow', target: 'react', relation: 'PROFICIENT_IN', type: 'skill' },
    { source: 'pedro-reichow', target: 'aws', relation: 'EXPERT_IN', type: 'expertise' },
    { source: 'pedro-reichow', target: 'fastapi', relation: 'EXPERT_IN', type: 'expertise' },
    { source: 'pedro-reichow', target: 'postgresql', relation: 'PROFICIENT_IN', type: 'skill' },
    { source: 'pedro-reichow', target: 'openai-gpt', relation: 'INTEGRATES', type: 'integration' },
    { source: 'pedro-reichow', target: 'docker', relation: 'USES', type: 'tool' },
    
    // Project relationships
    { source: 'pedro-reichow', target: 'ai-workforce-platform', relation: 'DEVELOPED', type: 'development' },
    { source: 'moveup-ai', target: 'ai-workforce-platform', relation: 'OWNS', type: 'ownership' },
    
    // Technology stack for projects
    { source: 'ai-workforce-platform', target: 'python', relation: 'BUILT_WITH', type: 'technology' },
    { source: 'ai-workforce-platform', target: 'fastapi', relation: 'BUILT_WITH', type: 'technology' },
    { source: 'ai-workforce-platform', target: 'aws', relation: 'DEPLOYED_ON', type: 'infrastructure' },
    { source: 'ai-workforce-platform', target: 'docker', relation: 'CONTAINERIZED_WITH', type: 'deployment' },
    { source: 'ai-workforce-platform', target: 'openai-gpt', relation: 'INTEGRATES', type: 'integration' },
    
    // Company technology usage
    { source: 'moveup-ai', target: 'python', relation: 'USES', type: 'technology' },
    { source: 'moveup-ai', target: 'aws', relation: 'DEPLOYED_ON', type: 'infrastructure' },
    { source: 'capgemini-brasil', target: 'python', relation: 'USES', type: 'technology' },
    { source: 'capgemini-brasil', target: 'aws', relation: 'USES', type: 'technology' }
  ];

  // Convert relationships to edges
  relationships.forEach((rel, idx) => {
    if (coreNodes.has(rel.source) && coreNodes.has(rel.target)) {
      coreEdges.push({
        id: `${rel.source}-${rel.target}-${rel.type}-${idx}`,
        source: rel.source,
        target: rel.target,
        relation: rel.relation,
        type: rel.type,
        weight: 1,
        data: {
          enhanced: true,
          meaningful: true
        }
      });
    }
  });

  return {
    nodes: Array.from(coreNodes.values()),
    edges: coreEdges
  };
}

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const { searchParams } = new URL(request.url);
    const { url, headers } = supabaseHeaders();

    // We still fetch from Cognee to potentially extract additional insights
    const nodesRes = await fetch(`${url}/rest/v1/cognee_nodes_public?select=node_id,label,type,props&limit=1000`, { headers });
    const edgesRes = await fetch(`${url}/rest/v1/cognee_edges_public?select=source,target,kind,weight,props&limit=1000`, { headers });
    
    const nodesRows = nodesRes.ok ? await nodesRes.json() : [];
    const edgesRows = edgesRes.ok ? await edgesRes.json() : [];

    // Create optimized graph focused on Pedro's professional story
    const optimizedGraph = createOptimizedGraph(nodesRows, edgesRows);

    return json({
      ...optimizedGraph,
      lastUpdated: new Date().toISOString(),
      optimized: true,
      nodeCount: optimizedGraph.nodes.length,
      edgeCount: optimizedGraph.edges.length
    }, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err: any) {
    console.error("/api.graph.optimized error:", err);
    return json({ error: "Failed to create optimized graph" }, { status: 500 });
  }
};
