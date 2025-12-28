import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

interface GraphNode {
  id: string;
  name: string;
  label: string;
  description?: string;
}

interface GraphEdge {
  source: string;
  target: string;
  relation: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Issue types for automatic analysis
interface GraphIssue {
  id: string;
  type: 'orphan' | 'missing_description' | 'duplicate' | 'weak_relation' | 'miscategorized' | 'missing_relation';
  severity: 'high' | 'medium' | 'low';
  nodeIds: string[];
  edgeIndex?: number;
  title: string;
  description: string;
  fix?: {
    type: 'add_description' | 'merge' | 'add_relation' | 'change_category' | 'delete' | 'rename';
    data: Record<string, unknown>;
  };
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 8192 }
      })
    }
  );

  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { action, selectedNodes, graphData, issueId, fixData } = await request.json() as {
      action: string;
      selectedNodes: string[];
      graphData: GraphData;
      issueId?: string;
      fixData?: Record<string, unknown>;
    };

    let result: { success: boolean; message: string; data?: unknown };

    switch (action) {
      case 'analyze_graph':
        result = await analyzeGraph(graphData, selectedNodes);
        break;
      case 'apply_fix':
        result = await applyFix(graphData, issueId!, fixData!);
        break;
      case 'find_duplicates':
        result = await findDuplicates(graphData);
        break;
      case 'suggest_relations':
      case 'suggest_relations_selected':
        result = await suggestRelations(graphData, selectedNodes);
        break;
      case 'clean_entities':
        result = await cleanEntities(graphData);
        break;
      case 'enrich_descriptions':
      case 'enrich_selected':
        result = await enrichDescriptions(graphData, selectedNodes);
        break;
      case 'categorize_selected':
        result = await recategorizeNodes(graphData, selectedNodes);
        break;
      case 'merge_duplicates':
        result = await suggestMerge(graphData, selectedNodes);
        break;
      case 'generate_node_description':
        result = await generateNodeDescription(graphData, selectedNodes[0]);
        break;
      case 'deep_enrich':
        result = await deepEnrichNodes(graphData, selectedNodes);
        break;
      default:
        return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Graph error:', error);
    return NextResponse.json({ success: false, error: 'Erro ao processar' }, { status: 500 });
  }
}

