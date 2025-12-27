import { json } from "@remix-run/cloudflare";
import type { ActionFunction } from "@remix-run/cloudflare";
import { cogneeGraphData } from "../data/cognee-graph";
import { generateContextualResponse } from "../data/knowledge-graph";

// Direct OpenAI integration for chat responses with Rich Graph context (309 nodes, 554 edges)

interface ChatRequest {
  message: string;
  language?: 'en' | 'pt';
  history?: Array<{ role: string; content: string }>;
}

// Use the rich cognee graph directly - no caching needed, it's embedded
function getRichGraphContext(): any {
  return processGraphForContext({
    nodes: cogneeGraphData.nodes,
    edges: cogneeGraphData.edges
  });
}

// Process the rich graph (309 nodes) into structured context for the LLM
function processGraphForContext(graphData: any): any {
  const nodes = graphData.nodes || [];
  const edges = graphData.edges || [];

  // Create a map of node IDs to labels for relationship context
  const nodeMap = new Map<string, string>();
  nodes.forEach((n: any) => nodeMap.set(n.id, n.label));

  // Group nodes by type for structured context
  const nodesByType: Record<string, any[]> = {};
  nodes.forEach((n: any) => {
    const type = n.type || 'Other';
    if (!nodesByType[type]) nodesByType[type] = [];
    nodesByType[type].push({ label: n.label, description: n.description, category: n.category });
  });

  // Extract key entities
  const companies = nodesByType['Company'] || [];
  const roles = nodesByType['Role'] || [];
  const technologies = nodesByType['Technology'] || [];
  const projects = nodesByType['Project'] || [];
  const concepts = nodesByType['Concept'] || [];
  const achievements = nodesByType['Achievement'] || [];
  const skillCategories = nodesByType['SkillCategory'] || [];
  const education = [...(nodesByType['Degree'] || []), ...(nodesByType['University'] || [])];
  const industries = nodesByType['Industry'] || [];
  const methodologies = nodesByType['Methodology'] || [];
  const features = nodesByType['Feature'] || [];

  // Build meaningful relationships with labels
  const meaningfulRelationships = edges
    .filter((e: any) => ['worked_at', 'works_at', 'held_role', 'has_expertise', 'proficient_in', 'built', 'achieved', 'has_degree', 'uses'].includes(e.label))
    .slice(0, 100)
    .map((e: any) => ({
      subject: nodeMap.get(e.source) || e.source,
      relation: e.label,
      object: nodeMap.get(e.target) || e.target
    }));

  return {
    person: {
      name: "Pedro Reichow",
      title: "AI Platform Engineer",
      tagline: "RAG & Agentic Systems, Technology Entrepreneur",
      location: "Santa Catarina, Brazil",
      contact: "pedro_reichow@hotmail.com",
      linkedin: "linkedin.com/in/pedroreichow",
      portfolio: "pedroreichow.com.br"
    },
    companies: companies.map((c: any) => c.label + (c.description ? ` - ${c.description}` : '')),
    roles: roles.map((r: any) => r.label + (r.description ? ` (${r.description})` : '')),
    technologies: technologies.map((t: any) => t.label),
    skillCategories: skillCategories.map((s: any) => s.label),
    projects: projects.map((p: any) => p.label + (p.description ? ` - ${p.description}` : '')),
    achievements: achievements.map((a: any) => a.label + (a.description ? ` - ${a.description}` : '')),
    concepts: concepts.slice(0, 30).map((c: any) => c.label),
    industries: industries.map((i: any) => i.label),
    methodologies: methodologies.map((m: any) => m.label),
    features: features.slice(0, 15).map((f: any) => f.label),
    education: education.map((e: any) => e.label + (e.description ? ` - ${e.description}` : '')),
    keyRelationships: meaningfulRelationships,
    stats: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      companiesWorked: companies.length,
      technologiesKnown: technologies.length,
      projectsBuilt: projects.length
    }
  };
}

