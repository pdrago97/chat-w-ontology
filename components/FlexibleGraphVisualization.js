/**
 * Flexible Graph Visualization Component
 * Handles any JSON structure and transforms it for visualization
 */
import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';

const FlexibleGraphVisualization = ({ 
  graphData = null, 
  height = "600px",
  onNodeClick = null,
  showStats = true 
}) => {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [stats, setStats] = useState({ nodes: 0, edges: 0, errors: [] });
  const [isLoading, setIsLoading] = useState(true);

  // Transform any data structure to Cytoscape format
  const transformDataForCytoscape = (data) => {
    const errors = [];
    let elements = { nodes: [], edges: [] };

    try {
      // Handle null/undefined
      if (!data) {
        return { 
          elements, 
          errors: ['No data provided'],
          stats: { nodes: 0, edges: 0, dataType: 'null' }
        };
      }

      // Handle different data structures
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          errors.push('Invalid JSON string');
          return { elements, errors, stats: { nodes: 0, edges: 0, dataType: 'string' } };
        }
      }

      // Handle arrays
      if (Array.isArray(data)) {
        // Treat array items as nodes
        data.forEach((item, index) => {
          elements.nodes.push({
            data: {
              id: `item_${index}`,
              label: typeof item === 'object' ? (item.name || item.id || `Item ${index}`) : String(item),
              type: 'ArrayItem',
              originalData: item
            }
          });
        });
        return { 
          elements, 
          errors, 
          stats: { nodes: elements.nodes.length, edges: 0, dataType: 'array' }
        };
      }

      // Handle objects
      if (typeof data === 'object') {
        // Standard graph structure
        if (data.nodes && Array.isArray(data.nodes)) {
          // Transform nodes
          data.nodes.forEach((node, index) => {
            if (typeof node === 'object' && node !== null) {
              const nodeId = node.id || `node_${index}`;
              elements.nodes.push({
                data: {
                  id: String(nodeId),
                  label: node.label || node.name || node.title || String(nodeId),
                  type: node.type || 'Node',
                  ...node // Include all original properties
                }
              });
            }
          });

          // Transform edges
          if (data.edges && Array.isArray(data.edges)) {
            data.edges.forEach((edge, index) => {
              if (typeof edge === 'object' && edge !== null) {
                const source = edge.source || edge.from;
                const target = edge.target || edge.to;
                
                if (source && target) {
                  elements.edges.push({
                    data: {
                      id: edge.id || `edge_${index}`,
                      source: String(source),
                      target: String(target),
                      label: edge.label || edge.relation || edge.type || '',
                      ...edge // Include all original properties
                    }
                  });
                } else {
                  errors.push(`Edge ${index} missing source or target`);
                }
              }
            });
          }
        } 
        // Cytoscape elements format
        else if (data.elements) {
          if (data.elements.nodes) {
            elements.nodes = data.elements.nodes;
          }
          if (data.elements.edges) {
            elements.edges = data.elements.edges;
          }
        }
        // Generic object - create nodes from properties
        else {
          Object.entries(data).forEach(([key, value], index) => {
            elements.nodes.push({
              data: {
                id: `prop_${index}`,
                label: `${key}: ${typeof value === 'object' ? 'Object' : String(value)}`,
                type: 'Property',
                originalKey: key,
                originalValue: value
              }
            });
          });
        }

        return { 
          elements, 
          errors, 
          stats: { 
            nodes: elements.nodes.length, 
            edges: elements.edges.length, 
            dataType: 'object' 
          }
        };
      }

      // Fallback for primitive types
      elements.nodes.push({
        data: {
          id: 'primitive',
          label: String(data),
          type: typeof data,
          originalData: data
        }
      });

      return { 
        elements, 
        errors, 
        stats: { nodes: 1, edges: 0, dataType: typeof data }
      };

    } catch (error) {
      errors.push(`Transform error: ${error.message}`);
      return { 
        elements: { nodes: [], edges: [] }, 
        errors, 
        stats: { nodes: 0, edges: 0, dataType: 'error' }
      };
    }
  };

  // Initialize or update Cytoscape
  useEffect(() => {
    if (!containerRef.current) return;

    setIsLoading(true);

    try {
      // Transform data
      const { elements, errors, stats: dataStats } = transformDataForCytoscape(graphData);
      setStats({ ...dataStats, errors });

      // Destroy existing instance
      if (cyRef.current) {
        cyRef.current.destroy();
      }

      // Create new Cytoscape instance
      cyRef.current = cytoscape({
        container: containerRef.current,
        elements: [...elements.nodes, ...elements.edges],
        style: [
          {
            selector: 'node',
            style: {
              'background-color': (ele) => {
                const type = (ele.data('type') || 'default').toLowerCase();
                switch (type) {
                  case 'person': return '#22c55e';
                  case 'experience': return '#a855f7';
                  case 'skills': return '#f97316';
                  case 'education': return '#3b82f6';
                  case 'project': return '#f59e0b';
                  case 'group': return '#06b6d4';
                  case 'status': return '#ef4444';
                  case 'arrayitem': return '#c084fc';
                  case 'property': return '#eab308';
                  default: return '#64748b';
                }
              },
              'label': 'data(label)',
              'text-valign': 'center',
              'text-halign': 'center',
              'font-size': '12px',
              'font-weight': 'bold',
              'color': '#2C3E50',
              'text-wrap': 'wrap',
              'text-max-width': '120px',
              'width': (ele) => Math.max(60, Math.min(150, ele.data('label').length * 8)),
              'height': (ele) => Math.max(40, Math.min(80, ele.data('label').length * 2)),
              'border-width': 2,
              'border-color': '#34495E',
              'border-opacity': 0.8
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 2,
              'line-color': '#7F8C8D',
              'target-arrow-color': '#7F8C8D',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'label': 'data(label)',
              'font-size': '10px',
              'color': '#2C3E50',
              'text-rotation': 'autorotate',
              'text-margin-y': -10
            }
          },
          {
            selector: 'node:selected',
            style: {
              'border-width': 4,
              'border-color': '#E74C3C',
              'background-color': '#ECF0F1'
            }
          }
        ],
        layout: {
          name: 'cose',
          animate: true,
          animationDuration: 1000,
          nodeRepulsion: 8000,
          nodeOverlap: 20,
          idealEdgeLength: 100,
          edgeElasticity: 100,
          nestingFactor: 5,
          gravity: 80,
          numIter: 1000,
          initialTemp: 200,
          coolingFactor: 0.95,
          minTemp: 1.0
        },
        wheelSensitivity: 0.2,
        minZoom: 0.3,
        maxZoom: 3
      });

      // Add event listeners
      if (onNodeClick) {
        cyRef.current.on('tap', 'node', (event) => {
          const node = event.target;
          onNodeClick(node.data());
        });
      }

      // Fit to viewport
      setTimeout(() => {
        if (cyRef.current) {
          cyRef.current.fit();
          cyRef.current.center();
        }
        setIsLoading(false);
      }, 100);

    } catch (error) {
      console.error('Cytoscape initialization error:', error);
      setStats(prev => ({ ...prev, errors: [...prev.errors, error.message] }));
      setIsLoading(false);
    }

    // Cleanup
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [graphData, onNodeClick]);

  return (
    <div className="flexible-graph-container">
      {showStats && (
        <div className="graph-stats" style={{ 
          padding: '10px', 
          background: '#f8f9fa', 
          borderRadius: '5px', 
          marginBottom: '10px',
          fontSize: '14px'
        }}>
          <strong>Graph Stats:</strong> {stats.nodes} nodes, {stats.edges} edges 
          ({stats.dataType} data)
          {stats.errors.length > 0 && (
            <div style={{ color: '#e74c3c', marginTop: '5px' }}>
              <strong>Issues:</strong> {stats.errors.join(', ')}
            </div>
          )}
        </div>
      )}
      
      {isLoading && (
        <div style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
          background: 'rgba(255,255,255,0.9)',
          padding: '20px',
          borderRadius: '5px'
        }}>
          Loading graph...
        </div>
      )}
      
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height: height,
          border: '1px solid #ddd',
          borderRadius: '5px',
          position: 'relative'
        }} 
      />
    </div>
  );
};

export default FlexibleGraphVisualization;
