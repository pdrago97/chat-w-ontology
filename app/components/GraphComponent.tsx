import React, { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape, { NodeSingular, EdgeSingular, LayoutOptions } from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
try { cytoscape.use(coseBilkent as any); } catch {}

import { useLanguage } from '../contexts/LanguageContext';
import { translateGraphData } from '../services/graphTranslation';

import GraphModeToggle from './GraphModeToggle';
import SourceSwitcher from './SourceSwitcher';
import GraphNavigationPanel from './GraphNavigationPanel';
import ReactLazy = React.lazy;
const ForceGraph3DView = React.lazy(() => import('./ForceGraph3DView'));


interface GraphComponentProps {
  graphData: any;
  onGraphUpdate?: (newGraphData: any) => void;
}

const GraphComponent: React.FC<GraphComponentProps> = ({ graphData, onGraphUpdate }) => {


  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const { language, t } = useLanguage();
  const [mode, setMode] = useState<'2d' | '3d'>('3d');

  // UI guardrails & controls
  const [initAttempts, setInitAttempts] = useState(0);
  // Enhanced navigation and filtering
  const [storyLens, setStoryLens] = useState(false);
  const [minDegree, setMinDegree] = useState(2);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [showNodeDetails, setShowNodeDetails] = useState(false);

  // Canonicalization helpers for Cognee-derived content
  const canonicalType = (n: any): string => {
    const raw = String(n.type || n.category || '').toLowerCase();
    const name = String(n.label || n.title || n.name || '').toLowerCase();
    const clues = `${raw} ${name}`;
    if (clues.includes('pedro')) return 'person';
    if (clues.includes('person')) return 'person';
    if (clues.includes('role') || clues.includes('position') || clues.includes('experience') || clues.includes('job')) return 'experience';
    if (clues.includes('company') || clues.includes('org') || clues.includes('organization')) return 'company';
    if (clues.includes('project') || clues.includes('product')) return 'project';
    if (clues.includes('skill')) return 'skills';
    if (clues.includes('tech') || clues.includes('framework') || clues.includes('library')) return 'technology';
    if (clues.includes('education') || clues.includes('university') || clues.includes('degree')) return 'education';
    if (clues.includes('cert')) return 'certification';
    return raw || 'default';
  };

  const canonicalRelation = (e: any): string => {
    const raw = String(e.relation || e.label || e.type || '').toLowerCase();
    if (raw.includes('work') || raw.includes('employ')) return 'WORKED_AT';
    if (raw.includes('role') || raw.includes('position')) return 'ROLE_AT';
    if (raw.includes('skill') || raw.includes('use')) return 'USED_SKILL';
    if (raw.includes('project') || raw.includes('built') || raw.includes('develop')) return 'BUILT';
    if (raw.includes('study') || raw.includes('university') || raw.includes('education')) return 'STUDIED_AT';
    if (raw.includes('cert')) return 'CERTIFIED';
    if (raw.includes('contrib')) return 'CONTRIBUTED_TO';
    return e.relation || e.label || '';
  };

  const [autoPan, setAutoPan] = useState(false);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [counts, setCounts] = useState({ nodes: 0, edges: 0 });

  // Helper function to brighten colors on hover
  const brightenColor = (color: string, amount: number) => {
    // Handle RGB format
    if (color.startsWith('rgb')) {
      const matches = color.match(/\d+/g);
      if (matches && matches.length >= 3) {
        const r = parseInt(matches[0]);
        const g = parseInt(matches[1]);
        const b = parseInt(matches[2]);

        const newR = Math.min(255, Math.floor(r + (255 - r) * amount));
        const newG = Math.min(255, Math.floor(g + (255 - g) * amount));
        const newB = Math.min(255, Math.floor(b + (255 - b) * amount));

        return `rgb(${newR}, ${newG}, ${newB})`;
      }
    }

    // Handle hex format
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);

      const newR = Math.min(255, Math.floor(r + (255 - r) * amount));
      const newG = Math.min(255, Math.floor(g + (255 - g) * amount));
      const newB = Math.min(255, Math.floor(b + (255 - b) * amount));

      return `rgb(${newR}, ${newG}, ${newB})`;
    }

    return color; // Return original if format not recognized
  };

  // Function to refresh graph data
  // Transform any data structure to Cytoscape format
  const transformDataForCytoscape = (data: any) => {
    try {
      if (!data) return { nodes: [], edges: [] };

      // Remove engine internals/heavy fields from nodes/edges (deep)
      const sanitize = (obj: any): any => {
        if (obj === null || obj === undefined) return obj;
        if (Array.isArray(obj)) return obj.map(sanitize);
        if (typeof obj !== 'object') return obj;
        const out: any = {};
        for (const [k, v] of Object.entries(obj)) {
          if (k.startsWith('__')) continue; // e.g., __threeObj, __lineObj, __indexColor
          if (['fx','fy','fz','vx','vy','vz','x','y','z'].includes(k)) continue; // physics/pos
          const sv = sanitize(v);
          if (sv === undefined || sv === null) continue;
          out[k] = sv;
        }
        return out;
      };

      // If already in good format, use as-is (after sanitize)
      if (data.nodes && Array.isArray(data.nodes)) {
        const validNodeIds = new Set();

        const transformedNodes = data.nodes.map((node: any, index: number) => {
          const n = sanitize(node) || {};
          const nodeId = String(n.id || n.name || `node_${index}`);
          validNodeIds.add(nodeId);
          const normType = canonicalType(n);
          return {
            id: nodeId,
            label: n.label || n.name || n.id || `Node ${index}`,
            type: normType || 'Unknown',
            ...n,
            _normalized: { type: normType }
          };
        });

        const transformedEdges = (data.edges || []).filter((edge: any) => {
          const source = String(edge.source || edge.from || '');
          const target = String(edge.target || edge.to || '');
          const isValid = source && target && validNodeIds.has(source) && validNodeIds.has(target);
          if (!isValid && source && target) {
            console.warn(`🔗 Skipping edge: ${source} → ${target} (missing nodes)`);
          }
          return isValid;
        }).map((edge: any, index: number) => {
          const e = sanitize(edge) || {};
          const rel = canonicalRelation(e);
          return {
            id: e.id || `edge_${index}`,
            source: String(e.source || e.from),
            target: String(e.target || e.to),
            relation: rel,
            weight: typeof e.weight === 'number' ? e.weight : 1,
            ...e,
            _normalized: { relation: rel }
          };
        });

        return { nodes: transformedNodes, edges: transformedEdges };
      }

      // Fallback: create minimal structure
      return { nodes: [{ id: 'fallback', label: 'Data Available', type: 'Info' }], edges: [] };
    } catch (error) {
      console.error('Transform error:', error);
      return { nodes: [{ id: 'error', label: 'Transform Error', type: 'Error' }], edges: [] };
    }
  };

  // Default refresh pulls the curated JSON. Use the menu next to this button to switch source.
  const refreshGraphData = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      const response = await fetch('/api/graph');
      if (response.ok) {
        const newGraphData = await response.json();
        if (onGraphUpdate) {
          onGraphUpdate(newGraphData);
        }
        setLastUpdated(newGraphData.lastUpdated || new Date().toISOString());
      }
    } catch (error) {
      console.error('Error refreshing graph data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, onGraphUpdate]);

  // Auto-refresh disabled - manual refresh only

  const validateGraphData = (graphData: any) => {
    // Ultra-flexible validation - never throw errors, always adapt
    if (!graphData) {
      console.warn('No graph data provided, using fallback');
      return { nodes: [], edges: [] };
    }

    // Auto-fix missing structure
    if (!graphData.nodes) {
      graphData.nodes = [];
    }
    if (!graphData.edges) {
      graphData.edges = [];
    }

    return graphData;
  };

  useEffect(() => {
    // only init Cytoscape in 2D mode
    if (mode !== '2d') return;
    if (!containerRef.current || !graphData) return;

    // measure container; if 0x0, delay one tick and retry a few times
    const el = containerRef.current;
    const rect = el.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    setContainerSize({ w, h });

    if ((w === 0 || h === 0) && initAttempts < 5) {
      const id = requestAnimationFrame(() => setInitAttempts((n) => n + 1));
      return () => cancelAnimationFrame(id);
    }

    // reset attempts once we have size
    if (initAttempts !== 0 && w > 0 && h > 0) {
      setInitAttempts(0);
    }

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    try {
      // Translate graph data based on current language
      const translatedGraphData = translateGraphData(graphData, language);
      console.log(`🌐 Language: ${language}, Translated nodes:`, translatedGraphData?.nodes?.length || 0);

      // Transform data flexibly
      const transformedData = transformDataForCytoscape(translatedGraphData);

      // Create Cytoscape elements from transformed data with extra safety
      const cyElements = {
        nodes: transformedData.nodes.filter(node => node && node.id).map((node: any) => ({
          data: {
            id: String(node.id),
            label: String(node.label || node.id || 'Unknown'),
            type: String(node.type || 'Unknown'),
            degree: 0,
            originalId: String(node.id),
            ...node
          },
          classes: String(node.type || 'default').toLowerCase().replace(/[^a-z0-9]/g, '') || 'default'
        })),
        edges: transformedData.edges.filter(edge => edge && edge.source && edge.target).map((edge: any) => ({
          data: {
            id: String(edge.id || `${edge.source}-${edge.target}`),
            source: String(edge.source),
            target: String(edge.target),
            label: String(edge.relation || edge.label || ''),
            weight: Number(edge.weight ?? 1),
            originalRelation: String(edge.relation || edge.label || ''),
            ...edge
          }
        }))
      };

      // Apply story lens and min-degree filtering (post-init)
      const applyLenses = () => {
        if (!cyRef.current) return;
        const cy = cyRef.current;

        // compute degree on nodes for sizing/filters
        cy.nodes().forEach((n: any) => n.data('degree', n.degree(true)));

        // min-degree filter
        cy.batch(() => {
          cy.nodes().forEach((n: any) => {
            const d = n.data('degree') || 0;
            n.style('display', d < minDegree ? 'none' : 'element');
          });
        });

        if (storyLens) {
          const pedro = cy.nodes().filter((n: any) => /pedro/i.test(n.data('label')) || /pedro/i.test(n.id()));
          if (pedro.length) {
            const ego = pedro.closedNeighborhood().closedNeighborhood(); // ~2 hops
            cy.batch(() => {
              cy.nodes().difference(ego.nodes()).style('display', 'none');
              cy.edges().difference(ego.edges()).style('display', 'none');
            });
            cy.layout({ name: 'breadthfirst', roots: pedro, spacingFactor: 1.2, fit: true, padding: 80 }).run();
          }
        }
      };

      requestAnimationFrame(applyLenses);


      setCounts({ nodes: cyElements.nodes.length, edges: cyElements.edges.length });

      cyRef.current = cytoscape({
        container: containerRef.current,
        elements: [...cyElements.nodes, ...cyElements.edges],
        style: [
          {
            selector: 'node',
            style: {
              'label': (node: NodeSingular) => node.data('label') as string,
              'text-valign': 'center',
              'text-halign': 'center',
              'text-wrap': 'wrap',
              'text-max-width': '180px',
              'font-size': '14px',
              'font-weight': '600',
              'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              'color': '#ffffff',
              'text-outline-width': '2px',
              'text-outline-color': 'rgba(0,0,0,0.7)',
              'border-width': '3px',
              'border-style': 'solid',
              'shape': 'roundrectangle',
              'width': (node: NodeSingular) => {
                const label = node.data('label') as string || '';
                const deg = node.degree(true);
                const baseWidth = Math.max(110, Math.min(label.length * 8.5, 260));
                return baseWidth + Math.min(60, deg * 4);
              },
              'height': (node: NodeSingular) => {
                const label = node.data('label') as string || '';
                const lines = label.split('\n').length;
                const deg = node.degree(true);
                return Math.max(56, Math.min(lines * 22 + 18, 110)) + Math.min(40, deg * 2);
              },
              'background-color': (node: NodeSingular) => {
                const nodeData = node.data();
                const category = nodeData.category || canonicalType(nodeData);
                const type = (nodeData.type || 'default').toLowerCase();

                // Enhanced professional color scheme
                if (category === 'person' || type === 'person') return '#8B5CF6';     // Purple for Pedro
                if (category === 'company' || type === 'company') return '#3B82F6';   // Blue for companies
                if (category === 'experience' || category === 'role' || type === 'experience' || type === 'role') return '#10B981'; // Green for roles
                if (category === 'project' || type === 'project') return '#F59E0B';   // Amber for projects
                if (category === 'technology' || category === 'skill' || type === 'technology' || type === 'skills') return '#EF4444'; // Red for tech
                if (category === 'education' || type === 'education') return '#14B8A6'; // Teal for education
                if (category === 'certification' || type === 'certification') return '#F97316'; // Orange for certs
                if (category === 'concept' || type === 'concept') return '#6B7280';   // Gray for concepts

                // Fallback to original colors for compatibility
                switch (type) {
                  case 'group': return '#06b6d4';        // cyan-500
                  case 'status': return '#ef4444';       // red-500
                  default: return '#6366F1';             // indigo-500
                }
              },
              'box-shadow-blur': '8px',
              'box-shadow-color': 'rgba(0,0,0,0.2)',
              'box-shadow-offset-x': '2px',
              'box-shadow-offset-y': '4px',
              'transition-property': 'all',
              'transition-duration': '0.3s'
            }
          },
          // Enhanced node styling with modern gradients and shadows
          {
            selector: 'node.person',
            style: {
              'background-color': '#22c55e',
              'border-color': '#16a34a',
              'shape': 'round-diamond',
              'border-width': '4px'
            }
          },
          {
            selector: 'node.education',
            style: {
              'background-color': '#3b82f6',
              'border-color': '#1d4ed8',
              'shape': 'round-octagon'
            }
          },
          {
            selector: 'node.experience',
            style: {
              'background-color': '#a855f7',
              'border-color': '#9333ea',
              'shape': 'roundrectangle'
            }
          },
          {
            selector: 'node.skills',
            style: {
              'background-color': '#f97316',
              'border-color': '#ea580c',
              'shape': 'round-hexagon'
            }
          },
          {
            selector: 'node.project',
            style: {
              'background-color': '#f59e0b',
              'border-color': '#d97706',
              'shape': 'round-tag'
            }
          },
          {
            selector: 'node.achievements',
            style: {
              'background-color': '#ef4444',
              'border-color': '#dc2626',
              'shape': 'star'
            }
          },
          {
            selector: 'node.interests',
            style: {
              'background-color': '#06b6d4',
              'border-color': '#0891b2',
              'shape': 'round-triangle'
            }
          },
          {
            selector: 'node.profile',
            style: {
              'background-color': '#64748b',
              'border-color': '#475569',
              'shape': 'ellipse'
            }
          },
          {
            selector: 'node.group',
            style: {
              'background-color': '#FF9800',
              'border-color': '#F57C00',
              'shape': 'round-hexagon'
            }
          },
          {
            selector: 'node.status',
            style: {
              'background-color': '#E91E63',
              'border-color': '#C2185B',
              'shape': 'ellipse'
            }
          },
          // Hover effects
          {
            selector: 'node:active',
            style: {
              'overlay-color': 'rgba(255,255,255,0.3)',
              'overlay-padding': '8px',
              'overlay-opacity': 0.8,
              'border-width': '5px',
              'box-shadow-blur': '12px',
              'box-shadow-color': 'rgba(0,0,0,0.4)'
            }
          },
          {
            selector: 'edge',
            style: {
              'width': (edge: EdgeSingular) => {
                const w = Number(edge.data('weight') ?? 1);
                return Math.max(2, Math.min(6, 2 + w));
              },
              'line-color': '#7F8C8D',
              'target-arrow-color': '#7F8C8D',
              'target-arrow-shape': 'triangle-backcurve',
              'target-arrow-size': '12px',
              'curve-style': 'unbundled-bezier',
              'control-point-distances': '20 -20',
              'control-point-weights': '0.25 0.75',
              'label': (edge: EdgeSingular) => edge.data('label') || '',
              'font-size': '11px',
              'font-weight': '500',
              'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              'color': '#34495E',
              'text-rotation': 'autorotate',
              'text-margin-y': '-12px',
              'text-opacity': 0.9,
              'text-background-color': 'rgba(255,255,255,0.8)',
              'text-background-padding': '3px',
              'text-background-shape': 'roundrectangle',
              'text-border-color': '#BDC3C7',
              'text-border-width': '1px',
              'text-border-opacity': 0.5,
              'opacity': 0.8,
              'transition-property': 'all',
              'transition-duration': '0.3s'
            }
          },
          {
            selector: 'edge:active',
            style: {
              'width': '4px',
              'line-color': '#3498DB',
              'target-arrow-color': '#3498DB',
              'opacity': 1,
              'text-opacity': 1
            }
          }
        ],
        layout: {
          name: 'cose-bilkent',
          animate: true,
          randomize: false,
          fit: true,
          padding: 80,
          nodeRepulsion: 6000,
          idealEdgeLength: 110,
          edgeElasticity: 0.25,
          nestingFactor: 0.9,
          gravityRangeCompound: 1.5,
          gravityCompound: 1.2,
          gravity: 0.8,
          numIter: 2500,
          tile: true,
          ready: () => {
            if (autoPan && cyRef.current) {
              cyRef.current.center();
              cyRef.current.fit(undefined, 50);
            }
          },
          stop: () => {
            if (cyRef.current) {
              cyRef.current.center();
              cyRef.current.fit(undefined, 50);
            }
          }
        } as LayoutOptions,
        minZoom: 0.3,
        maxZoom: 2.5,
        wheelSensitivity: 0.15,
        boxSelectionEnabled: false,
        selectionType: 'single'
      });

    } catch (error) {
      console.error('Error initializing cytoscape:', error);
      // Create fallback visualization
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f8f9fa; border-radius: 8px;">
            <div style="text-align: center; color: #6c757d;">
              <h3>⚠️ ${t('graph.error')}</h3>
              <p>${t('graph.error.message')}</p>
              <p><small>Check console for details</small></p>
            </div>
          </div>
        `;
      }
    }

    // Add click event for nodes

    // Add enhanced interactions for nodes
    if (!cyRef.current) return;

    // Add enhanced hover effects with color brightening
    cyRef.current.on('mouseover', 'node', function(e: any) {
      const node = e.target;
      const originalColor = node.style('background-color');
      const brightenedColor = brightenColor(originalColor, 0.3);

      node.animate({
        style: {
          'border-width': '6px',
          'box-shadow-blur': '20px',
          'box-shadow-color': 'rgba(0,0,0,0.6)',
          'background-color': brightenedColor,
          'z-index': 999
        }
      }, {
        duration: 200,
        easing: 'ease-out'
      });

      // Highlight connected edges
      const connectedEdges = node.connectedEdges();
      connectedEdges.animate({
        style: {
          'width': '4px',
          'line-color': '#3498DB',
          'target-arrow-color': '#3498DB',
          'opacity': 1
        }
      }, {
        duration: 200
      });
    });

    cyRef.current.on('mouseout', 'node', function(e: any) {
      const node = e.target;
      const nodeType = node.data('type') || 'default';

      // Restore original color based on node type
      let originalColor = '#607D8B'; // default
      switch (nodeType.toLowerCase()) {
        case 'person': originalColor = '#22c55e'; break;
        case 'experience': originalColor = '#a855f7'; break;
        case 'education': originalColor = '#3b82f6'; break;
        case 'skills': originalColor = '#f97316'; break;
        case 'project': originalColor = '#f59e0b'; break;
        case 'group': originalColor = '#06b6d4'; break;
        case 'status': originalColor = '#ef4444'; break;
        case 'achievements': originalColor = '#ef4444'; break;
        case 'interests': originalColor = '#06b6d4'; break;
        case 'profile': originalColor = '#64748b'; break;
      }

      node.animate({
        style: {
          'border-width': '3px',
          'box-shadow-blur': '8px',
          'box-shadow-color': 'rgba(0,0,0,0.2)',
          'background-color': originalColor,
          'z-index': 1
        }
      }, {
        duration: 200,
        easing: 'ease-out'
      });

      // Reset connected edges
      const connectedEdges = node.connectedEdges();
      connectedEdges.animate({
        style: {
          'width': '3px',
          'line-color': '#7F8C8D',
          'target-arrow-color': '#7F8C8D',
          'opacity': 0.8
        }
      }, {
        duration: 200
      });
    });

    cyRef.current.on('tap', 'node', function(e: any) {
      e.preventDefault();
      e.stopPropagation();

      const node = e.target;
      const data = node.data();

      // Add a subtle click animation
      node.animate({
        style: {
          'border-width': '6px'
        }
      }, {
        duration: 100,
        complete: () => {
          node.animate({
            style: {
              'border-width': '3px'
            }
          }, {
            duration: 100
          });
        }
      });

      // Remove any existing tooltips
      const existingTooltip = document.querySelector('.modal-overlay');
      if (existingTooltip) {
        existingTooltip.remove();
      }

      // Create modal overlay with initial hidden state
      const modalOverlay = document.createElement('div');
      modalOverlay.className = 'modal-overlay';
      modalOverlay.style.opacity = '0';
      modalOverlay.style.backdropFilter = 'blur(0px)';

      // Create modal content with proper styling classes and initial scale
      const tooltip = document.createElement('div');
      tooltip.className = 'modal-content tooltip-content';
      tooltip.innerHTML = createTooltipContent(data);
      tooltip.style.transform = 'scale(0.7) translateY(20px)';
      tooltip.style.opacity = '0';

      // Add a visible close button for accessibility
      const closeBtn = document.createElement('button');
      closeBtn.className = 'modal-close-btn';
      closeBtn.textContent = '×';
      tooltip.appendChild(closeBtn);

      modalOverlay.appendChild(tooltip);
      document.body.appendChild(modalOverlay);

      // Trigger Apple-style animation
      requestAnimationFrame(() => {
        modalOverlay.style.transition = 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), backdrop-filter 0.3s ease';
        tooltip.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';

        modalOverlay.style.opacity = '1';
        modalOverlay.style.backdropFilter = 'blur(8px)';
        tooltip.style.transform = 'scale(1) translateY(0px)';
        tooltip.style.opacity = '1';
      });

      // Add styles dynamically
      const style = document.createElement('style');
      style.textContent = `
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(2, 6, 23, 0.72); /* darker dim for readability */
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }

        .modal-content {
          background: #ffffff;
          color: #0b1220; /* slate-950/900 mix */
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 24px 28px;
          max-width: 90vw;
          width: 100%;
          max-height: 80vh;
          overflow-y: auto;
          position: relative;
          box-shadow:
            0 22px 45px -12px rgba(0, 0, 0, 0.35),
            0 0 0 1px rgba(0, 0, 0, 0.03);
          z-index: 10000;
          transform-origin: center center;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
          line-height: 1.6;
          font-size: 16px;
        }

        .tooltip-content-wrapper {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          animation: contentFadeIn 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.1s both;
        }

        @keyframes contentFadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .tooltip-title {
          margin: 0 0 8px 0;
          font-size: 22px;
          font-weight: 700;
          color: #0b1220;
        }

        .tooltip-subtitle {
          margin: 0 0 20px 0;
          font-size: 14px;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 6px 12px;
          background: rgba(76, 175, 80, 0.1);
          border-radius: 20px;
          display: inline-block;
        }

        .field-section {
          margin: 16px 0;
          padding: 16px;
          background: rgba(255, 255, 255, 0.6);
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          animation: fieldSlideIn 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) calc(var(--index, 0) * 0.1s) both;
        }

        @keyframes fieldSlideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .field-item {
          margin: 8px 0;
          font-size: 15px;
          color: #444;
          line-height: 1.5;
        }

        .field-text {
          margin: 12px 0;
          color: #444;
          font-size: 15px;
          line-height: 1.7;
          text-align: justify;
          padding: 12px;
          background: rgba(0, 0, 0, 0.02);
          border-radius: 8px;
          border-left: 3px solid #4CAF50;
        }

        .field-list {
          margin: 12px 0 0 0;
          padding-left: 0;
          color: #444;
          font-size: 14px;
          line-height: 1.6;
          list-style: none;
        }

        .field-list li {
          margin: 8px 0;
          padding: 8px 12px;
          background: rgba(76, 175, 80, 0.05);
          border-radius: 6px;
          border-left: 2px solid #4CAF50;
          position: relative;
        }

        .field-list li::before {
          content: '•';
          color: #4CAF50;
          font-weight: bold;
          position: absolute;
          left: -8px;
        }

        /* Close button */
        .modal-close-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 32px;
          height: 32px;
          border-radius: 9999px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          color: #334155;
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0,0,0,0.08);
        }
        .modal-close-btn:hover { background: #f8fafc; }
        .modal-close-btn:active { transform: scale(0.98); }

        /* Collapsible sections for heavy content */
        .collapsible { margin: 12px 0; border: 1px solid #e5e7eb; border-radius: 8px; background: #f8fafc; }
        .collapsible > summary { cursor: pointer; list-style: none; padding: 10px 12px; font-weight: 600; color: #0b1220; }
        .collapsible[open] > summary { border-bottom: 1px solid #e5e7eb; background: #f1f5f9; }
        .collapsible > summary::-webkit-details-marker { display: none; }
        .code-block { margin: 0; padding: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 12.5px; line-height: 1.5; max-height: 260px; overflow: auto; background: #ffffff; color: #0b1220; }

        .action-section {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 2px solid rgba(76, 175, 80, 0.2);
          text-align: center;
        }

        .download-container {
          margin-top: 20px;
          padding: 16px;
          background: #f5f5f5;
          border-radius: 8px;
          text-align: center;
          z-index: 10001;
        }

        .download-resume-btn {
          display: inline-block;
          background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
          color: white;
          padding: 16px 32px;
          border: none;
          border-radius: 25px;
          font-size: 16px;
          font-weight: 600;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          cursor: pointer;
          text-decoration: none;
          text-align: center;
          transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          z-index: 10001;
          position: relative;
          box-shadow:
            0 8px 16px rgba(76, 175, 80, 0.3),
            0 0 0 1px rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          transform: translateY(0);
        }

        .download-resume-btn:hover {
          background: linear-gradient(135deg, #45a049 0%, #5cb85c 100%);
          transform: translateY(-3px) scale(1.02);
          box-shadow:
            0 12px 24px rgba(76, 175, 80, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.2);
        }

        .download-resume-btn:active {
          transform: translateY(-1px) scale(0.98);
          box-shadow:
            0 4px 8px rgba(76, 175, 80, 0.3),
            0 0 0 1px rgba(255, 255, 255, 0.1);
        }

        @media (min-width: 768px) {
          .modal-content {
            max-width: 600px;
          }

          .download-resume-btn {
            font-size: 16px;
            padding: 12px 24px;
          }
        }
      `;
      document.head.appendChild(style);

      // Handle click events with smooth close animation
      const closeModal = () => {
        modalOverlay.style.transition = 'opacity 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94), backdrop-filter 0.25s ease';
        tooltip.style.transition = 'all 0.3s cubic-bezier(0.55, 0.055, 0.675, 0.19)';

        modalOverlay.style.opacity = '0';
        modalOverlay.style.backdropFilter = 'blur(0px)';
        tooltip.style.transform = 'scale(0.8) translateY(10px)';
        tooltip.style.opacity = '0';

        setTimeout(() => {
          modalOverlay.remove();
          style.remove();
        }, 300);
      };

      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
          closeModal();
        }
      });

      // Add escape key support
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          closeModal();
          document.removeEventListener('keydown', handleEscape);
        }
      };
      document.addEventListener('keydown', handleEscape);

      // Close btn event
      const closeBtnEl = tooltip.querySelector('.modal-close-btn');
      if (closeBtnEl) {
        closeBtnEl.addEventListener('click', (e) => { e.stopPropagation(); closeModal(); });
      }

      // Prevent download button clicks from closing the modal
      const downloadBtn = tooltip.querySelector('.download-resume-btn');
      if (downloadBtn) {
        downloadBtn.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }
    });

    // Close tooltip when clicking on background with animation
    cyRef.current.on('tap', function(e: any) {
      if (e.target === cyRef.current) {
        const modalOverlay = document.querySelector('.modal-overlay') as HTMLElement;
        const tooltip = document.querySelector('.modal-content') as HTMLElement;

        if (modalOverlay && tooltip) {
          modalOverlay.style.transition = 'opacity 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94), backdrop-filter 0.25s ease';
          tooltip.style.transition = 'all 0.3s cubic-bezier(0.55, 0.055, 0.675, 0.19)';

          modalOverlay.style.opacity = '0';
          modalOverlay.style.backdropFilter = 'blur(0px)';
          tooltip.style.transform = 'scale(0.8) translateY(10px)';
          tooltip.style.opacity = '0';

          setTimeout(() => {
            modalOverlay.remove();
          }, 300);
        }
      }
    });

    // Add smooth layout completion effects
    cyRef.current.on('layoutstop', function() {
      // Fade in nodes with staggered animation
      cyRef.current.nodes().forEach((node: any, index: number) => {
        node.style('opacity', 0);
        setTimeout(() => {
          if (node.isNode && node.isNode()) {
            node.animate({
              style: { 'opacity': 1 }
            }, {
              duration: 300,
              easing: 'ease-out'
            });
          }
        }, index * 50);
      });
    });

    // Initial positioning with smooth animation
    const initTimer = setTimeout(() => {
      if (cyRef.current) {
        cyRef.current.fit(undefined, 80);

        // Try to center on Pedro if he exists, otherwise center normally
        const pedroNode = cyRef.current.getElementById('Pedro Reichow') || cyRef.current.getElementById('Pedro Drago Reichow');
        if (pedroNode && pedroNode.length > 0) {
          cyRef.current.animate({
            center: { eles: pedroNode },
            zoom: 0.8
          }, {
            duration: 1000,
            easing: 'ease-out'
          });
        } else {
          cyRef.current.center();
          cyRef.current.zoom(0.8);
        }
      }
    }, 100);

    // optional auto-pan animation
    let autoPanId: number | null = null;
    if (autoPan && cyRef.current) {
      const cy = cyRef.current;
      let angle = 0;
      const tick = () => {
        if (!autoPan || !cyRef.current) return;
        angle += 0.5; // degrees per frame
        const zoom = cy.zoom();
        const center = cy.extent();
        // gently pan in a small circle
        const dx = Math.cos(angle * Math.PI / 180) * 5 / zoom;
        const dy = Math.sin(angle * Math.PI / 180) * 5 / zoom;
        cy.panBy({ x: dx, y: dy });
        autoPanId = requestAnimationFrame(tick);
      };
      autoPanId = requestAnimationFrame(tick);
    }

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
      if (autoPanId) cancelAnimationFrame(autoPanId);
      clearTimeout(initTimer);
    };
  }, [graphData, language, initAttempts, autoPan, storyLens, minDegree]); // re-run when lens/filter changes

  const resetView = () => {
    if (!cyRef.current) return;
    cyRef.current.stop();
    cyRef.current.fit(undefined, 80);
    cyRef.current.center();
    cyRef.current.zoom(0.8);
  };

  // Handle navigation panel filters
  const handleFilterChange = useCallback((filters: any) => {
    setCategoryFilter(filters.category);
    setSearchTerm(filters.searchTerm);
    setMinDegree(filters.minConnections);

    // Apply filters to the graph
    if (cyRef.current) {
      const cy = cyRef.current;

      cy.batch(() => {
        cy.nodes().forEach((node: any) => {
          const nodeData = node.data();
          let visible = true;

          // Category filter
          if (filters.category !== 'all') {
            const nodeCategory = nodeData.category || canonicalType(nodeData);
            visible = visible && nodeCategory === filters.category;
          }

          // Search filter
          if (filters.searchTerm) {
            const searchLower = filters.searchTerm.toLowerCase();
            const label = (nodeData.label || '').toLowerCase();
            const title = (nodeData.title || '').toLowerCase();
            const description = (nodeData.description || '').toLowerCase();
            visible = visible && (
              label.includes(searchLower) ||
              title.includes(searchLower) ||
              description.includes(searchLower)
            );
          }

          // Connection filter
          if (filters.minConnections > 0) {
            visible = visible && node.degree() >= filters.minConnections;
          }

          node.style('display', visible ? 'element' : 'none');
        });
      });
    }
  }, []);

  const handleNodeFocus = useCallback((nodeId: string) => {
    if (cyRef.current) {
      const cy = cyRef.current;
      const node = cy.getElementById(nodeId);
      if (node.length > 0) {
        cy.animate({
          center: { eles: node },
          zoom: 1.5
        }, {
          duration: 500
        });

        // Highlight the node
        node.animate({
          style: {
            'border-width': '8px',
            'border-color': '#FFD700'
          }
        }, {
          duration: 300,
          complete: () => {
            setTimeout(() => {
              node.animate({
                style: {
                  'border-width': '3px',
                  'border-color': node.data('originalBorderColor') || '#4B5563'
                }
              }, { duration: 300 });
            }, 1000);
          }
        });
      }
    }
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {/* Enhanced Navigation Panel */}
      <GraphNavigationPanel
        graphData={graphData}
        onFilterChange={handleFilterChange}
        onNodeFocus={handleNodeFocus}
      />

      {/* Bottom-left control cluster (no overlap with canvas center) */}
      <div style={{ position: 'absolute', bottom: '16px', left: '16px', zIndex: 10002, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <GraphModeToggle mode={mode} onChange={setMode} />
        {mode === '2d' && (
          <>
            <button
              onClick={resetView}
              className="px-2.5 py-1.5 rounded-md bg-white text-slate-900 border border-slate-300 shadow hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-slate-900/40"
              title="Reset camera"
            >
              Reset camera
            </button>


          </>
        )}
      </div>

      {/* Top-right: Source switcher + refresh */}
      <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10001, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <SourceSwitcher onGraphUpdate={onGraphUpdate || (() => {})} />
        <button
          onClick={refreshGraphData}
          disabled={isRefreshing}
          className="px-3 py-2 rounded-full bg-blue-600 text-white shadow hover:bg-blue-700 disabled:opacity-60"
          title={lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleTimeString()}` : t('graph.refresh')}
        >
          {isRefreshing ? `🔄 ${t('graph.loading')}` : `🔄 ${t('graph.refresh')}`}
        </button>
      </div>

      {/* Container info centered at top */}
      <div style={{ position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 10000, fontSize: '12px', color: '#111', background: 'rgba(255,255,255,0.85)', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        container: {containerSize.w}x{containerSize.h} • nodes: {counts.nodes} • edges: {counts.edges}
      </div>

      {/* Graph container(s) */}
      {mode === '2d' && (
        <div
          ref={containerRef}
          style={{
            position: 'absolute',
            inset: 0,
            minHeight: '100vh',
            width: '100%',
            height: '100%',
            background: '#f8fafc' // slate-50 for clean, high-contrast canvas
          }}
        />
      )}
      {mode === '3d' && isClient && (
        <React.Suspense fallback={<div style={{position:'absolute',inset:0,display:'grid',placeItems:'center'}}>Loading 3D…</div>}>
          <ForceGraph3DView graphData={graphData} />
        </React.Suspense>
      )}
      {mode === '3d' && !isClient && (
        <div style={{position:'absolute',inset:0,display:'grid',placeItems:'center'}}>Loading 3D…</div>
      )}
    </div>
  );
};

function getNodeLabel(node: any): string {
  if (!node) return '';

  // Start with the primary identifier
  const primaryLabel = node.id || node.name || node.title || node.label || 'Unknown';

  // Add secondary information based on available fields
  const secondaryInfo = [];

  // Type-specific secondary information
  switch (node?.type) {
    case 'Person':
      if (node.title) secondaryInfo.push(node.title);
      break;
    case 'Education':
      if (node.degree) secondaryInfo.push(node.degree);
      if (node.years) secondaryInfo.push(node.years);
      break;
    case 'Experience':
      if (node.title) secondaryInfo.push(node.title);
      if (node.years) secondaryInfo.push(node.years);
      break;
    case 'Skills':
      if (node.category) secondaryInfo.push(node.category);
      if (node.proficiency) secondaryInfo.push(node.proficiency);
      break;
    case 'Project':
      if (node.company) secondaryInfo.push(node.company);
      break;
    default:
      // For unknown types, try common fields
      if (node.title && node.title !== primaryLabel) secondaryInfo.push(node.title);
      if (node.description && node.description.length < 50) secondaryInfo.push(node.description);
      if (node.type) secondaryInfo.push(`(${node.type})`);
      break;
  }

  // Combine primary and secondary information
  const parts = [primaryLabel, ...secondaryInfo.slice(0, 2)]; // Limit to avoid overcrowding
  return parts.join('\n');
}

function createTooltipContent(data: any): string {
  // Dynamic tooltip content generator that handles any object structure
  if (!data) return '<h3>No data available</h3>';

  // Helper function to format field names
  const formatFieldName = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .replace(/_/g, ' '); // Replace underscores with spaces
  };

  // Helper: sanitize data to remove internal/engine keys (deep)
  const shouldSkipKey = (key: string) => key.startsWith('__') || ['fx','fy','fz','vx','vy','vz','x','y','z','index','__indexColor'].includes(key);
  const deepSanitize = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(deepSanitize);
    if (typeof obj !== 'object') return obj;
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (shouldSkipKey(k)) continue;
      const sv = deepSanitize(v);
      if (sv !== undefined) out[k] = sv;
    }
    return out;
  };

  // Ensure we don't display internal fields
  data = deepSanitize(data);


  // Helper function to render different value types
  const renderValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return '';

    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length === 0) return '';
      return `
        <div class="field-section">
          <strong>${formatFieldName(key)}:</strong>
          <ul class="field-list">
            ${value.map(item => `<li>${typeof item === 'object' ? JSON.stringify(item) : item}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    // Handle objects
    if (typeof value === 'object') {
      const subFields = Object.entries(value)
        .filter(([k, v]) => v !== null && v !== undefined && !shouldSkipKey(k))
        .map(([k, v]) => `<li><strong>${formatFieldName(k)}:</strong> ${v}</li>`)
        .join('');

      if (subFields) {
        return `
          <div class="field-section">
            <strong>${formatFieldName(key)}:</strong>
            <ul class="field-list">
              ${subFields}
            </ul>
          </div>
        `;
      }
      return '';
    }

    // Handle primitive values
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      // Special handling for long text fields
      if (typeof value === 'string' && value.length > 100) {
        return `
          <div class="field-section">
            <strong>${formatFieldName(key)}:</strong>
            <p class="field-text">${value}</p>
          </div>
        `;
      }
      return `<div class="field-item"><strong>${formatFieldName(key)}:</strong> ${value}</div>`;
    }

    return '';
  };

  // Start building the tooltip content
  let content = '';

  // Title section - prioritize common title fields
  const titleField = data.id || data.name || data.title || data.label || 'Unknown';
  content += `<h3 class="tooltip-title">${titleField}</h3>`;

  // Subtitle section - show type and other key info
  if (data.type) {
    content += `<div class="tooltip-subtitle">${data.type}</div>`;
  }

  // Priority fields that should appear first
  const priorityFields = ['title', 'description', 'summary', 'years', 'duration', 'location', 'degree'];
  const processedFields = new Set(['id', 'name', 'label', 'type']); // Track processed fields

  // Render priority fields first
  priorityFields.forEach(field => {
    if (data[field] && !processedFields.has(field)) {
      content += renderValue(field, data[field]);
      processedFields.add(field);
    }
  });

  // Render remaining fields
  Object.entries(data)
    .filter(([key, value]) => !processedFields.has(key) && value !== null && value !== undefined)
    .forEach(([key, value]) => {
      content += renderValue(key, value);
    });

  // Special handling for Person type - add download button if it exists
  if (data.type === 'Person' && data.id === 'Pedro Reichow') {
    content += `
      <div class="action-section">
        <a
          href="/assets/Pedro Reichow - Professional Resume.pdf"
          download
          class="download-resume-btn"
        >
          Download Resume
        </a>
      </div>
    `;
  }

  return `<div class="tooltip-content-wrapper">${content}</div>`;
}
export default GraphComponent;