// Build the system prompt with rich graph context (309 nodes, 554 edges)
function buildSystemPrompt(language: string, ctx: any): string {
  const lang = language === 'pt' ? 'Portuguese (Brazil)' : 'English';

  return `You are Pedro Reichow's professional AI assistant. Help recruiters and collaborators learn about Pedro.

LANGUAGE: Reply in ${lang}.

=== PEDRO'S PROFILE ===
Name: ${ctx.person?.name || 'Pedro Reichow'}
Title: ${ctx.person?.title || 'AI Platform Engineer'}
Focus: ${ctx.person?.tagline || 'RAG & Agentic Systems'}
Location: ${ctx.person?.location || 'Brazil'}
Contact: ${ctx.person?.contact || 'pedro_reichow@hotmail.com'}
LinkedIn: ${ctx.person?.linkedin || 'linkedin.com/in/pedroreichow'}
Portfolio: ${ctx.person?.portfolio || 'pedroreichow.com.br'}

=== COMPANIES WORKED (${ctx.companies?.length || 0}) ===
${ctx.companies?.join('\n') || 'Various companies'}

=== ROLES HELD (${ctx.roles?.length || 0}) ===
${ctx.roles?.join('\n') || 'Various roles'}

=== TECHNOLOGIES (${ctx.technologies?.length || 0}) ===
${ctx.technologies?.join(', ') || 'Various technologies'}

=== SKILL CATEGORIES ===
${ctx.skillCategories?.join(', ') || 'Various skills'}

=== KEY ACHIEVEMENTS ===
${ctx.achievements?.join('\n') || 'Multiple achievements'}

=== PROJECTS BUILT (${ctx.projects?.length || 0}) ===
${ctx.projects?.slice(0, 10).join('\n') || 'Multiple projects'}

=== EDUCATION ===
${ctx.education?.join('\n') || 'Various degrees'}

=== INDUSTRIES ===
${ctx.industries?.join(', ') || 'Various industries'}

=== METHODOLOGIES ===
${ctx.methodologies?.join(', ') || 'Various methodologies'}

=== KEY RELATIONSHIPS ===
${ctx.keyRelationships?.slice(0, 20).map((r: any) => `${r.subject} ${r.relation} ${r.object}`).join('\n') || ''}

=== GRAPH STATS ===
Total entities: ${ctx.stats?.totalNodes || 0} nodes, ${ctx.stats?.totalEdges || 0} relationships
Companies: ${ctx.stats?.companiesWorked || 0} | Technologies: ${ctx.stats?.technologiesKnown || 0} | Projects: ${ctx.stats?.projectsBuilt || 0}

=== GUIDELINES ===
- Be friendly, professional, and enthusiastic about Pedro's qualifications
- Use the SPECIFIC information above to answer questions
- When asked about a company (e.g., CVS Health), find it in COMPANIES and ROLES
- When asked about technologies, use the TECHNOLOGIES list
- Highlight achievements and unique value
- If topic is outside scope, redirect professionally
- Keep responses concise but informative
- Encourage reaching out for opportunities`;
}

// Call OpenAI API with cognified graph context
async function callOpenAI(
  message: string,
  language: string,
  history: Array<{ role: string; content: string }> = [],
  graphContext: any,
  apiKey?: string
): Promise<string> {
  if (!apiKey) {
    console.warn('OpenAI API key not configured, using static fallback');
    return generateContextualResponse(message);
  }

  const systemPrompt = buildSystemPrompt(language, graphContext);

  // Build messages array with history (limit to last 10 for token management)
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10).map(h => ({
      role: h.role as 'user' | 'assistant',
      content: h.content
    })),
    { role: 'user', content: message }
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || generateContextualResponse(message);
}

export const action: ActionFunction = async ({ request, context }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  // Get OpenAI API key from Cloudflare environment
  const env = context?.env as Record<string, string> | undefined;
  const openaiApiKey = env?.OPENAI_API_KEY;

  // Parse the request body first so we can use it in fallback
  let message = '';
  let language = 'en';
  let history: Array<{ role: string; content: string }> = [];

  try {
    const body: ChatRequest = await request.json();
    message = body.message || '';
    language = body.language || 'en';
    history = body.history || [];
  } catch (parseError) {
    console.error('Error parsing request body:', parseError);
    return json({
      error: "Invalid request body"
    }, { status: 400 });
  }

  try {
    // Get the rich graph context (309 nodes, 554 edges) for AI responses
    const graphContext = getRichGraphContext();

    const responseText = await callOpenAI(message, language, history, graphContext, openaiApiKey);

    return json({
      message: responseText,
      sender: "assistant" as const,
      direction: "incoming" as const
    });

  } catch (error: any) {
    console.error('Error in chat endpoint:', error);

    // Fallback to static contextual response using the already-parsed message
    const fallbackResponse = generateContextualResponse(message);
    return json({
      message: fallbackResponse,
      sender: "assistant" as const,
      direction: "incoming" as const
    });
  }
};



