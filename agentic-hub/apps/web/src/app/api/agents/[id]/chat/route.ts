import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAgentById } from '@/lib/agents';
import { query } from '@/lib/db';

type RouteParams = { params: Promise<{ id: string }> };

interface GraphNode {
  id: string;
  type: string;
  label?: string;
  description?: string;
  properties?: Record<string, unknown>;
}

interface GraphEdge {
  source: string;
  target: string;
  relation: string;
}

// Get knowledge context for agent (documents + graphs)
async function getAgentKnowledgeContext(agentId: string, organizationId: string): Promise<string> {
  try {
    let context = '';

    // 1. Get knowledge items content
    const itemsResult = await query(
      `SELECT ki.title, ki.content, ki.content_type
       FROM agent_knowledge ak
       JOIN knowledge_items ki ON ak.knowledge_item_id = ki.id
       WHERE ak.agent_id = $1 AND ak.enabled = true
       LIMIT 10`,
      [agentId]
    );

    if (itemsResult.rows && itemsResult.rows.length > 0) {
      context += '## Documentos e Conteúdos:\n\n';
      for (const item of itemsResult.rows) {
        context += `### ${item.title}\n`;
        if (item.content && item.content.trim()) {
          const preview = item.content.substring(0, 1000);
          context += `${preview}${item.content.length > 1000 ? '...' : ''}\n\n`;
        }
      }
    }

    // 2. Get knowledge graphs for the organization (including any linked to agent)
    const graphsResult = await query(
      `SELECT kg.name, kg.graph
       FROM knowledge_graphs kg
       WHERE kg.organization_id = $1
         AND (kg.agent_id = $2 OR kg.agent_id IS NULL)
       ORDER BY kg.updated_at DESC
       LIMIT 5`,
      [organizationId, agentId]
    );

    if (graphsResult.rows && graphsResult.rows.length > 0) {
      context += '## Grafos de Conhecimento:\n\n';

      for (const graphRow of graphsResult.rows) {
        const graphData = typeof graphRow.graph === 'string'
          ? JSON.parse(graphRow.graph)
          : graphRow.graph;

        if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
          continue;
        }

        context += `### ${graphRow.name}\n\n`;

        // Format entities with their details
        const nodes: GraphNode[] = graphData.nodes || [];
        const edges: GraphEdge[] = graphData.edges || [];

        // Group nodes by type
        const nodesByType: Record<string, GraphNode[]> = {};
        for (const node of nodes) {
          const type = node.type || 'Outros';
          if (!nodesByType[type]) nodesByType[type] = [];
          nodesByType[type].push(node);
        }

        // Output entities grouped by type
        context += '**Entidades:**\n';
        for (const [type, typeNodes] of Object.entries(nodesByType)) {
          const nodeNames = typeNodes.slice(0, 15).map(n => {
            let entry = n.label || n.id;
            if (n.description) entry += ` (${n.description.substring(0, 100)})`;
            return entry;
          });
          context += `- **${type}:** ${nodeNames.join(', ')}`;
          if (typeNodes.length > 15) context += ` (+${typeNodes.length - 15} mais)`;
          context += '\n';
        }

        // Output relationships (key for understanding connections)
        if (edges.length > 0) {
          context += '\n**Relações entre entidades:**\n';
          const nodeMap = new Map(nodes.map(n => [n.id, n.label || n.id]));
          const relations = edges.slice(0, 30).map(e => {
            const source = nodeMap.get(e.source) || e.source;
            const target = nodeMap.get(e.target) || e.target;
            return `- ${source} → **${e.relation}** → ${target}`;
          });
          context += relations.join('\n');
          if (edges.length > 30) context += `\n(+${edges.length - 30} relações adicionais)`;
          context += '\n\n';
        }
      }
    }

    return context;
  } catch (error) {
    console.error('Error fetching agent knowledge:', error);
    return '';
  }
}

// Call Gemini API
async function callGemini(
  message: string,
  systemPrompt: string,
  knowledgeContext: string,
  history: { role: string; content: string }[] = []
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const fullSystemPrompt = `${systemPrompt}

${knowledgeContext ? `Você tem acesso à seguinte base de conhecimento. Use essas informações para responder perguntas de forma precisa e contextualizada:\n\n${knowledgeContext}` : ''}

Sempre responda de forma útil e baseada nas informações disponíveis. Se não souber algo, diga claramente.`;

  const contents = [
    { role: 'user', parts: [{ text: `[SYSTEM]: ${fullSystemPrompt}` }] },
    { role: 'model', parts: [{ text: 'Entendido. Vou seguir essas instruções e usar a base de conhecimento para responder.' }] },
    ...history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    })),
    { role: 'user', parts: [{ text: message }] }
  ];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Gemini API error:', error);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Não consegui gerar uma resposta.';
}

// POST /api/agents/:id/chat - Chat with agent
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const agent = await getAgentById(id, session.organizationId);

    if (!agent) {
      return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { message, history = [] } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
    }

    const persona = agent.persona || {};
    const instructions = persona.instructions || '';
    const tone = persona.tone || 'professional';
    const language = persona.language || 'pt-BR';

    // Build system prompt from agent persona
    const toneDescriptions: Record<string, string> = {
      professional: 'profissional e objetivo',
      friendly: 'amigável e acolhedor',
      formal: 'formal e respeitoso',
      casual: 'casual e descontraído'
    };

    const systemPrompt = `Você é ${agent.name}, um assistente de IA.
${agent.description ? `Descrição: ${agent.description}` : ''}
Tom: ${toneDescriptions[tone] || 'profissional'}
Idioma: ${language}
${instructions ? `Instruções específicas: ${instructions}` : ''}`;

    // Get knowledge context (documents + graphs)
    const knowledgeContext = await getAgentKnowledgeContext(agent.id, session.organizationId);

    // Check if Gemini API is configured
    if (!process.env.GEMINI_API_KEY) {
      // Fallback to mock response
      return NextResponse.json({
        response: `Olá! Sou ${agent.name}. Recebi sua mensagem: "${message.substring(0, 50)}..."

⚠️ **Modo de Teste**: A GEMINI_API_KEY não está configurada. Configure-a no .env.local para respostas reais.

${knowledgeContext ? `📚 Este agente tem ${knowledgeContext.split('###').length - 1} conhecimento(s) associado(s).` : '📭 Este agente não tem conhecimentos associados ainda.'}`
      });
    }

    // Call Gemini with knowledge context
    const response = await callGemini(message, systemPrompt, knowledgeContext, history);

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Error in agent chat:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

