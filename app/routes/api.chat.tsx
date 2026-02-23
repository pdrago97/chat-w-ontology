import { json } from "@remix-run/cloudflare";
import type { ActionFunction } from "@remix-run/cloudflare";
import { generateContextualResponse, knowledgeGraphData } from "../data/knowledge-graph";

// Direct OpenAI integration for chat responses with Cognified Graph context

interface ChatRequest {
  message: string;
  language?: 'en' | 'pt';
  history?: Array<{ role: string; content: string }>;
}

// Cache for the cognified graph data
let cachedCognifiedGraph: any = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Fetch the cognified graph data for rich context (Cloudflare compatible)
async function getCognifiedGraphContext(env?: Record<string, string>): Promise<any> {
  const now = Date.now();

  // Return cached data if still valid
  if (cachedCognifiedGraph && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedCognifiedGraph;
  }

  try {
    // Use embedded knowledge graph data (Cloudflare compatible)
    const graphData = { nodes: knowledgeGraphData.nodes, skills: knowledgeGraphData.skills, edges: [] };

    // Process the graph to extract rich context
    const context = processGraphForContext(graphData);
    cachedCognifiedGraph = context;
    cacheTimestamp = now;
    return context;
  } catch (error) {
    console.error("Error loading cognified graph:", error);
    return null;
  }
}

// Process graph data into a rich context format for the LLM
function processGraphForContext(graphData: any): any {
  const nodes = graphData.nodes || [];
  const edges = graphData.edges || [];

  // Extract person info
  const person = nodes.find((n: any) => n.type === 'Person' || n.id === 'Pedro Reichow');

  // Extract experiences
  const experiences = nodes.filter((n: any) => n.type === 'Experience');

  // Extract education
  const education = nodes.filter((n: any) => n.type === 'Education');

  // Extract skills
  const skills = nodes.filter((n: any) => n.type === 'Skills');

  // Extract projects
  const projects = nodes.filter((n: any) => n.type === 'Project');

  // Extract technologies from all nodes
  const technologies = new Set<string>();
  nodes.forEach((n: any) => {
    if (n.technologies) {
      n.technologies.forEach((t: string) => technologies.add(t));
    }
  });

  // Extract concepts and relationships
  const relationships = edges.map((e: any) => ({
    from: e.source,
    to: e.target,
    type: e.relation || 'RELATED_TO'
  }));

  return {
    person,
    experiences: experiences.map((e: any) => ({
      company: e.id,
      title: e.title,
      years: e.years,
      duration: e.duration,
      location: e.location,
      description: e.description,
      responsibilities: e.responsibilities,
      achievements: e.achievements,
      technologies: e.technologies
    })),
    education: education.map((e: any) => ({
      institution: e.id,
      degree: e.degree,
      field: e.field,
      years: e.years,
      description: e.description
    })),
    skills: skills.map((s: any) => ({
      category: s.category || s.id,
      items: s.items,
      proficiency: s.proficiency
    })),
    projects: projects.map((p: any) => ({
      name: p.id,
      title: p.title,
      description: p.description,
      technologies: p.technologies,
      impact: p.impact
    })),
    allTechnologies: Array.from(technologies),
    relationships: relationships.slice(0, 50) // Limit to avoid token overflow
  };
}

// Build the system prompt with cognified graph context
function buildSystemPrompt(language: string, graphContext: any): string {
  const contextJson = graphContext ? JSON.stringify(graphContext, null, 2) : 'No context available';

  return `You are Pedro Reichow's professional AI assistant. You help recruiters and potential collaborators learn about Pedro's background, skills, and experience.

IMPORTANT: Reply in ${language === 'pt' ? 'Portuguese (Brazil)' : 'English'}.

Here is Pedro's professional information from his cognified knowledge graph:
${contextJson}

Guidelines:
- Be friendly, professional, and enthusiastic about Pedro's qualifications
- Only discuss Pedro's professional background, skills, projects, and experience
- If asked about topics outside Pedro's professional scope, politely redirect to professional topics
- Highlight Pedro's achievements and unique value proposition
- Use the relationships in the graph to provide connected insights
- Mention specific technologies and their usage context when relevant
- Encourage the user to reach out to Pedro for opportunities
- Keep responses concise but informative`;
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
    return generateContextualResponse(message, language);
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
  return data.choices?.[0]?.message?.content || generateContextualResponse(message, language);
}

export const action: ActionFunction = async ({ request, context }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  // Get OpenAI API key from Cloudflare environment or process.env
  const env = context?.env as Record<string, string> | undefined;
  const openaiApiKey = env?.OPENAI_API_KEY || (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined);

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
    // Fetch the cognified graph context for rich AI responses
    const graphContext = await getCognifiedGraphContext(env);

    const responseText = await callOpenAI(message, language, history, graphContext, openaiApiKey);

    return json({
      message: responseText,
      sender: "assistant" as const,
      direction: "incoming" as const
    });

  } catch (error: any) {
    console.error('Error in chat endpoint:', error);

    // Fallback to static contextual response using the already-parsed message
    const fallbackResponse = generateContextualResponse(message, language);
    return json({
      message: fallbackResponse,
      sender: "assistant" as const,
      direction: "incoming" as const
    });
  }
};



