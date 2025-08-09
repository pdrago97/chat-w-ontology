import React, { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape, { NodeSingular, EdgeSingular, LayoutOptions } from 'cytoscape';
import { useLanguage } from '../contexts/LanguageContext';
import { translateGraphData } from '../services/graphTranslation';
import SourceSwitcher from './SourceSwitcher';


interface GraphComponentProps {
  graphData: any;
  onGraphUpdate?: (newGraphData: any) => void;
}

const GraphComponent: React.FC<GraphComponentProps> = ({ graphData, onGraphUpdate }) => {


  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const { language, t } = useLanguage();

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
      // Handle different data structures flexibly
      if (!data) return { nodes: [], edges: [] };

      // If already in good format, use as-is
      if (data.nodes && Array.isArray(data.nodes)) {
        // Create a set of valid node IDs for edge validation
        const validNodeIds = new Set();

        const transformedNodes = data.nodes.map((node: any, index: number) => {
          const nodeId = String(node.id || node.name || `node_${index}`);
          validNodeIds.add(nodeId);
          return {
            id: nodeId,
            label: node.label || node.name || node.id || `Node ${index}`,
            type: node.type || 'Unknown',
            ...node
          };
        });

        // Filter edges to only include those with valid source/target
        const transformedEdges = (data.edges || []).filter((edge: any) => {
          const source = String(edge.source || edge.from || '');
          const target = String(edge.target || edge.to || '');
          const isValid = source && target && validNodeIds.has(source) && validNodeIds.has(target);

          if (!isValid && source && target) {
            console.warn(`🔗 Skipping edge: ${source} → ${target} (missing nodes)`);
          }

          return isValid;
        }).map((edge: any, index: number) => ({
          id: edge.id || `edge_${index}`,
          source: String(edge.source || edge.from),
          target: String(edge.target || edge.to),
          relation: edge.relation || edge.label || edge.type || '',
          ...edge
        }));

        console.log(`Transformed: ${transformedNodes.length} nodes, ${transformedEdges.length} edges`);

        return {
          nodes: transformedNodes,
          edges: transformedEdges
        };
      }

      // Fallback: create minimal structure
      return {
        nodes: [{ id: 'fallback', label: 'Data Available', type: 'Info' }],
        edges: []
      };
    } catch (error) {
      console.error('Transform error:', error);
      return {
        nodes: [{ id: 'error', label: 'Transform Error', type: 'Error' }],
        edges: []
      };
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
    if (!containerRef.current || !graphData) return;

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
            originalId: String(node.id), // Keep original ID for reference
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
            originalRelation: String(edge.relation || edge.label || ''), // Keep original for reference
            ...edge
          }
        }))
      };

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
                const baseWidth = Math.max(120, Math.min(label.length * 9, 280));
                return baseWidth;
              },
              'height': (node: NodeSingular) => {
                const label = node.data('label') as string || '';
                const lines = label.split('\n').length;
                return Math.max(60, Math.min(lines * 25 + 20, 120));
              },
              'background-color': (node: NodeSingular) => {
                const type = (node.data('type') || 'default').toLowerCase();
                switch (type) {
                  case 'person': return '#4CAF50';
                  case 'experience': return '#9C27B0';
                  case 'education': return '#2196F3';
                  case 'skills': return '#FF5722';
                  case 'project': return '#FFC107';
                  case 'group': return '#FF9800';
                  case 'status': return '#E91E63';
                  default: return '#607D8B';
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
              'background-color': '#4CAF50',
              'border-color': '#2E7D32',
              'shape': 'round-diamond',
              'border-width': '4px'
            }
          },
          {
            selector: 'node.education',
            style: {
              'background-color': '#2196F3',
              'border-color': '#1565C0',
              'shape': 'round-octagon'
            }
          },
          {
            selector: 'node.experience',
            style: {
              'background-color': '#9C27B0',
              'border-color': '#6A1B9A',
              'shape': 'roundrectangle'
            }
          },
          {
            selector: 'node.skills',
            style: {
              'background-color': '#FF5722',
              'border-color': '#D84315',
              'shape': 'round-hexagon'
            }
          },
          {
            selector: 'node.project',
            style: {
              'background-color': '#FFC107',
              'border-color': '#F57C00',
              'shape': 'round-tag'
            }
          },
          {
            selector: 'node.achievements',
            style: {
              'background-color': '#E91E63',
              'border-color': '#AD1457',
              'shape': 'star'
            }
          },
          {
            selector: 'node.interests',
            style: {
              'background-color': '#FF9800',
              'border-color': '#E65100',
              'shape': 'round-triangle'
            }
          },
          {
            selector: 'node.profile',
            style: {
              'background-color': '#607D8B',
              'border-color': '#37474F',
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
              'width': '3px',
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
          name: 'cose',
          animate: true,
          animationDuration: 1500,
          animationEasing: 'ease-out',
          padding: 80,
          nodeRepulsion: 8000,
          idealEdgeLength: 150,
          nodeOverlap: 20,
          gravity: 0.8,
          edgeElasticity: 200,
          nestingFactor: 1.2,
          numIter: 1000,
          initialTemp: 200,
          coolingFactor: 0.95,
          minTemp: 1.0,
          randomize: false,
          componentSpacing: 100,
          refresh: 20,
          fit: true,
          stop: function() {
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
        case 'person': originalColor = '#4CAF50'; break;
        case 'experience': originalColor = '#9C27B0'; break;
        case 'education': originalColor = '#2196F3'; break;
        case 'skills': originalColor = '#FF5722'; break;
        case 'project': originalColor = '#FFC107'; break;
        case 'group': originalColor = '#FF9800'; break;
        case 'status': originalColor = '#E91E63'; break;
        case 'achievements': originalColor = '#E91E63'; break;
        case 'interests': originalColor = '#FF9800'; break;
        case 'profile': originalColor = '#607D8B'; break;
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
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }

        .modal-content {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          padding: 32px;
          max-width: 90vw;
          width: 100%;
          max-height: 85vh;
          overflow-y: auto;
          position: relative;
          box-shadow:
            0 25px 50px -12px rgba(0, 0, 0, 0.25),
            0 0 0 1px rgba(255, 255, 255, 0.05);
          z-index: 10000;
          transform-origin: center center;
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
          margin: 0 0 12px 0;
          font-size: 24px;
          font-weight: 700;
          color: #1a1a1a;
          border-bottom: 3px solid #4CAF50;
          padding-bottom: 12px;
          background: linear-gradient(135deg, #4CAF50, #66BB6A);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
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
    setTimeout(() => {
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

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [graphData, language]); // Re-render when language changes

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {/* Refresh + Source switcher */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10001, display: 'flex', alignItems: 'center' }}>
        <button
          onClick={refreshGraphData}
          disabled={isRefreshing}
          style={{
            padding: '12px 20px',
            background: isRefreshing
              ? 'linear-gradient(135deg, #bdc3c7 0%, #95a5a6 100%)'
              : 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '25px',
            cursor: isRefreshing ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            boxShadow: isRefreshing
              ? '0 4px 8px rgba(0,0,0,0.1)'
              : '0 6px 12px rgba(52, 152, 219, 0.3)',
            transition: 'all 0.3s ease',
            transform: isRefreshing ? 'scale(0.95)' : 'scale(1)',
            backdropFilter: 'blur(10px)'
          }}
          title={lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleTimeString()}` : t('graph.refresh')}
          onMouseEnter={(e) => {
            if (!isRefreshing) {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(52, 152, 219, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isRefreshing) {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(52, 152, 219, 0.3)';
            }
          }}
        >
          {isRefreshing ? `🔄 ${t('graph.loading')}` : `🔄 ${t('graph.refresh')}`}
        </button>
      {/* Mount source switcher here to sit next to refresh */}
      <SourceSwitcher onGraphUpdate={onGraphUpdate || (() => {})} />

        <div id="source-switcher-root" style={{ marginLeft: '8px' }}></div>
      </div>

      {/* Graph container */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100vh',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(255,255,255,0.3) 2px, transparent 2px),
            radial-gradient(circle at 75% 75%, rgba(255,255,255,0.3) 2px, transparent 2px)
          `,
          backgroundSize: '40px 40px',
          position: 'relative'
        }}
      />
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
        .filter(([k, v]) => v !== null && v !== undefined)
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