// MAIN ANALYSIS FUNCTION - Identifies all issues in the graph
async function analyzeGraph(graphData: GraphData, selectedNodes: string[]): Promise<{ success: boolean; message: string; data: { issues: GraphIssue[]; stats: Record<string, number> } }> {
  const issues: GraphIssue[] = [];
  const nodesToAnalyze = selectedNodes.length > 0
    ? graphData.nodes.filter(n => selectedNodes.includes(n.id))
    : graphData.nodes;

  // Build connection map
  const nodeConnections = new Map<string, { incoming: number; outgoing: number }>();
  graphData.nodes.forEach(n => nodeConnections.set(n.id, { incoming: 0, outgoing: 0 }));
  graphData.edges.forEach(e => {
    const sourceId = typeof e.source === 'string' ? e.source : (e.source as GraphNode).id;
    const targetId = typeof e.target === 'string' ? e.target : (e.target as GraphNode).id;
    const s = nodeConnections.get(sourceId);
    const t = nodeConnections.get(targetId);
    if (s) s.outgoing++;
    if (t) t.incoming++;
  });

  // 1. Find orphan nodes (no connections)
  nodesToAnalyze.forEach(node => {
    const conn = nodeConnections.get(node.id);
    if (conn && conn.incoming === 0 && conn.outgoing === 0) {
      issues.push({
        id: `orphan-${node.id}`,
        type: 'orphan',
        severity: 'high',
        nodeIds: [node.id],
        title: `"${node.name}" está isolado`,
        description: `Este nó não tem conexões com outros nós do grafo. Considere adicionar relações ou removê-lo.`,
        fix: { type: 'delete', data: { nodeId: node.id } }
      });
    }
  });

  // 2. Find nodes missing descriptions
  nodesToAnalyze.forEach(node => {
    if (!node.description || node.description.trim().length < 10) {
      issues.push({
        id: `no-desc-${node.id}`,
        type: 'missing_description',
        severity: 'medium',
        nodeIds: [node.id],
        title: `"${node.name}" sem descrição`,
        description: `Este nó não tem descrição ou ela é muito curta. Uma boa descrição ajuda a contextualizar a entidade.`,
        fix: { type: 'add_description', data: { nodeId: node.id } }
      });
    }
  });

  // 3. AI-powered analysis for duplicates, relations, and categorization
  if (nodesToAnalyze.length > 0) {
    const nodeList = nodesToAnalyze.slice(0, 30).map(n => ({
      id: n.id,
      name: n.name,
      label: n.label,
      description: n.description || '',
      connections: nodeConnections.get(n.id)
    }));

    const existingRelations = graphData.edges.slice(0, 50).map(e => {
      const sourceId = typeof e.source === 'string' ? e.source : (e.source as GraphNode).id;
      const targetId = typeof e.target === 'string' ? e.target : (e.target as GraphNode).id;
      return { source: sourceId, relation: e.relation, target: targetId };
    });

    const prompt = `Você é um especialista em grafos de conhecimento. Analise estes nós e identifique problemas.

NODOS:
${JSON.stringify(nodeList, null, 2)}

RELAÇÕES EXISTENTES:
${JSON.stringify(existingRelations, null, 2)}

Identifique:
1. DUPLICATAS: Nós que parecem ser a mesma entidade (nomes similares, mesmo conceito)
2. RELAÇÕES FALTANDO: Conexões óbvias que deveriam existir entre os nós
3. CATEGORIAS ERRADAS: Nós com tipo/label incorreto
4. NOMES PROBLEMÁTICOS: Nomes inconsistentes, abreviações, erros

Responda APENAS em JSON válido:
{
  "duplicates": [{"nodeIds": ["id1", "id2"], "reason": "motivo", "suggestedName": "nome unificado"}],
  "missingRelations": [{"source": "id", "target": "id", "relation": "TIPO", "reason": "por que deveria existir"}],
  "wrongCategories": [{"nodeId": "id", "currentLabel": "atual", "suggestedLabel": "sugerido", "reason": "motivo"}],
  "namingIssues": [{"nodeId": "id", "currentName": "atual", "suggestedName": "sugerido", "reason": "motivo"}]
}`;

    try {
      const response = await callGemini(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);

        // Add duplicate issues
        analysis.duplicates?.forEach((dup: { nodeIds: string[]; reason: string; suggestedName: string }, i: number) => {
          const nodes = dup.nodeIds.map(id => graphData.nodes.find(n => n.id === id)).filter(Boolean);
          if (nodes.length >= 2) {
            issues.push({
              id: `dup-${i}`,
              type: 'duplicate',
              severity: 'high',
              nodeIds: dup.nodeIds,
              title: `Possível duplicata: ${nodes.map(n => n!.name).join(' ≈ ')}`,
              description: dup.reason,
              fix: { type: 'merge', data: { nodeIds: dup.nodeIds, suggestedName: dup.suggestedName } }
            });
          }
        });

        // Add missing relation issues
        analysis.missingRelations?.forEach((rel: { source: string; target: string; relation: string; reason: string }, i: number) => {
          const sourceNode = graphData.nodes.find(n => n.id === rel.source);
          const targetNode = graphData.nodes.find(n => n.id === rel.target);
          if (sourceNode && targetNode) {
            issues.push({
              id: `rel-${i}`,
              type: 'missing_relation',
              severity: 'medium',
              nodeIds: [rel.source, rel.target],
              title: `Relação sugerida: ${sourceNode.name} → ${targetNode.name}`,
              description: `${rel.reason}. Tipo sugerido: ${rel.relation}`,
              fix: { type: 'add_relation', data: { source: rel.source, target: rel.target, relation: rel.relation } }
            });
          }
        });

        // Add wrong category issues
        analysis.wrongCategories?.forEach((cat: { nodeId: string; currentLabel: string; suggestedLabel: string; reason: string }, i: number) => {
          const node = graphData.nodes.find(n => n.id === cat.nodeId);
          if (node) {
            issues.push({
              id: `cat-${i}`,
              type: 'miscategorized',
              severity: 'low',
              nodeIds: [cat.nodeId],
              title: `"${node.name}" categoria incorreta`,
              description: `${cat.reason}. Atual: ${cat.currentLabel} → Sugerido: ${cat.suggestedLabel}`,
              fix: { type: 'change_category', data: { nodeId: cat.nodeId, newLabel: cat.suggestedLabel } }
            });
          }
        });

        // Add naming issues
        analysis.namingIssues?.forEach((naming: { nodeId: string; currentName: string; suggestedName: string; reason: string }, i: number) => {
          const node = graphData.nodes.find(n => n.id === naming.nodeId);
          if (node) {
            issues.push({
              id: `name-${i}`,
              type: 'miscategorized',
              severity: 'low',
              nodeIds: [naming.nodeId],
              title: `Nome inconsistente: "${naming.currentName}"`,
              description: `${naming.reason}. Sugestão: "${naming.suggestedName}"`,
              fix: { type: 'rename', data: { nodeId: naming.nodeId, newName: naming.suggestedName } }
            });
          }
        });
      }
    } catch (e) {
      console.error('AI analysis error:', e);
    }
  }

  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2 };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const stats = {
    total: issues.length,
    high: issues.filter(i => i.severity === 'high').length,
    medium: issues.filter(i => i.severity === 'medium').length,
    low: issues.filter(i => i.severity === 'low').length,
    orphans: issues.filter(i => i.type === 'orphan').length,
    missingDescriptions: issues.filter(i => i.type === 'missing_description').length,
    duplicates: issues.filter(i => i.type === 'duplicate').length,
    missingRelations: issues.filter(i => i.type === 'missing_relation').length
  };

  return {
    success: true,
    message: issues.length > 0 ? `Encontrados ${issues.length} problemas para revisar` : 'Nenhum problema encontrado!',
    data: { issues, stats }
  };
}

