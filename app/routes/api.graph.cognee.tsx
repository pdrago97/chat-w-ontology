import 'dotenv/config';
import { json, type LoaderFunction } from "@remix-run/node";

// Returns the Cognee refined graph straight from Supabase tables
// Tables:
//  - public.cognee_nodes_public(node_id, label, type, props)
//  - public.cognee_edges_public(source, target, kind, weight, props)

function supabaseHeaders() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}` } } as const;
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

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, Math.min(5000, Number(searchParams.get("limit") || 2000)));

    const { url, headers } = supabaseHeaders();

    const nodesRes = await fetch(`${url}/rest/v1/cognee_nodes_public?select=node_id,label,type,props&limit=${limit}`, { headers });
    if (!nodesRes.ok) {
      const text = await nodesRes.text();
      return json({ error: `Supabase nodes error ${nodesRes.status}: ${text}` }, { status: 502 });
    }
    const nodesRows = await nodesRes.json();

    const edgesRes = await fetch(`${url}/rest/v1/cognee_edges_public?select=source,target,kind,weight,props&limit=${limit}`, { headers });
    if (!edgesRes.ok) {
      const text = await edgesRes.text();
      return json({ error: `Supabase edges error ${edgesRes.status}: ${text}` }, { status: 502 });
    }
    const edgesRows = await edgesRes.json();

    // Enhanced processing to improve content quality and reduce duplicates
    const nodeMap = new Map();
    const processedNodes: any[] = [];

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
    return json({ error: "Failed to fetch Cognee graph from Supabase" }, { status: 500 });
  }
};

