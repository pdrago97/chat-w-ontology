'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ArrowLeft, Plus, RefreshCw, Search, Filter, Sparkles,
  Merge, Trash2, Edit3, X, Wand2, Link2, AlertCircle,
  ChevronDown, ChevronRight, Check, Loader2, GitBranch, Eye, Zap,
  MousePointer, MoreVertical, Copy, Unlink, Network,
  Brain, FileText, Tag, ArrowRight, Settings, Layers,
  EyeOff, Palette, Move3D, List, Grid3X3, ToggleLeft, ToggleRight,
  CheckSquare, Square, PanelLeftClose, PanelLeft, Save, RotateCcw,
  Grip, ArrowUpDown, ExternalLink, Maximize2, Split, ChevronsUpDown,
  type LucideIcon
} from 'lucide-react';

const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false });

interface GraphNode {
  id: string;
  name: string;
  label: string;
  description?: string;
  color: string;
  size?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  label: string;
  color?: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  node: GraphNode | null;
}

interface VisualSettings {
  showLabels: boolean;
  showEdgeLabels: boolean;
  colorEdges: boolean;
  nodeSize: 'small' | 'medium' | 'large';
  showArrows: boolean;
  curvature: boolean;
}

const NODE_TYPES = ['Person', 'Organization', 'Concept', 'Product', 'Location', 'Skill', 'Tool', 'Event', 'Entity'];
const NODE_COLORS: Record<string, string> = {
  Person: '#3b82f6', Organization: '#10b981', Concept: '#8b5cf6',
  Product: '#f59e0b', Location: '#ef4444', Skill: '#06b6d4',
  Tool: '#ec4899', Event: '#f97316', Entity: '#6b7280'
};

// Cores para tipos de relação
const EDGE_COLORS: Record<string, string> = {
  WORKS_AT: '#3b82f6',
  KNOWS: '#10b981',
  RELATED_TO: '#8b5cf6',
  PART_OF: '#f59e0b',
  LOCATED_IN: '#ef4444',
  HAS_SKILL: '#06b6d4',
  USES: '#ec4899',
  CREATED: '#f97316',
  MANAGES: '#14b8a6',
  BELONGS_TO: '#a855f7',
  default: '#64748b'
};

// Tooltip component
function Tooltip({ children, text, position = 'top' }: { children: React.ReactNode; text: string; position?: 'top' | 'bottom' | 'left' | 'right' }) {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };
  return (
    <div className="relative group">
      {children}
      <div className={`absolute ${positionClasses[position]} px-2 py-1 bg-slate-950 text-white text-xs rounded
        opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-slate-700`}>
        {text}
      </div>
    </div>
  );
}

// Toggle Switch component
function Toggle({ enabled, onChange, label }: { enabled: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className="flex items-center gap-2 text-xs text-slate-300 hover:text-white transition-colors w-full py-1"
    >
      {enabled ? <ToggleRight className="w-4 h-4 text-blue-400" /> : <ToggleLeft className="w-4 h-4 text-slate-500" />}
      <span className={enabled ? 'text-white' : 'text-slate-400'}>{label}</span>
    </button>
  );
}