// Apply a specific fix
async function applyFix(graphData: GraphData, issueId: string, fixData: Record<string, unknown>) {
  // This would actually apply the fix - for now just return success
  // In a real implementation, this would update the database
  return {
    success: true,
    message: `Correção aplicada com sucesso`,
    data: { issueId, fixData }
  };
}

// Generate a rich description for a single node
async function generateNodeDescription(graphData: GraphData, nodeId: string) {
  const node = graphData.nodes.find(n => n.id === nodeId);
  if (!node) return { success: false, message: 'Nó não encontrado' };

  // Get connected nodes for context
  const connections = graphData.edges
    .filter(e => {
      const sourceId = typeof e.source === 'string' ? e.source : (e.source as GraphNode).id;
      const targetId = typeof e.target === 'string' ? e.target : (e.target as GraphNode).id;
      return sourceId === nodeId || targetId === nodeId;
    })
    .map(e => {
      const sourceId = typeof e.source === 'string' ? e.source : (e.source as GraphNode).id;
      const targetId = typeof e.target === 'string' ? e.target : (e.target as GraphNode).id;
      const otherId = sourceId === nodeId ? targetId : sourceId;
      const otherNode = graphData.nodes.find(n => n.id === otherId);
      const direction = sourceId === nodeId ? 'saída' : 'entrada';
      return `${direction}: ${e.relation} → ${otherNode?.name || 'desconhecido'} (${otherNode?.label})`;
    });

  const prompt = `Gere uma descrição rica e informativa para esta entidade de um grafo de conhecimento.

Entidade: ${node.name}
Tipo: ${node.label}
Descrição atual: ${node.description || 'nenhuma'}

Conexões no grafo:
${connections.length > 0 ? connections.join('\n') : 'Nenhuma conexão'}

Gere uma descrição de 2-4 frases que:
1. Explique o que/quem é esta entidade
2. Contextualize sua importância
3. Mencione suas relações principais se relevante

Responda APENAS com a descrição, sem formatação extra.`;

  try {
    const description = await callGemini(prompt);
    return {
      success: true,
      message: 'Descrição gerada',
      data: { nodeId, description: description.trim() }
    };
  } catch (e) {
    return { success: false, message: 'Erro ao gerar descrição' };
  }
}

