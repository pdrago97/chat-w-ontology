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

// Transform technical metadata into meaningful professional insights
function processNodeForProfessionalContext(label: string, type: string, props: any) {
  const lowerLabel = label.toLowerCase();
  const lowerType = type.toLowerCase();
  const content = String(props?.text || props?.content || props?.data || '').toLowerCase();
  const allText = `${lowerLabel} ${lowerType} ${content}`;

  // Identify Pedro as the main person
  if (lowerLabel.includes('pedro') || allText.includes('pedro reichow')) {
    return {
      label: 'Pedro Reichow',
      type: 'Person',
      title: 'Senior AI Engineer & Data Specialist',
      description: 'Experienced AI engineer and entrepreneur based in Santa Catarina, Brazil',
      category: 'person',
      enrichedData: { isPrimaryPerson: true }
    };
  }

  // Identify companies and organizations
  if (allText.includes('moveup') || allText.includes('capgemini') || allText.includes('company') || allText.includes('organization')) {
    const companyName = extractCompanyName(allText, label);
    return {
      label: companyName,
      type: 'Company',
      title: companyName,
      description: `Professional experience at ${companyName}`,
      category: 'company',
      enrichedData: { isCompany: true }
    };
  }

  // Identify skills and technologies
  if (allText.includes('python') || allText.includes('react') || allText.includes('aws') ||
      allText.includes('skill') || allText.includes('technology') || allText.includes('framework')) {
    const skillName = extractSkillName(allText, label);
    return {
      label: skillName,
      type: 'Technology',
      title: skillName,
      description: `Technical skill: ${skillName}`,
      category: 'technology',
      enrichedData: { isTechnology: true }
    };
  }

  // Identify projects and achievements
  if (allText.includes('project') || allText.includes('built') || allText.includes('developed') ||
      allText.includes('created') || allText.includes('achievement')) {
    const projectName = extractProjectName(allText, label);
    return {
      label: projectName,
      type: 'Project',
      title: projectName,
      description: `Professional project: ${projectName}`,
      category: 'project',
      enrichedData: { isProject: true }
    };
  }

  // Identify education and certifications
  if (allText.includes('university') || allText.includes('degree') || allText.includes('education') ||
      allText.includes('certification') || allText.includes('course')) {
    const educationName = extractEducationName(allText, label);
    return {
      label: educationName,
      type: 'Education',
      title: educationName,
      description: `Educational background: ${educationName}`,
      category: 'education',
      enrichedData: { isEducation: true }
    };
  }

  // Identify professional roles and experiences
  if (allText.includes('engineer') || allText.includes('developer') || allText.includes('consultant') ||
      allText.includes('role') || allText.includes('position') || allText.includes('experience')) {
    const roleName = extractRoleName(allText, label);
    return {
      label: roleName,
      type: 'Role',
      title: roleName,
      description: `Professional role: ${roleName}`,
      category: 'experience',
      enrichedData: { isRole: true }
    };
  }

  // Default processing for unrecognized content
  const cleanLabel = cleanupLabel(label);
  return {
    label: cleanLabel,
    type: 'Concept',
    title: cleanLabel,
    description: `Professional concept: ${cleanLabel}`,
    category: 'concept',
    enrichedData: { isGeneric: true }
  };
}

// Helper functions for extracting meaningful names
function extractCompanyName(text: string, fallback: string): string {
  if (text.includes('moveup')) return 'MoveUp AI';
  if (text.includes('capgemini')) return 'Capgemini Brasil';
  if (text.includes('company') || text.includes('organization')) {
    return fallback.replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'Company';
  }
  return cleanupLabel(fallback);
}

function extractSkillName(text: string, fallback: string): string {
  const skills = ['Python', 'React', 'AWS', 'Docker', 'PostgreSQL', 'FastAPI', 'Node.js', 'TypeScript'];
  for (const skill of skills) {
    if (text.includes(skill.toLowerCase())) return skill;
  }
  return cleanupLabel(fallback);
}

function extractProjectName(text: string, fallback: string): string {
  if (text.includes('ai') || text.includes('artificial intelligence')) return 'AI Project';
  if (text.includes('data') || text.includes('pipeline')) return 'Data Pipeline';
  if (text.includes('web') || text.includes('application')) return 'Web Application';
  return cleanupLabel(fallback);
}

function extractEducationName(text: string, fallback: string): string {
  if (text.includes('systems analysis')) return 'Systems Analysis and Development';
  if (text.includes('electrical engineering')) return 'Electrical Engineering';
  if (text.includes('university')) return 'University Education';
  return cleanupLabel(fallback);
}

function extractRoleName(text: string, fallback: string): string {
  if (text.includes('senior') && text.includes('engineer')) return 'Senior AI Engineer';
  if (text.includes('data') && text.includes('engineer')) return 'Data Engineer';
  if (text.includes('consultant')) return 'Solutions Consultant';
  if (text.includes('founder')) return 'Founding Engineer';
  return cleanupLabel(fallback);
}

function cleanupLabel(label: string): string {
  return label
    .replace(/[^a-zA-Z0-9\s\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ') || 'Unknown';
}

// Process relationships for professional context
function processRelationForProfessionalContext(kind: string, props: any) {
  const lowerKind = kind.toLowerCase();
  const content = String(props?.description || props?.text || '').toLowerCase();
  const allText = `${lowerKind} ${content}`;

  if (allText.includes('work') || allText.includes('employ') || allText.includes('job')) {
    return {
      label: 'WORKED_AT',
      description: 'Professional employment relationship'
    };
  }

  if (allText.includes('skill') || allText.includes('use') || allText.includes('technology')) {
    return {
      label: 'USES_TECHNOLOGY',
      description: 'Technical skill or tool usage'
    };
  }

  if (allText.includes('project') || allText.includes('built') || allText.includes('develop')) {
    return {
      label: 'DEVELOPED',
      description: 'Project development relationship'
    };
  }

  if (allText.includes('education') || allText.includes('study') || allText.includes('learn')) {
    return {
      label: 'STUDIED',
      description: 'Educational relationship'
    };
  }

  if (allText.includes('lead') || allText.includes('manage') || allText.includes('responsible')) {
    return {
      label: 'LEADS',
      description: 'Leadership or management relationship'
    };
  }

  return {
    label: cleanupLabel(kind) || 'RELATED_TO',
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

    // Enhanced processing to create meaningful professional insights
    const nodes = nodesRows.map((n: any) => {
      const rawLabel = String(n.label || n.node_id);
      const rawType = String(n.type || 'Node');
      const props = n.props || {};

      // Transform technical metadata into professional insights
      const processedNode = processNodeForProfessionalContext(rawLabel, rawType, props);

      return {
        id: String(n.node_id),
        label: processedNode.label,
        type: processedNode.type,
        title: processedNode.title,
        description: processedNode.description,
        category: processedNode.category,
        data: {
          ...props,
          originalLabel: rawLabel,
          originalType: rawType,
          processed: true,
          ...processedNode.enrichedData
        }
      };
    });

    const edges = edgesRows.map((e: any, idx: number) => {
      const rawKind = String(e.kind || '');
      const processedRelation = processRelationForProfessionalContext(rawKind, e.props || {});

      return {
        id: `${e.source}-${e.target}-${e.kind}-${idx}`,
        source: String(e.source),
        target: String(e.target),
        relation: processedRelation.label,
        description: processedRelation.description,
        weight: typeof e.weight === 'number' ? e.weight : 1,
        data: {
          ...(e.props || {}),
          originalKind: rawKind,
          processed: true
        }
      };
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