export default function GraphExplorerPage() {
  const graphRef = useRef<unknown>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTypes, setFilterTypes] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [showAddNode, setShowAddNode] = useState(false);
  const [showEditNode, setShowEditNode] = useState(false);
  const [showAITools, setShowAITools] = useState(false);
  const [showAdvancedEdit, setShowAdvancedEdit] = useState(false);

  // Context Menu
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, node: null });

  // AI Processing
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  // Forms
  const [newNode, setNewNode] = useState({ nodeId: '', label: 'Entity', name: '', description: '' });
  const [editingNode, setEditingNode] = useState<GraphNode | null>(null);

  // Side Panel & Visual Settings
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [visualSettings, setVisualSettings] = useState<VisualSettings>({
    showLabels: true,
    showEdgeLabels: false,
    colorEdges: true,
    nodeSize: 'medium',
    showArrows: true,
    curvature: true,
  });

  // Advanced Editor State
  type EditorTab = 'nodes' | 'relations' | 'ai';
  const [editorTab, setEditorTab] = useState<EditorTab>('nodes');
  const [editorSearch, setEditorSearch] = useState('');
  const [editingNodeInline, setEditingNodeInline] = useState<string | null>(null);
  const [inlineEditData, setInlineEditData] = useState<{ name: string; label: string; description: string }>({ name: '', label: '', description: '' });
  const [pendingEdgeChanges, setPendingEdgeChanges] = useState<Map<string, { action: 'delete' | 'edit'; data?: Partial<GraphEdge> }>>(new Map());
  const [showNewEdgeForm, setShowNewEdgeForm] = useState(false);
  const [newEdge, setNewEdge] = useState({ source: '', target: '', relation: '' });
  const [editorExpandedNodes, setEditorExpandedNodes] = useState<Set<string>>(new Set());

  // AI Analysis State
  interface GraphIssue {
    id: string;
    type: 'orphan' | 'missing_description' | 'duplicate' | 'weak_relation' | 'miscategorized' | 'missing_relation';
    severity: 'high' | 'medium' | 'low';
    nodeIds: string[];
    title: string;
    description: string;
    fix?: { type: string; data: Record<string, unknown> };
  }
  const [analysisIssues, setAnalysisIssues] = useState<GraphIssue[]>([]);
  const [analysisStats, setAnalysisStats] = useState<Record<string, number>>({});
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());
  const [applyingFix, setApplyingFix] = useState<string | null>(null);
  const [generatingDescription, setGeneratingDescription] = useState<string | null>(null);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(prev => ({ ...prev, visible: false }));
    if (contextMenu.visible) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu.visible]);

  // Get edge color based on relation type
  const getEdgeColor = useCallback((relation: string) => {
    if (!visualSettings.colorEdges) return '#64748b';
    const upperRelation = relation.toUpperCase().replace(/\s+/g, '_');
    return EDGE_COLORS[upperRelation] || EDGE_COLORS.default;
  }, [visualSettings.colorEdges]);

  // Get node size based on settings and connections
  const getNodeSize = useCallback((nodeId: string) => {
    const baseSize = visualSettings.nodeSize === 'small' ? 4 : visualSettings.nodeSize === 'large' ? 10 : 6;
    const connections = graphData.edges.filter(e =>
      (typeof e.source === 'string' ? e.source : (e.source as GraphNode).id) === nodeId ||
      (typeof e.target === 'string' ? e.target : (e.target as GraphNode).id) === nodeId
    ).length;
    return baseSize + Math.min(connections * 0.5, 4);
  }, [graphData.edges, visualSettings.nodeSize]);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/graph');
      const data = await res.json();
      setGraphData({ nodes: data.nodes || [], edges: data.edges || [] });
    } catch (error) {
      console.error('Error fetching graph:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGraph(); }, [fetchGraph]);

  // Get selected nodes data
  const selectedNodesData = useMemo(() => {
    return graphData.nodes.filter(n => selectedNodes.has(n.id));
  }, [graphData.nodes, selectedNodes]);

  // Get relations between selected nodes
  const selectedRelations = useMemo(() => {
    return graphData.edges.filter(e =>
      selectedNodes.has(typeof e.source === 'string' ? e.source : (e.source as GraphNode).id) &&
      selectedNodes.has(typeof e.target === 'string' ? e.target : (e.target as GraphNode).id)
    );
  }, [graphData.edges, selectedNodes]);

  // Get all connections for selected nodes (for tree view)
  const getNodeConnections = useCallback((nodeId: string) => {
    return graphData.edges.filter(e => {
      const sourceId = typeof e.source === 'string' ? e.source : (e.source as GraphNode).id;
      const targetId = typeof e.target === 'string' ? e.target : (e.target as GraphNode).id;
      return sourceId === nodeId || targetId === nodeId;
    }).map(e => {
      const sourceId = typeof e.source === 'string' ? e.source : (e.source as GraphNode).id;
      const targetId = typeof e.target === 'string' ? e.target : (e.target as GraphNode).id;
      const connectedId = sourceId === nodeId ? targetId : sourceId;
      const connectedNode = graphData.nodes.find(n => n.id === connectedId);
      return {
        node: connectedNode,
        relation: e.label,
        direction: sourceId === nodeId ? 'outgoing' : 'incoming'
      };
    });
  }, [graphData]);

  // Filtered nodes based on search and type filters
  const filteredData = {
    nodes: graphData.nodes.filter(n => {
      const matchesSearch = !searchQuery ||
        n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.label.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterTypes.size === 0 || filterTypes.has(n.label);
      return matchesSearch && matchesFilter;
    }),
    edges: graphData.edges.filter(e => {
      const sourceVisible = graphData.nodes.find(n => n.id === e.source);
      const targetVisible = graphData.nodes.find(n => n.id === e.target);
      return sourceVisible && targetVisible;
    })
  };

  // Node type stats
  const typeStats = graphData.nodes.reduce((acc, n) => {
    acc[n.label] = (acc[n.label] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Group nodes by type for side panel
  const nodesByType = useMemo(() => {
    const grouped: Record<string, GraphNode[]> = {};
    graphData.nodes.forEach(node => {
      if (!grouped[node.label]) grouped[node.label] = [];
      grouped[node.label].push(node);
    });
    // Sort nodes within each type
    Object.keys(grouped).forEach(type => {
      grouped[type].sort((a, b) => a.name.localeCompare(b.name));
    });
    return grouped;
  }, [graphData.nodes]);

  // Edge type stats
  const edgeStats = useMemo(() => {
    return graphData.edges.reduce((acc, e) => {
      const rel = e.label || e.relation || 'UNKNOWN';
      acc[rel] = (acc[rel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [graphData.edges]);

  // Toggle type expansion in side panel
  const toggleTypeExpanded = (type: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(type)) newExpanded.delete(type);
    else newExpanded.add(type);
    setExpandedTypes(newExpanded);
  };

  // Toggle node expansion (show connections)
  const toggleNodeExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) newExpanded.delete(nodeId);
    else newExpanded.add(nodeId);
    setExpandedNodes(newExpanded);
  };

  // Select all nodes of a type
  const selectAllOfType = (type: string) => {
    const nodesOfType = nodesByType[type] || [];
    const newSelection = new Set(selectedNodes);
    const allSelected = nodesOfType.every(n => selectedNodes.has(n.id));
    if (allSelected) {
      nodesOfType.forEach(n => newSelection.delete(n.id));
    } else {
      nodesOfType.forEach(n => newSelection.add(n.id));
    }
    setSelectedNodes(newSelection);
  };

  // Toggle editor node expansion
  const toggleEditorNodeExpanded = (nodeId: string) => {
    const newExpanded = new Set(editorExpandedNodes);
    if (newExpanded.has(nodeId)) newExpanded.delete(nodeId);
    else newExpanded.add(nodeId);
    setEditorExpandedNodes(newExpanded);
  };

  // Start inline editing a node
  const startInlineEdit = (node: GraphNode) => {
    setEditingNodeInline(node.id);
    setInlineEditData({ name: node.name, label: node.label, description: node.description || '' });
  };

  // Save inline edit
  const saveInlineEdit = async (nodeId: string) => {
    try {
      const res = await fetch('/api/graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_node', nodeId, ...inlineEditData }),
      });
      if (res.ok) {
        fetchGraph();
        setEditingNodeInline(null);
      }
    } catch (error) {
      console.error('Error updating node:', error);
    }
  };

  // Cancel inline edit
  const cancelInlineEdit = () => {
    setEditingNodeInline(null);
    setInlineEditData({ name: '', label: '', description: '' });
  };

  // Get all edges for a node (in context of selected nodes)
  const getNodeEdgesInSelection = (nodeId: string) => {
    return graphData.edges.filter(e => {
      const sourceId = typeof e.source === 'string' ? e.source : (e.source as GraphNode).id;
      const targetId = typeof e.target === 'string' ? e.target : (e.target as GraphNode).id;
      return (sourceId === nodeId || targetId === nodeId) &&
        (selectedNodes.has(sourceId) || selectedNodes.has(targetId));
    });
  };

  // Filter selected nodes by search
  const filteredSelectedNodes = useMemo(() => {
    if (!editorSearch) return selectedNodesData;
    const search = editorSearch.toLowerCase();
    return selectedNodesData.filter(n =>
      n.name.toLowerCase().includes(search) ||
      n.label.toLowerCase().includes(search) ||
      (n.description?.toLowerCase().includes(search))
    );
  }, [selectedNodesData, editorSearch]);

  // Group filtered nodes by type for editor
  const editorNodesByType = useMemo(() => {
    const grouped: Record<string, GraphNode[]> = {};
    filteredSelectedNodes.forEach(node => {
      if (!grouped[node.label]) grouped[node.label] = [];
      grouped[node.label].push(node);
    });
    return grouped;
  }, [filteredSelectedNodes]);

  // Create a new edge
  const handleCreateEdge = async () => {
    if (!newEdge.source || !newEdge.target || !newEdge.relation) return;
    try {
      const res = await fetch('/api/graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_edge', ...newEdge }),
      });
      if (res.ok) {
        fetchGraph();
        setShowNewEdgeForm(false);
        setNewEdge({ source: '', target: '', relation: '' });
      }
    } catch (error) {
      console.error('Error creating edge:', error);
    }
  };

  // Delete an edge
  const handleDeleteEdge = async (edge: GraphEdge) => {
    const sourceId = typeof edge.source === 'string' ? edge.source : (edge.source as GraphNode).id;
    const targetId = typeof edge.target === 'string' ? edge.target : (edge.target as GraphNode).id;
    try {
      const res = await fetch('/api/graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_edge', source: sourceId, target: targetId, relation: edge.relation }),
      });
      if (res.ok) {
        fetchGraph();
      }
    } catch (error) {
      console.error('Error deleting edge:', error);
    }
  };

  async function handleAddNode(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_node', ...newNode }),
      });
      if (res.ok) {
        setNewNode({ nodeId: '', label: 'Entity', name: '', description: '' });
        setShowAddNode(false);
        fetchGraph();
      }
    } catch (error) {
      console.error('Error adding node:', error);
    }
  }

  async function handleDeleteNode(nodeId: string) {
    if (!confirm('Deletar este nó e todas as suas conexões?')) return;
    try {
      await fetch('/api/graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_node', nodeId }),
      });
      setSelectedNode(null);
      fetchGraph();
    } catch (error) {
      console.error('Error deleting node:', error);
    }
  }

  async function handleEditNode(e: React.FormEvent) {
    e.preventDefault();
    if (!editingNode) return;
    try {
      await fetch('/api/graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_node',
          nodeId: editingNode.id,
          name: editingNode.name,
          label: editingNode.label,
          description: editingNode.description
        }),
      });
      setShowEditNode(false);
      setEditingNode(null);
      fetchGraph();
    } catch (error) {
      console.error('Error updating node:', error);
    }
  }

  async function handleAIAction(action: string) {
    setAiProcessing(true);
    setAiResult(null);
    try {
      const res = await fetch('/api/graph/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          selectedNodes: Array.from(selectedNodes),
          graphData
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAiResult(data.message);
        fetchGraph();
      } else {
        setAiResult(`Erro: ${data.error}`);
      }
    } catch (error) {
      setAiResult('Erro ao processar');
    } finally {
      setAiProcessing(false);
    }
  }

  // Run AI analysis on graph
  async function runGraphAnalysis() {
    setAnalysisLoading(true);
    setAnalysisIssues([]);
    setAnalysisStats({});
    try {
      const res = await fetch('/api/graph/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_graph',
          selectedNodes: Array.from(selectedNodes),
          graphData
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAnalysisIssues(data.data.issues || []);
        setAnalysisStats(data.data.stats || {});
      }
    } catch (error) {
      console.error('Error analyzing graph:', error);
    } finally {
      setAnalysisLoading(false);
    }
  }

  // Generate description for a node
  async function generateNodeDescription(nodeId: string) {
    setGeneratingDescription(nodeId);
    try {
      const res = await fetch('/api/graph/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_node_description',
          selectedNodes: [nodeId],
          graphData
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.description) {
        // Update the node with the new description
        await fetch('/api/graph', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_node',
            nodeId,
            description: data.data.description
          }),
        });
        fetchGraph();
        // Remove from issues if it was a missing description issue
        setAnalysisIssues(prev => prev.filter(i => !(i.type === 'missing_description' && i.nodeIds.includes(nodeId))));
      }
    } catch (error) {
      console.error('Error generating description:', error);
    } finally {
      setGeneratingDescription(null);
    }
  }

  // Apply a fix from the analysis
  async function applyIssueFix(issue: GraphIssue) {
    if (!issue.fix) return;
    setApplyingFix(issue.id);

    try {
      switch (issue.fix.type) {
        case 'delete':
          await fetch('/api/graph', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete_node', nodeId: issue.fix.data.nodeId }),
          });
          break;
        case 'add_description':
          await generateNodeDescription(issue.nodeIds[0]);
          break;
        case 'add_relation':
          await fetch('/api/graph', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create_edge',
              source: issue.fix.data.source,
              target: issue.fix.data.target,
              relation: issue.fix.data.relation
            }),
          });
          break;
        case 'change_category':
          await fetch('/api/graph', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update_node',
              nodeId: issue.fix.data.nodeId,
              label: issue.fix.data.newLabel
            }),
          });
          break;
        case 'rename':
          await fetch('/api/graph', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update_node',
              nodeId: issue.fix.data.nodeId,
              name: issue.fix.data.newName
            }),
          });
          break;
      }

      fetchGraph();
      setAnalysisIssues(prev => prev.filter(i => i.id !== issue.id));
    } catch (error) {
      console.error('Error applying fix:', error);
    } finally {
      setApplyingFix(null);
    }
  }

  // Toggle issue expanded state
  function toggleIssueExpanded(issueId: string) {
    setExpandedIssues(prev => {
      const next = new Set(prev);
      if (next.has(issueId)) next.delete(issueId);
      else next.add(issueId);
      return next;
    });
  }

  function toggleNodeSelection(nodeId: string) {
    const newSelection = new Set(selectedNodes);
    if (newSelection.has(nodeId)) {
      newSelection.delete(nodeId);
    } else {
      newSelection.add(nodeId);
    }
    setSelectedNodes(newSelection);
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/knowledge" className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Explorador de Grafo</h1>
            <p className="text-slate-400 text-xs">{graphData.nodes.length} nós, {graphData.edges.length} conexões</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar nós..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Tooltip text="Painel de nós">
            <button onClick={() => setShowSidePanel(!showSidePanel)}
              className={`p-2 rounded-lg ${showSidePanel ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              {showSidePanel ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
            </button>
          </Tooltip>
          <Tooltip text="Configurações visuais">
            <button onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg ${showSettings ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <Settings className="w-5 h-5" />
            </button>
          </Tooltip>
          <Tooltip text="Filtrar por tipo">
            <button onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg ${showFilters ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <Filter className="w-5 h-5" />
            </button>
          </Tooltip>
          <Tooltip text="Ferramentas de IA">
            <button onClick={() => setShowAITools(!showAITools)}
              className={`p-2 rounded-lg ${showAITools ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <Sparkles className="w-5 h-5" />
            </button>
          </Tooltip>
          <Tooltip text="Recarregar grafo">
            <button onClick={fetchGraph} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </Tooltip>
          {selectedNodes.size > 0 && (
            <Tooltip text="Editar nós selecionados">
              <button onClick={() => setShowAdvancedEdit(true)}
                className="flex items-center gap-2 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm">
                <Edit3 className="w-4 h-4" /> Editar ({selectedNodes.size})
              </button>
            </Tooltip>
          )}
          <Tooltip text="Criar novo nó">
            <button onClick={() => setShowAddNode(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
              <Plus className="w-4 h-4" /> Nó
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Visual Settings Bar */}
      {showSettings && (
        <div className="flex-shrink-0 bg-cyan-900/20 border border-cyan-700/50 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-cyan-400" />
              <span className="text-cyan-300 text-sm font-medium">Configurações Visuais</span>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <Toggle
                enabled={visualSettings.showLabels}
                onChange={v => setVisualSettings(s => ({ ...s, showLabels: v }))}
                label="Rótulos"
              />
              <Toggle
                enabled={visualSettings.showEdgeLabels}
                onChange={v => setVisualSettings(s => ({ ...s, showEdgeLabels: v }))}
                label="Rótulos de Arestas"
              />
              <Toggle
                enabled={visualSettings.colorEdges}
                onChange={v => setVisualSettings(s => ({ ...s, colorEdges: v }))}
                label="Cores nas Arestas"
              />
              <Toggle
                enabled={visualSettings.showArrows}
                onChange={v => setVisualSettings(s => ({ ...s, showArrows: v }))}
                label="Setas Direcionais"
              />
              <Toggle
                enabled={visualSettings.curvature}
                onChange={v => setVisualSettings(s => ({ ...s, curvature: v }))}
                label="Arestas Curvas"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Tamanho:</span>
                {(['small', 'medium', 'large'] as const).map(size => (
                  <button key={size} onClick={() => setVisualSettings(s => ({ ...s, nodeSize: size }))}
                    className={`px-2 py-1 text-xs rounded ${visualSettings.nodeSize === size ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                    {size === 'small' ? 'P' : size === 'medium' ? 'M' : 'G'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      {showFilters && (
        <div className="flex-shrink-0 bg-slate-800/50 border border-slate-700 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 text-sm">Filtrar por tipo:</span>
            {Object.entries(typeStats).map(([type, count]) => (
              <button key={type} onClick={() => {
                const newFilters = new Set(filterTypes);
                if (newFilters.has(type)) newFilters.delete(type);
                else newFilters.add(type);
                setFilterTypes(newFilters);
              }} className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${filterTypes.has(type) ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: NODE_COLORS[type] || '#6b7280' }} />
                {type} ({count})
              </button>
            ))}
            {filterTypes.size > 0 && (
              <button onClick={() => setFilterTypes(new Set())} className="text-xs text-slate-400 hover:text-white">
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      )}

      {/* AI Tools Bar */}
      {showAITools && (
        <div className="flex-shrink-0 bg-purple-900/20 border border-purple-700/50 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-purple-300 text-sm font-medium">Ferramentas de IA</span>
              {selectedNodes.size > 0 && (
                <span className="text-xs text-purple-400">({selectedNodes.size} selecionados)</span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => handleAIAction('find_duplicates')} disabled={aiProcessing}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-700/50 hover:bg-purple-700 text-purple-200 rounded text-xs disabled:opacity-50">
                <Merge className="w-3 h-3" /> Encontrar Duplicatas
              </button>
              <button onClick={() => handleAIAction('suggest_relations')} disabled={aiProcessing}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-700/50 hover:bg-purple-700 text-purple-200 rounded text-xs disabled:opacity-50">
                <Link2 className="w-3 h-3" /> Sugerir Relações
              </button>
              <button onClick={() => handleAIAction('clean_entities')} disabled={aiProcessing}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-700/50 hover:bg-purple-700 text-purple-200 rounded text-xs disabled:opacity-50">
                <Wand2 className="w-3 h-3" /> Limpar Entidades
              </button>
              <button onClick={() => handleAIAction('enrich_descriptions')} disabled={aiProcessing}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-700/50 hover:bg-purple-700 text-purple-200 rounded text-xs disabled:opacity-50">
                <Edit3 className="w-3 h-3" /> Enriquecer Descrições
              </button>
              {aiProcessing && <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />}
            </div>
          </div>
          {aiResult && (
            <div className={`mt-2 p-2 rounded text-xs ${aiResult.startsWith('Erro') ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}>
              {aiResult}
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">
        {/* Side Panel - Node List */}
        {showSidePanel && (
          <div className="w-72 flex-shrink-0 bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
            {/* Panel Header */}
            <div className="p-3 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <span className="text-white text-sm font-medium">Nós ({graphData.nodes.length})</span>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip text="Selecionar todos">
                  <button onClick={() => {
                    if (selectedNodes.size === graphData.nodes.length) {
                      setSelectedNodes(new Set());
                    } else {
                      setSelectedNodes(new Set(graphData.nodes.map(n => n.id)));
                    }
                  }} className="p-1 text-slate-400 hover:text-white rounded">
                    {selectedNodes.size === graphData.nodes.length ? <CheckSquare className="w-4 h-4 text-yellow-400" /> : <Square className="w-4 h-4" />}
                  </button>
                </Tooltip>
                <Tooltip text="Expandir todos">
                  <button onClick={() => {
                    if (expandedTypes.size === Object.keys(nodesByType).length) {
                      setExpandedTypes(new Set());
                    } else {
                      setExpandedTypes(new Set(Object.keys(nodesByType)));
                    }
                  }} className="p-1 text-slate-400 hover:text-white rounded">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* Node List */}
            <div className="flex-1 overflow-y-auto p-2">
              {Object.entries(nodesByType).sort((a, b) => a[0].localeCompare(b[0])).map(([type, nodes]) => {
                const isExpanded = expandedTypes.has(type);
                const allSelected = nodes.every(n => selectedNodes.has(n.id));
                const someSelected = nodes.some(n => selectedNodes.has(n.id));

                return (
                  <div key={type} className="mb-1">
                    {/* Type Header */}
                    <div className="flex items-center gap-1 py-1.5 px-2 rounded hover:bg-slate-700/50 cursor-pointer group"
                      onClick={() => toggleTypeExpanded(type)}>
                      <button className="text-slate-400">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: NODE_COLORS[type] || '#6b7280' }} />
                      <span className="text-white text-sm flex-1">{type}</span>
                      <span className="text-slate-500 text-xs">{nodes.length}</span>
                      <Tooltip text={allSelected ? 'Desselecionar todos' : 'Selecionar todos'} position="left">
                        <button onClick={e => { e.stopPropagation(); selectAllOfType(type); }}
                          className="p-0.5 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white">
                          {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-yellow-400" /> :
                            someSelected ? <CheckSquare className="w-3.5 h-3.5 text-yellow-600" /> :
                              <Square className="w-3.5 h-3.5" />}
                        </button>
                      </Tooltip>
                    </div>

                    {/* Nodes */}
                    {isExpanded && (
                      <div className="ml-4 border-l border-slate-700">
                        {nodes.map(node => {
                          const isSelected = selectedNodes.has(node.id);
                          const isNodeExpanded = expandedNodes.has(node.id);
                          const connections = getNodeConnections(node.id);

                          return (
                            <div key={node.id}>
                              <div className={`flex items-center gap-1 py-1 px-2 rounded cursor-pointer group
                                ${isSelected ? 'bg-yellow-900/30' : 'hover:bg-slate-700/50'}`}>
                                {connections.length > 0 ? (
                                  <button onClick={() => toggleNodeExpanded(node.id)} className="text-slate-500">
                                    {isNodeExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                  </button>
                                ) : (
                                  <span className="w-3" />
                                )}
                                <button onClick={() => toggleNodeSelection(node.id)}
                                  className="flex-shrink-0">
                                  {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-yellow-400" /> : <Square className="w-3.5 h-3.5 text-slate-500" />}
                                </button>
                                <span className="text-white text-xs truncate flex-1"
                                  onClick={() => setSelectedNode(node)}
                                  title={node.name}>
                                  {node.name}
                                </span>
                                {connections.length > 0 && (
                                  <span className="text-slate-600 text-xs">{connections.length}</span>
                                )}
                                <div className="flex opacity-0 group-hover:opacity-100">
                                  <Tooltip text="Editar" position="left">
                                    <button onClick={() => { setEditingNode(node); setShowEditNode(true); }}
                                      className="p-0.5 text-slate-400 hover:text-blue-400">
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                  </Tooltip>
                                </div>
                              </div>

                              {/* Node Connections */}
                              {isNodeExpanded && connections.length > 0 && (
                                <div className="ml-6 border-l border-slate-600/50 text-xs">
                                  {/* Select all connected button */}
                                  {(() => {
                                    const connectedIds = connections.map(c => c.node?.id).filter(Boolean) as string[];
                                    const allConnectedSelected = connectedIds.every(id => selectedNodes.has(id));
                                    const someConnectedSelected = connectedIds.some(id => selectedNodes.has(id));
                                    return (
                                      <div className="flex items-center gap-1.5 py-1 px-2 mb-1 bg-slate-800/50 rounded">
                                        <button onClick={() => {
                                          const newSelected = new Set(selectedNodes);
                                          if (allConnectedSelected) {
                                            connectedIds.forEach(id => newSelected.delete(id));
                                          } else {
                                            connectedIds.forEach(id => newSelected.add(id));
                                          }
                                          setSelectedNodes(newSelected);
                                        }}
                                          className="flex items-center gap-1 text-slate-400 hover:text-white">
                                          {allConnectedSelected ? <CheckSquare className="w-3 h-3 text-yellow-400" /> :
                                            someConnectedSelected ? <CheckSquare className="w-3 h-3 text-yellow-600" /> :
                                              <Square className="w-3 h-3" />}
                                          <span className="text-xs">{allConnectedSelected ? 'Desselecionar' : 'Selecionar'} todos ({connectedIds.length})</span>
                                        </button>
                                      </div>
                                    );
                                  })()}
                                  {connections.slice(0, 10).map((conn, i) => {
                                    const connNodeId = conn.node?.id;
                                    const isConnSelected = connNodeId ? selectedNodes.has(connNodeId) : false;
                                    return (
                                      <div key={i} className={`flex items-center gap-1 py-0.5 px-2 hover:bg-slate-700/30 cursor-pointer group
                                        ${isConnSelected ? 'bg-yellow-900/20' : ''}`}>
                                        {connNodeId && (
                                          <button onClick={(e) => { e.stopPropagation(); toggleNodeSelection(connNodeId); }}
                                            className="flex-shrink-0">
                                            {isConnSelected ? <CheckSquare className="w-3 h-3 text-yellow-400" /> : <Square className="w-3 h-3 text-slate-500 group-hover:text-slate-300" />}
                                          </button>
                                        )}
                                        <span className={conn.direction === 'outgoing' ? 'text-green-500' : 'text-blue-500'}>
                                          {conn.direction === 'outgoing' ? '→' : '←'}
                                        </span>
                                        <span className="text-slate-500 truncate" style={{ color: getEdgeColor(conn.relation) }}>
                                          {conn.relation}
                                        </span>
                                        <span className="text-slate-300 truncate flex-1" onClick={() => conn.node && setSelectedNode(conn.node)}>
                                          {conn.node?.name}
                                        </span>
                                      </div>
                                    );
                                  })}
                                  {connections.length > 10 && (
                                    <div className="px-2 py-0.5 text-slate-500">+{connections.length - 10} mais...</div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Edge Types Legend */}
            <div className="p-3 border-t border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="w-3 h-3 text-slate-400" />
                <span className="text-slate-400 text-xs">Tipos de Relação</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(edgeStats).slice(0, 6).map(([rel, count]) => (
                  <span key={rel} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-slate-700/50"
                    style={{ borderLeft: `3px solid ${getEdgeColor(rel)}` }}>
                    <span className="text-slate-300 truncate max-w-[80px]">{rel}</span>
                    <span className="text-slate-500">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Graph Container */}
        <div className="flex-1 bg-slate-900 rounded-xl border border-slate-700 overflow-hidden relative">
          {filteredData.nodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 mb-4">{searchQuery || filterTypes.size > 0 ? 'Nenhum nó encontrado com os filtros aplicados.' : 'Nenhum nó no grafo ainda.'}</p>
                {!searchQuery && filterTypes.size === 0 && (
                  <Tooltip text="Criar o primeiro nó do grafo">
                    <button onClick={() => setShowAddNode(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg mx-auto">
                      <Plus className="w-4 h-4" /> Criar Primeiro Nó
                    </button>
                  </Tooltip>
                )}
              </div>
            </div>
          ) : (
            <ForceGraph3D
              ref={graphRef}
              graphData={{
                nodes: filteredData.nodes.map(n => ({ ...n, val: getNodeSize(n.id) })),
                links: filteredData.edges.map(e => ({
                  ...e,
                  source: e.source,
                  target: e.target,
                  color: getEdgeColor(e.label || e.relation)
                }))
              }}
              nodeLabel={(node: GraphNode) => visualSettings.showLabels ? `${node.name} (${node.label})` : ''}
              nodeColor={(node: GraphNode) => selectedNodes.has(node.id) ? '#fbbf24' : node.color}
              nodeRelSize={visualSettings.nodeSize === 'small' ? 4 : visualSettings.nodeSize === 'large' ? 8 : 6}
              nodeVal={(node: { val?: number }) => node.val || 1}
              linkLabel={(link: { label?: string }) => visualSettings.showEdgeLabels ? (link.label || '') : ''}
              linkColor={(link: { color?: string }) => link.color || '#64748b'}
              linkWidth={1.5}
              linkDirectionalArrowLength={visualSettings.showArrows ? 3.5 : 0}
              linkDirectionalArrowRelPos={1}
              linkCurvature={visualSettings.curvature ? 0.25 : 0}
              onNodeClick={(node: GraphNode, event: MouseEvent) => {
                if (event.ctrlKey || event.metaKey || event.shiftKey) {
                  toggleNodeSelection(node.id);
                } else {
                  setSelectedNode(node);
                }
              }}
              onNodeRightClick={(node: GraphNode, event: MouseEvent) => {
                event.preventDefault();
                setContextMenu({
                  visible: true,
                  x: event.clientX,
                  y: event.clientY,
                  node
                });
              }}
              onBackgroundClick={() => {
                setSelectedNode(null);
                setContextMenu(prev => ({ ...prev, visible: false }));
              }}
              backgroundColor="#0f172a"
              width={undefined}
              height={undefined}
            />
          )}

          {/* Context Menu */}
          {contextMenu.visible && contextMenu.node && (
            <div
              className="fixed bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1 z-50 min-w-[180px]"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={e => e.stopPropagation()}
            >
              <div className="px-3 py-2 border-b border-slate-700">
                <p className="text-white font-medium text-sm truncate">{contextMenu.node.name}</p>
                <p className="text-slate-400 text-xs">{contextMenu.node.label}</p>
              </div>
              <button
                onClick={() => { toggleNodeSelection(contextMenu.node!.id); setContextMenu(prev => ({ ...prev, visible: false })); }}
                className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                {selectedNodes.has(contextMenu.node.id) ? 'Desselecionar' : 'Selecionar'}
              </button>
              <button
                onClick={() => { setEditingNode(contextMenu.node); setShowEditNode(true); setContextMenu(prev => ({ ...prev, visible: false })); }}
                className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4" /> Editar
              </button>
              <button
                onClick={() => {
                  const newSelection = new Set(selectedNodes);
                  newSelection.add(contextMenu.node!.id);
                  setSelectedNodes(newSelection);
                  setShowAdvancedEdit(true);
                  setContextMenu(prev => ({ ...prev, visible: false }));
                }}
                className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
              >
                <Network className="w-4 h-4" /> Ver Relações
              </button>
              <button
                onClick={() => { navigator.clipboard.writeText(contextMenu.node!.id); setContextMenu(prev => ({ ...prev, visible: false })); }}
                className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
              >
                <Copy className="w-4 h-4" /> Copiar ID
              </button>
              <div className="border-t border-slate-700 my-1" />
              <button
                onClick={() => { handleDeleteNode(contextMenu.node!.id); setContextMenu(prev => ({ ...prev, visible: false })); }}
                className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-900/30 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Deletar
              </button>
            </div>
          )}

          {/* Selected Node Panel */}
          {selectedNode && (
            <div className="absolute bottom-4 left-4 bg-slate-800/95 border border-slate-700 rounded-xl p-4 w-72 backdrop-blur">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 text-xs rounded font-medium"
                  style={{ backgroundColor: selectedNode.color + '30', color: selectedNode.color }}>
                  {selectedNode.label}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditingNode(selectedNode); setShowEditNode(true); }}
                    className="p-1 text-slate-400 hover:text-blue-400 rounded">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteNode(selectedNode.id)}
                    className="p-1 text-slate-400 hover:text-red-400 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setSelectedNode(null)} className="p-1 text-slate-400 hover:text-white rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-white font-medium text-sm">{selectedNode.name}</h3>
              {selectedNode.description && <p className="text-slate-400 text-xs mt-1">{selectedNode.description}</p>}
              <p className="text-slate-500 text-xs mt-2">ID: {selectedNode.id}</p>
              <button onClick={() => toggleNodeSelection(selectedNode.id)}
                className={`mt-2 w-full py-1.5 rounded text-xs ${selectedNodes.has(selectedNode.id)
                  ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}>
                {selectedNodes.has(selectedNode.id) ? '✓ Selecionado' : 'Selecionar para IA'}
              </button>
            </div>
          )}

          {/* Multi-selection indicator */}
          {selectedNodes.size > 0 && !selectedNode && (
            <div className="absolute bottom-4 left-4 bg-yellow-900/90 border border-yellow-700 rounded-lg px-4 py-2">
              <span className="text-yellow-200 text-sm">{selectedNodes.size} nós selecionados</span>
              <button onClick={() => setSelectedNodes(new Set())} className="ml-3 text-yellow-400 hover:text-yellow-200 text-sm">
                Limpar
              </button>
            </div>
          )}

          {/* Instructions */}
          <div className="absolute bottom-4 right-4 text-slate-500 text-xs">
            Clique = detalhes • Ctrl+Click = selecionar • Scroll = zoom
          </div>
        </div>
      </div>

      {/* Add Node Modal */}
      {showAddNode && (
        <Modal onClose={() => setShowAddNode(false)} title="Novo Nó">
          <form onSubmit={handleAddNode} className="space-y-4">
            <Input label="ID do Nó *" value={newNode.nodeId} onChange={v => setNewNode(p => ({ ...p, nodeId: v }))} required />
            <Select label="Tipo" value={newNode.label} onChange={v => setNewNode(p => ({ ...p, label: v }))} options={NODE_TYPES} />
            <Input label="Nome *" value={newNode.name} onChange={v => setNewNode(p => ({ ...p, name: v }))} required />
            <Textarea label="Descrição" value={newNode.description} onChange={v => setNewNode(p => ({ ...p, description: v }))} />
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowAddNode(false)} className="px-4 py-2 text-slate-300 hover:text-white">Cancelar</button>
              <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Criar</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Node Modal */}
      {showEditNode && editingNode && (
        <Modal onClose={() => { setShowEditNode(false); setEditingNode(null); }} title="Editar Nó">
          <form onSubmit={handleEditNode} className="space-y-4">
            <div className="text-xs text-slate-500">ID: {editingNode.id}</div>
            <Select label="Tipo" value={editingNode.label} onChange={v => setEditingNode({ ...editingNode, label: v })} options={NODE_TYPES} />
            <Input label="Nome *" value={editingNode.name} onChange={v => setEditingNode({ ...editingNode, name: v })} required />
            <Textarea label="Descrição" value={editingNode.description || ''} onChange={v => setEditingNode({ ...editingNode, description: v })} />
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowEditNode(false); setEditingNode(null); }} className="px-4 py-2 text-slate-300 hover:text-white">Cancelar</button>
              <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Salvar</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Advanced Edit Modal - Simplified */}
      {showAdvancedEdit && selectedNodesData.length > 0 && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Network className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold text-white">Editar Seleção</h2>
                <span className="px-2 py-1 bg-blue-600 text-white text-sm rounded-lg">{selectedNodesData.length} nós</span>
              </div>
              <button onClick={() => setShowAdvancedEdit(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content - Single scrollable list */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedNodesData.map((node, index) => {
                const nodeEdges = getNodeEdgesInSelection(node.id);
                const isEditing = editingNodeInline === node.id;

                return (
                  <div key={node.id} className={`mb-4 bg-slate-800 rounded-xl overflow-hidden border ${isEditing ? 'border-blue-500' : 'border-slate-700'}`}>
                    {/* Node Header */}
                    <div className="flex items-center gap-3 p-4">
                      <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: node.color }} />

                      {isEditing ? (
                        <div className="flex-1 space-y-3">
                          <input type="text" value={inlineEditData.name}
                            onChange={e => setInlineEditData(p => ({ ...p, name: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-lg font-medium focus:outline-none focus:border-blue-500"
                            placeholder="Nome do nó" />
                          <div className="flex gap-3">
                            <select value={inlineEditData.label}
                              onChange={e => setInlineEditData(p => ({ ...p, label: e.target.value }))}
                              className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500">
                              {NODE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <textarea value={inlineEditData.description}
                            onChange={e => setInlineEditData(p => ({ ...p, description: e.target.value }))}
                            rows={3}
                            placeholder="Descrição do nó (opcional)"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
                          <div className="flex items-center gap-2">
                            <button onClick={cancelInlineEdit} className="px-4 py-2 text-slate-400 hover:text-white text-sm">
                              Cancelar
                            </button>
                            <button onClick={() => saveInlineEdit(node.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
                              <Save className="w-4 h-4" /> Salvar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-white font-medium truncate">{node.name}</h3>
                              <span className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded">{node.label}</span>
                            </div>
                            {node.description ? (
                              <p className="text-slate-400 text-sm mt-1 line-clamp-2">{node.description}</p>
                            ) : (
                              <p className="text-slate-500 text-sm mt-1 italic">Sem descrição</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {!node.description && (
                              <Tooltip text="Gerar descrição com IA">
                                <button onClick={() => generateNodeDescription(node.id)}
                                  disabled={generatingDescription === node.id}
                                  className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-900/30 rounded-lg">
                                  {generatingDescription === node.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                </button>
                              </Tooltip>
                            )}
                            <Tooltip text="Editar nó">
                              <button onClick={() => startInlineEdit(node)} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-900/30 rounded-lg">
                                <Edit3 className="w-4 h-4" />
                              </button>
                            </Tooltip>
                            <Tooltip text="Remover da seleção">
                              <button onClick={() => toggleNodeSelection(node.id)} className="p-2 text-slate-400 hover:text-yellow-400 hover:bg-yellow-900/30 rounded-lg">
                                <X className="w-4 h-4" />
                              </button>
                            </Tooltip>
                            <Tooltip text="Deletar nó">
                              <button onClick={() => handleDeleteNode(node.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </Tooltip>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Node Edges */}
                    {nodeEdges.length > 0 && !isEditing && (
                      <div className="px-4 pb-3 pt-0">
                        <div className="flex flex-wrap gap-2">
                          {nodeEdges.map((edge, i) => {
                            const sourceId = typeof edge.source === 'string' ? edge.source : (edge.source as GraphNode).id;
                            const targetId = typeof edge.target === 'string' ? edge.target : (edge.target as GraphNode).id;
                            const isOutgoing = sourceId === node.id;
                            const otherNode = graphData.nodes.find(n => n.id === (isOutgoing ? targetId : sourceId));

                            return (
                              <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-slate-900 rounded text-xs group">
                                <span className={isOutgoing ? 'text-green-400' : 'text-blue-400'}>
                                  {isOutgoing ? '→' : '←'}
                                </span>
                                <span style={{ color: getEdgeColor(edge.relation) }} className="font-medium">{edge.relation}</span>
                                <span className="text-slate-400">{otherNode?.name}</span>
                                <button onClick={() => handleDeleteEdge(edge)}
                                  className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 ml-1">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add New Relation Section */}
              <div className="mt-6 p-4 bg-slate-800 rounded-xl border border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                  <Link2 className="w-5 h-5 text-green-400" />
                  <h3 className="text-white font-medium">Criar Nova Relação</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <select value={newEdge.source} onChange={e => setNewEdge(p => ({ ...p, source: e.target.value }))}
                    className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm">
                    <option value="">De...</option>
                    {selectedNodesData.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                  </select>
                  <input type="text" placeholder="Tipo (ex: KNOWS)"
                    value={newEdge.relation} onChange={e => setNewEdge(p => ({ ...p, relation: e.target.value }))}
                    className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm" />
                  <select value={newEdge.target} onChange={e => setNewEdge(p => ({ ...p, target: e.target.value }))}
                    className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm">
                    <option value="">Para...</option>
                    {selectedNodesData.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                  </select>
                </div>
                <div className="flex justify-end mt-3">
                  <button onClick={handleCreateEdge} disabled={!newEdge.source || !newEdge.target || !newEdge.relation}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm disabled:opacity-50">
                    <Plus className="w-4 h-4" /> Criar Relação
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-6 py-4 bg-slate-800 border-t border-slate-700 flex items-center justify-between">
              <button onClick={() => setSelectedNodes(new Set())}
                className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg text-sm">
                <RotateCcw className="w-4 h-4" /> Limpar Seleção
              </button>
              <button onClick={() => setShowAdvancedEdit(false)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable components
function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm text-slate-300 mb-1">{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} required={required}
        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="block text-sm text-slate-300 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm text-slate-300 mb-1">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
    </div>
  );
}