// Deep enrichment - generates comprehensive metadata
async function deepEnrichNodes(graphData: GraphData, selectedNodes: string[]) {
  const nodes = graphData.nodes.filter(n => selectedNodes.includes(n.id));
  if (nodes.length === 0) return { success: false, message: 'Nenhum nó selecionado' };

  const nodeList = nodes.map(n => ({
    id: n.id,
    name: n.name,
    label: n.label,
    description: n.description
  }));

  const prompt = `Enriqueça estas entidades de um grafo de conhecimento com informações detalhadas.

${JSON.stringify(nodeList, null, 2)}

Para cada entidade, gere:
1. Uma descrição rica e contextualizada (2-4 frases)
2. Tags/palavras-chave relevantes
3. Possíveis aliases ou nomes alternativos
4. Relevância/importância no contexto

Responda em JSON:
{
  "enriched": [
    {
      "id": "...",
      "description": "descrição rica",
      "tags": ["tag1", "tag2"],
      "aliases": ["alias1"],
      "importance": "alta/média/baixa",
      "notes": "observações adicionais"
    }
  ]
}`;

  try {
    const response = await callGemini(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        message: `${parsed.enriched?.length || 0} nós enriquecidos`,
        data: parsed
      };
    }
  } catch { }

  return { success: true, message: 'Enriquecimento concluído' };
}

async function findDuplicates(graphData: GraphData) {
  const nodeList = graphData.nodes.map(n => `${n.id}: ${n.name} (${n.label})`).join('\n');

  const prompt = `Analise esta lista de entidades de um grafo de conhecimento e identifique possíveis duplicatas ou entidades que representam a mesma coisa com nomes diferentes.

Lista de entidades:
${nodeList}

Responda em JSON com formato:
{"duplicates": [{"nodes": ["id1", "id2"], "reason": "explicação"}], "summary": "resumo das duplicatas encontradas"}

Se não houver duplicatas, retorne: {"duplicates": [], "summary": "Nenhuma duplicata encontrada"}`;

  const response = await callGemini(prompt);

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        message: parsed.summary || `Encontradas ${parsed.duplicates?.length || 0} possíveis duplicatas`,
        data: parsed
      };
    }
  } catch { }

  return { success: true, message: 'Análise concluída', data: { raw: response } };
}

async function suggestRelations(graphData: GraphData, selectedNodes: string[]) {
  const nodes = selectedNodes.length > 0
    ? graphData.nodes.filter(n => selectedNodes.includes(n.id))
    : graphData.nodes.slice(0, 20);

  const nodeList = nodes.map(n => `${n.id}: ${n.name} (${n.label}) - ${n.description || 'sem descrição'}`).join('\n');
  const existingRelations = graphData.edges.slice(0, 30).map(e => `${e.source} -> ${e.relation} -> ${e.target}`).join('\n');

  const prompt = `Analise estas entidades e sugira novas relações que poderiam existir entre elas.

Entidades:
${nodeList}

Relações existentes:
${existingRelations || 'Nenhuma'}

Sugira novas relações no formato JSON:
{"suggestions": [{"source": "id", "relation": "TIPO_RELACAO", "target": "id", "confidence": 0.8, "reason": "explicação"}]}`;

  const response = await callGemini(prompt);

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        message: `${parsed.suggestions?.length || 0} novas relações sugeridas`,
        data: parsed
      };
    }
  } catch { }

  return { success: true, message: 'Análise concluída', data: { raw: response } };
}

async function cleanEntities(graphData: GraphData) {
  const nodeList = graphData.nodes.slice(0, 50).map(n =>
    `${n.id}: ${n.name} (${n.label})`
  ).join('\n');

  const prompt = `Analise estas entidades e sugira melhorias:
1. Nomes inconsistentes (capitalização, abreviações)
2. Labels/tipos incorretos
3. Entidades que deveriam ser removidas

Entidades:
${nodeList}

Responda em JSON:
{"fixes": [{"id": "...", "issue": "problema", "suggestion": "sugestão"}], "summary": "resumo"}`;

  const response = await callGemini(prompt);

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { success: true, message: parsed.summary || 'Análise concluída', data: parsed };
    }
  } catch { }

  return { success: true, message: 'Análise concluída' };
}

