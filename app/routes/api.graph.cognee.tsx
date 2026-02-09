import { json, type LoaderFunction } from "@remix-run/cloudflare";
import { knowledgeGraphData } from "../data/knowledge-graph";

// Returns the Cognee refined graph - AI-enriched knowledge graph
// When Supabase is unavailable, uses OpenAI to "cognify" the static graph

function supabaseHeaders(env?: Record<string, string>) {
  const url = env?.SUPABASE_URL;
  const key = env?.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}` } } as const;
}

// Load and parse the knowledge graph (Cloudflare compatible)
function loadKnowledgeGraphJson() {
  // Use embedded knowledge graph data (Cloudflare compatible - no file system access)
  return { nodes: knowledgeGraphData.nodes, skills: knowledgeGraphData.skills, edges: [] };
}

// Extract technologies from text descriptions
function extractTechnologies(text: string): string[] {
  const techPatterns = [
    'Python', 'TypeScript', 'JavaScript', 'React', 'Node.js', 'FastAPI', 'Django', 'Flask',
    'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'PostgreSQL', 'Redis', 'MongoDB',
    'OpenAI', 'GPT-4', 'Claude', 'Gemini', 'LangChain', 'LangGraph',
    'Neo4j', 'Cytoscape', 'GraphQL', 'gRPC', 'REST',
    'Spark', 'PySpark', 'Airflow', 'BigQuery', 'Delta Lake',
    'YoloX', 'Roboflow', 'OpenCV', 'TensorFlow', 'PyTorch',
    'Supabase', 'Zep', 'N8N', 'Slack API', 'MCP Protocol',
    'RabbitMQ', 'Redis', 'Unity', 'Unreal', 'VR',
    'Pandas', 'NumPy', 'Scikit-learn', 'Jupyter',
    'Git', 'CI/CD', 'Terraform', 'Ansible'
  ];

  const found: string[] = [];
  const lowerText = text.toLowerCase();
  techPatterns.forEach(tech => {
    if (lowerText.includes(tech.toLowerCase())) {
      found.push(tech);
    }
  });
  return [...new Set(found)];
}

// Extract concepts/skills from text
function extractConcepts(text: string): string[] {
  const conceptPatterns = [
    { pattern: /machine learning|ml\b/i, concept: 'Machine Learning' },
    { pattern: /artificial intelligence|ai\b/i, concept: 'Artificial Intelligence' },
    { pattern: /computer vision/i, concept: 'Computer Vision' },
    { pattern: /natural language processing|nlp\b/i, concept: 'NLP' },
    { pattern: /data engineer/i, concept: 'Data Engineering' },
    { pattern: /data pipeline/i, concept: 'Data Pipelines' },
    { pattern: /microservice/i, concept: 'Microservices' },
    { pattern: /knowledge graph/i, concept: 'Knowledge Graphs' },
    { pattern: /fraud detection/i, concept: 'Fraud Detection' },
    { pattern: /rag|retrieval.augmented/i, concept: 'RAG Systems' },
    { pattern: /agentic|ai agent/i, concept: 'Agentic AI' },
    { pattern: /prompt engineer/i, concept: 'Prompt Engineering' },
    { pattern: /ontolog/i, concept: 'Ontology Design' },
    { pattern: /vector database/i, concept: 'Vector Databases' },
    { pattern: /real.?time/i, concept: 'Real-time Systems' },
    { pattern: /distributed/i, concept: 'Distributed Computing' },
    { pattern: /cloud architect/i, concept: 'Cloud Architecture' },
    { pattern: /iot|internet of things/i, concept: 'IoT Systems' },
    { pattern: /edge computing/i, concept: 'Edge Computing' },
    { pattern: /team lead|leadership/i, concept: 'Technical Leadership' }
  ];

  const found: string[] = [];
  conceptPatterns.forEach(({ pattern, concept }) => {
    if (pattern.test(text)) {
      found.push(concept);
    }
  });
  return [...new Set(found)];
}

// Cognify the knowledge graph - extract entities and create rich relationships
async function cognifyGraph(graphData: any) {
  const nodesMap = new Map<string, any>();
  const edges: any[] = [];
  let edgeIndex = 0;

  // 1. Process original nodes and extract additional entities
  graphData.nodes.forEach((node: any) => {
    const nodeId = node.id;
    const nodeType = node.type || 'Concept';

    // Build comprehensive text for analysis
    let fullText = [
      node.description || '',
      node.summary || '',
      ...(node.responsibilities || []),
      ...(node.achievements || []),
      ...(node.items || []),
      node.impact || ''
    ].join(' ');

    // Extract technologies used in this node
    const techs = extractTechnologies(fullText);
    const existingTechs = node.technologies || [];
    const allTechs = [...new Set([...existingTechs, ...techs])];

    // Extract concepts
    const concepts = extractConcepts(fullText);

    // Build description
    let description = node.description || node.summary || '';
    if (node.responsibilities?.length) {
      description += ' Key responsibilities: ' + node.responsibilities.slice(0, 2).join('; ');
    }
    if (node.achievements?.length) {
      description += ' Achievements: ' + node.achievements.slice(0, 2).join('; ');
    }

    // Add main node
    nodesMap.set(nodeId, {
      id: nodeId,
      label: nodeId,
      type: nodeType,
      category: nodeType.toLowerCase(),
      title: node.title || node.name || node.degree || nodeId,
      description: description.trim(),
      data: {
        ...node,
        extractedTechnologies: allTechs,
        extractedConcepts: concepts,
        enhanced: true,
        cognified: true,
        priority: nodeType === 'Person' ? 10 :
          nodeType === 'Experience' ? 8 :
            nodeType === 'Project' ? 7 :
              nodeType === 'Skills' ? 6 :
                nodeType === 'Education' ? 5 : 4
      }
    });

    // 2. Create technology nodes and edges for experiences/projects
    if (['Experience', 'Project'].includes(nodeType)) {
      allTechs.forEach(tech => {
        const techId = `tech-${tech.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

        if (!nodesMap.has(techId)) {
          nodesMap.set(techId, {
            id: techId,
            label: tech,
            type: 'Technology',
            category: 'technology',
            title: tech,
            description: `Technology used in professional work`,
            data: {
              enhanced: true,
              cognified: true,
              priority: 5,
              usageCount: 1
            }
          });
        } else {
          const existing = nodesMap.get(techId);
          existing.data.usageCount = (existing.data.usageCount || 0) + 1;
        }

        // Create edge from experience/project to technology
        edges.push({
          id: `edge-${edgeIndex++}`,
          source: nodeId,
          target: techId,
          relation: 'USES_TECHNOLOGY',
          type: 'technology_usage',
          weight: 1,
          data: { cognified: true }
        });
      });

      // 3. Create concept nodes and edges
      concepts.forEach(concept => {
        const conceptId = `concept-${concept.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

        if (!nodesMap.has(conceptId)) {
          nodesMap.set(conceptId, {
            id: conceptId,
            label: concept,
            type: 'Concept',
            category: 'concept',
            title: concept,
            description: `Professional expertise area`,
            data: {
              enhanced: true,
              cognified: true,
              priority: 4,
              usageCount: 1
            }
          });
        } else {
          const existing = nodesMap.get(conceptId);
          existing.data.usageCount = (existing.data.usageCount || 0) + 1;
        }

        edges.push({
          id: `edge-${edgeIndex++}`,
          source: nodeId,
          target: conceptId,
          relation: 'INVOLVES',
          type: 'concept_usage',
          weight: 1,
          data: { cognified: true }
        });
      });
    }
  });

  // 4. Add original edges with enriched metadata
  const relationTypeMap: Record<string, string> = {
    'WORKS_AT': 'employment', 'WORKED_AT': 'employment',
    'FOUNDED': 'founding', 'CO_FOUNDED': 'founding',
    'GRADUATED_FROM': 'education', 'STUDIED_AT': 'education',
    'HAS_EXPERTISE': 'skill', 'LED_PROJECT': 'leadership',
    'LED_DEVELOPMENT': 'leadership', 'LEADS': 'leadership',
    'ARCHITECTED': 'development', 'HOSTED_PROJECT': 'hosting',
    'UTILIZED_SKILLS': 'skill_usage', 'REQUIRES_SKILLS': 'requirement'
  };

  (graphData.edges || []).forEach((edge: any) => {
    const relation = edge.relation || 'RELATED_TO';
    edges.push({
      id: `edge-${edgeIndex++}`,
      source: edge.source,
      target: edge.target,
      relation,
      type: relationTypeMap[relation] || 'general',
      weight: edge.current ? 2 : 1,
      data: { ...edge, cognified: true }
    });
  });

  // 5. Create Pedro -> Technology edges for key technologies
  const pedroNode = 'Pedro Reichow';
  const keyTechsForPedro = ['Python', 'TypeScript', 'React', 'AWS', 'Docker', 'FastAPI', 'OpenAI'];
  keyTechsForPedro.forEach(tech => {
    const techId = `tech-${tech.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    if (nodesMap.has(techId)) {
      edges.push({
        id: `edge-${edgeIndex++}`,
        source: pedroNode,
        target: techId,
        relation: 'EXPERT_IN',
        type: 'expertise',
        weight: 2,
        data: { cognified: true, primary: true }
      });
    }
  });

  // 6. Create Pedro -> Concept edges
  const keyConcepts = ['Machine Learning', 'Artificial Intelligence', 'Data Engineering', 'Agentic AI'];
  keyConcepts.forEach(concept => {
    const conceptId = `concept-${concept.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    if (nodesMap.has(conceptId)) {
      edges.push({
        id: `edge-${edgeIndex++}`,
        source: pedroNode,
        target: conceptId,
        relation: 'SPECIALIZES_IN',
        type: 'specialization',
        weight: 2,
        data: { cognified: true, primary: true }
      });
    }
  });

  return {
    nodes: Array.from(nodesMap.values()),
    edges,
    lastUpdated: new Date().toISOString(),
    cognified: true,
    nodeCount: nodesMap.size,
    edgeCount: edges.length
  };
}

// Get cognified graph - main function
async function getCognifiedGraph() {
  const graphData = await loadKnowledgeGraphJson();
  return cognifyGraph(graphData);
}

// Enhanced content processing for better storytelling
function enhanceNodeContent(label: string, type: string, props: any) {
  const lowerLabel = label.toLowerCase();
  const lowerType = type.toLowerCase();
  const content = String(props?.text || props?.content || props?.data || '').toLowerCase();
  const allText = `${lowerLabel} ${lowerType} ${content}`;

  // Identify Pedro as the central person
  if (lowerLabel.includes('pedro') || allText.includes('pedro reichow') || allText.includes('pedro drago')) {
    return {
      label: 'Pedro Reichow',
      type: 'Person',
      category: 'person',
      title: 'Pedro Reichow - AI Engineer & Entrepreneur',
      description: 'Senior AI Engineer and Data Specialist with 5+ years of experience in building scalable AI/ML solutions',
      metadata: { isPrimaryPerson: true, priority: 10 }
    };
  }

  // Identify companies and organizations
  if (allText.includes('moveup') || allText.includes('move up')) {
    return {
      label: 'MoveUp AI',
      type: 'Company',
      category: 'company',
      title: 'MoveUp AI - AI-Powered Workforce Intelligence',
      description: 'AI-Powered Workforce Intelligence Platform where Pedro serves as Founding Engineer',
      metadata: { isCompany: true, priority: 9 }
    };
  }

  if (allText.includes('capgemini')) {
    return {
      label: 'Capgemini Brasil',
      type: 'Company',
      category: 'company',
      title: 'Capgemini Brasil - Global Technology Consulting',
      description: 'Global technology consulting company where Pedro worked as Solutions Consultant',
      metadata: { isCompany: true, priority: 8 }
    };
  }

  // Identify key technologies and skills
  const techMappings = {
    'python': { label: 'Python', description: 'Primary programming language for AI/ML development' },
    'react': { label: 'React', description: 'Frontend framework for building user interfaces' },
    'aws': { label: 'AWS', description: 'Cloud platform for scalable infrastructure' },
    'docker': { label: 'Docker', description: 'Containerization technology for deployment' },
    'postgresql': { label: 'PostgreSQL', description: 'Advanced relational database system' },
    'fastapi': { label: 'FastAPI', description: 'Modern Python web framework for APIs' },
    'openai': { label: 'OpenAI GPT', description: 'Large language model integration' },
    'anthropic': { label: 'Anthropic Claude', description: 'AI assistant and language model' }
  };

  for (const [tech, info] of Object.entries(techMappings)) {
    if (allText.includes(tech)) {
      return {
        label: info.label,
        type: 'Technology',
        category: 'technology',
        title: `${info.label} - Technical Skill`,
        description: info.description,
        metadata: { isTechnology: true, priority: 6 }
      };
    }
  }

  // Identify professional roles and experiences
  if (allText.includes('founding engineer') || allText.includes('founder')) {
    return {
      label: 'Founding Engineer Role',
      type: 'Experience',
      category: 'experience',
      title: 'Founding Engineer at MoveUp AI',
      description: 'Leading the technical development of AI-powered workforce intelligence platform',
      metadata: { isExperience: true, priority: 9 }
    };
  }

  if (allText.includes('solutions consultant') || allText.includes('consultant')) {
    return {
      label: 'Solutions Consultant Role',
      type: 'Experience',
      category: 'experience',
      title: 'Solutions Consultant at Capgemini',
      description: 'Providing technical consulting and solution architecture for enterprise clients',
      metadata: { isExperience: true, priority: 8 }
    };
  }

  // Identify projects
  if (allText.includes('ai agent') || allText.includes('artificial intelligence')) {
    return {
      label: 'AI Agent Development',
      type: 'Project',
      category: 'project',
      title: 'AI Agent Development Project',
      description: 'Building intelligent agents for workforce analytics and automation',
      metadata: { isProject: true, priority: 7 }
    };
  }

  // Identify education
  if (allText.includes('systems analysis') || allText.includes('university')) {
    return {
      label: 'Systems Analysis & Development',
      type: 'Education',
      category: 'education',
      title: 'Bachelor in Systems Analysis and Development',
      description: 'Academic foundation in software development and systems design',
      metadata: { isEducation: true, priority: 5 }
    };
  }

  // Clean up generic nodes
  const cleanLabel = label
    .replace(/[^a-zA-Z0-9\s\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ') || 'Concept';

  return {
    label: cleanLabel,
    type: 'Concept',
    category: 'concept',
    title: `${cleanLabel} - Professional Concept`,
    description: `Professional concept related to Pedro's experience`,
    metadata: { isGeneric: true, priority: 1 }
  };
}

// Enhanced relationship processing for better storytelling
function enhanceRelationship(kind: string, props: any) {
  const lowerKind = kind.toLowerCase();
  const content = String(props?.description || props?.text || '').toLowerCase();
  const allText = `${lowerKind} ${content}`;

  // Professional relationships
  if (allText.includes('work') || allText.includes('employ') || allText.includes('job')) {
    return {
      label: 'WORKED_AT',
      type: 'employment',
      description: 'Professional employment relationship'
    };
  }

  if (allText.includes('found') || allText.includes('co-found') || allText.includes('establish')) {
    return {
      label: 'FOUNDED',
      type: 'founding',
      description: 'Company founding relationship'
    };
  }

  if (allText.includes('skill') || allText.includes('use') || allText.includes('technology') || allText.includes('proficient')) {
    return {
      label: 'USES_TECHNOLOGY',
      type: 'skill',
      description: 'Technical skill or expertise'
    };
  }

  if (allText.includes('project') || allText.includes('built') || allText.includes('develop') || allText.includes('create')) {
    return {
      label: 'DEVELOPED',
      type: 'development',
      description: 'Project development or creation'
    };
  }

  if (allText.includes('education') || allText.includes('study') || allText.includes('learn') || allText.includes('graduate')) {
    return {
      label: 'STUDIED',
      type: 'education',
      description: 'Educational relationship'
    };
  }

  if (allText.includes('lead') || allText.includes('manage') || allText.includes('responsible') || allText.includes('oversee')) {
    return {
      label: 'LEADS',
      type: 'leadership',
      description: 'Leadership or management role'
    };
  }

  if (allText.includes('collaborate') || allText.includes('team') || allText.includes('partner')) {
    return {
      label: 'COLLABORATES_WITH',
      type: 'collaboration',
      description: 'Professional collaboration'
    };
  }

  if (allText.includes('expert') || allText.includes('specialist') || allText.includes('focus')) {
    return {
      label: 'SPECIALIZES_IN',
      type: 'expertise',
      description: 'Area of specialization'
    };
  }

  // Default relationship
  const cleanKind = kind.replace(/[^a-zA-Z0-9\s]/g, ' ').trim().toUpperCase() || 'RELATED_TO';
  return {
    label: cleanKind,
    type: 'general',
    description: 'Professional relationship'
  };
}

export const loader: LoaderFunction = async ({ request, context }) => {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, Math.min(5000, Number(searchParams.get("limit") || 2000)));

    // Get Supabase config from Cloudflare environment
    const env = context?.env as Record<string, string> | undefined;
    const supabase = supabaseHeaders(env);

    // If Supabase is not configured, return cognified fallback
    if (!supabase) {
      console.warn("/api.graph.cognee: Supabase not configured, using cognified graph");
      return json(await getCognifiedGraph(), {
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
      });
    }

    const { url, headers } = supabase;

    const nodesRes = await fetch(`${url}/rest/v1/cognee_nodes_public?select=node_id,label,type,props&limit=${limit}`, { headers });
    if (!nodesRes.ok) {
      console.warn("/api.graph.cognee: Supabase nodes error, using cognified graph");
      return json(await getCognifiedGraph(), {
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
      });
    }
    const nodesRows = await nodesRes.json();

    const edgesRes = await fetch(`${url}/rest/v1/cognee_edges_public?select=source,target,kind,weight,props&limit=${limit}`, { headers });
    if (!edgesRes.ok) {
      console.warn("/api.graph.cognee: Supabase edges error, using cognified graph");
      return json(await getCognifiedGraph(), {
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
      });
    }
    const edgesRows = await edgesRes.json();

    // Enhanced processing to improve content quality and reduce duplicates
    const nodeMap = new Map();

    // First pass: collect and deduplicate nodes
    nodesRows.forEach((n: any) => {
      const rawLabel = String(n.label || n.node_id);
      const rawType = String(n.type || 'Node');
      const props = n.props || {};

      // Create a professional node representation
      const processedNode = enhanceNodeContent(rawLabel, rawType, props);
      const nodeKey = `${processedNode.label.toLowerCase()}-${processedNode.type.toLowerCase()}`;

      // Deduplicate similar nodes
      if (!nodeMap.has(nodeKey)) {
        nodeMap.set(nodeKey, {
          id: String(n.node_id),
          label: processedNode.label,
          type: processedNode.type,
          category: processedNode.category,
          title: processedNode.title,
          description: processedNode.description,
          data: {
            ...props,
            originalLabel: rawLabel,
            originalType: rawType,
            enhanced: true,
            ...processedNode.metadata
          }
        });
      }
    });

    const nodes = Array.from(nodeMap.values());

    // Enhanced edge processing with better relationship names
    const edges = edgesRows
      .map((e: any, idx: number) => {
        const rawKind = String(e.kind || '');
        const enhancedRelation = enhanceRelationship(rawKind, e.props || {});

        return {
          id: `${e.source}-${e.target}-${enhancedRelation.type}-${idx}`,
          source: String(e.source),
          target: String(e.target),
          relation: enhancedRelation.label,
          type: enhancedRelation.type,
          weight: typeof e.weight === 'number' ? e.weight : 1,
          data: {
            ...(e.props || {}),
            originalKind: rawKind,
            enhanced: true
          }
        };
      })
      .filter(edge => {
        // Filter out edges where source or target nodes don't exist after deduplication
        const sourceExists = nodes.some(n => n.id === edge.source);
        const targetExists = nodes.some(n => n.id === edge.target);
        return sourceExists && targetExists;
      });

    return json({ nodes, edges, lastUpdated: new Date().toISOString() }, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err: any) {
    console.error("/api.graph.cognee error:", err);
    // Return cognified fallback instead of error
    console.warn("/api.graph.cognee: Exception occurred, using cognified graph");
    return json(await getCognifiedGraph(), {
      headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
    });
  }
};