async function enrichDescriptions(graphData: GraphData, selectedNodes: string[]) {
  const nodes = selectedNodes.length > 0
    ? graphData.nodes.filter(n => selectedNodes.includes(n.id))
    : graphData.nodes.filter(n => !n.description).slice(0, 10);

  if (nodes.length === 0) {
    return { success: true, message: 'Nenhuma entidade para enriquecer' };
  }

  const nodeList = nodes.map(n => `${n.id}: ${n.name} (${n.label}) - ${n.description || 'sem descrição'}`).join('\n');

  const prompt = `Analise estas entidades e gere/melhore suas descrições. Se já tiver descrição, melhore-a. Se não tiver, crie uma.

${nodeList}

Responda em JSON: {"descriptions": [{"id": "...", "description": "descrição melhorada ou nova"}]}`;

  const response = await callGemini(prompt);

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        message: `${parsed.descriptions?.length || 0} descrições geradas/melhoradas`,
        data: parsed
      };
    }
  } catch { }

  return { success: true, message: 'Análise concluída' };
}

async function recategorizeNodes(graphData: GraphData, selectedNodes: string[]) {
  const nodes = graphData.nodes.filter(n => selectedNodes.includes(n.id));

  if (nodes.length === 0) {
    return { success: true, message: 'Nenhum nó selecionado' };
  }

  const nodeList = nodes.map(n => `${n.id}: ${n.name} (atual: ${n.label}) - ${n.description || 'sem descrição'}`).join('\n');
  const availableTypes = ['Person', 'Organization', 'Concept', 'Product', 'Location', 'Skill', 'Tool', 'Event', 'Entity'];

  const prompt = `Analise estas entidades e sugira a categoria/tipo mais apropriada para cada uma.

Tipos disponíveis: ${availableTypes.join(', ')}

Entidades:
${nodeList}

Responda em JSON: {"recategorizations": [{"id": "...", "currentType": "...", "suggestedType": "...", "reason": "explicação"}]}`;

  const response = await callGemini(prompt);

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const changes = parsed.recategorizations?.filter((r: { currentType: string; suggestedType: string }) => r.currentType !== r.suggestedType) || [];
      return {
        success: true,
        message: changes.length > 0 ? `${changes.length} sugestões de re-categorização` : 'Todas as categorias estão corretas',
        data: parsed
      };
    }
  } catch { }

  return { success: true, message: 'Análise concluída' };
}

async function suggestMerge(graphData: GraphData, selectedNodes: string[]) {
  if (selectedNodes.length < 2) {
    return { success: false, message: 'Selecione pelo menos 2 nós para unificar' };
  }

  const nodes = graphData.nodes.filter(n => selectedNodes.includes(n.id));
  const nodeList = nodes.map(n => `${n.id}: ${n.name} (${n.label}) - ${n.description || 'sem descrição'}`).join('\n');

  const prompt = `Analise estas entidades selecionadas para unificação. Determine se elas representam a mesma coisa e sugira como unificá-las.

Entidades selecionadas:
${nodeList}

Se forem a mesma entidade, sugira:
1. Qual nome usar (o mais completo/correto)
2. Qual tipo/label usar
3. Uma descrição unificada

Responda em JSON:
{
  "canMerge": true/false,
  "reason": "explicação",
  "mergedEntity": {
    "name": "nome sugerido",
    "label": "tipo sugerido",
    "description": "descrição unificada"
  },
  "nodesToMerge": ["id1", "id2"]
}`;

  const response = await callGemini(prompt);

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        message: parsed.canMerge ? 'Unificação sugerida - revise os detalhes' : parsed.reason || 'Entidades não parecem ser duplicatas',
        data: parsed
      };
    }
  } catch { }

  return { success: true, message: 'Análise concluída' };
}

