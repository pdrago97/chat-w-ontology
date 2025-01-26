import React, { useEffect, useRef } from 'react';
import cytoscape, { NodeSingular, EdgeSingular, LayoutOptions } from 'cytoscape';

interface GraphComponentProps {
  graphData: any;
}

const GraphComponent: React.FC<GraphComponentProps> = ({ graphData }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<any>(null);

  const validateGraphData = (graphData: any) => {
    if (!graphData?.nodes || !graphData?.edges) {
      throw new Error('Invalid graph data structure');
    }

    // Create set of node IDs for quick lookup
    const nodeIds = new Set(graphData.nodes.map((node: any) => node.id));

    // Validate nodes
    graphData.nodes.forEach((node: any) => {
      if (!node.id || typeof node.id !== 'string') {
        throw new Error(`Invalid node found: ${JSON.stringify(node)}\nNodes must have a valid string id`);
      }
    });

    // Validate edges
    const invalidEdges = graphData.edges.filter((edge: any) => {
      if (!edge.source || !edge.target) {
        return true;
      }
      return !nodeIds.has(edge.source) || !nodeIds.has(edge.target);
    });

    if (invalidEdges.length > 0) {
      const invalidEdgeDetails = invalidEdges.map((edge: any) => {
        const sourceValid = nodeIds.has(edge.source);
        const targetValid = nodeIds.has(edge.target);
        return `Edge from "${edge.source}" (${sourceValid ? 'valid' : 'invalid'}) to "${edge.target}" (${targetValid ? 'valid' : 'invalid'})`;
      }).join('\n');
      
      throw new Error(`Invalid edges found:\n${invalidEdgeDetails}\n\nPlease ensure all edges reference existing nodes.`);
    }

    // Additional validation for cytoscape
    const cyElements = {
      nodes: graphData.nodes.map((node: any) => ({
        data: { ...node, label: getNodeLabel(node) },
        classes: node?.type?.toLowerCase() || 'default'
      })),
      edges: graphData.edges.map((edge: any) => ({
        data: {
          source: edge.source,
          target: edge.target,
          label: edge.relation
        }
      }))
    };

    // Validate cytoscape elements
    cyElements.edges.forEach((edge: any) => {
      if (!edge.data.source || !edge.data.target) {
        throw new Error(`Edge missing source or target: ${JSON.stringify(edge)}`);
      }
    });
  };

  useEffect(() => {
    if (!containerRef.current || !graphData) return;

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    try {
      // Validate graph data before creating the graph
      validateGraphData(graphData);

      cyRef.current = cytoscape({
        container: containerRef.current,
        elements: {
          nodes: graphData.nodes.map((node: any) => ({
            data: { ...node, label: getNodeLabel(node) },
            classes: node?.type?.toLowerCase() || 'default'
          })),
          edges: graphData.edges.map((edge: any) => ({
            data: {
              source: edge.source,
              target: edge.target,
              label: edge.relation
            }
          }))
        },
        style: [
          {
            selector: 'node',
            style: {
              'label': (node: NodeSingular) => node.data('label') as string,
              'text-valign': 'center',
              'text-halign': 'center',
              'text-wrap': 'wrap',
              'text-max-width': '200px',
              'font-size': '12px',
              'border-width': '1px',
              'text-margin-x': 15,
              'shape': 'roundrectangle',
              'width': (node: NodeSingular) => {
                const label = node.data('label') as string;
                return Math.min(
                  label.length * 8,
                  node.data('maxLength') ? 200 : 300
                );
              },
              'height': (node: NodeSingular) => {
                const label = node.data('label') as string;
                return Math.min(
                  label.split('\n').length * 20,
                  node.data('maxLength') ? 100 : 150
                );
              }
            }
          },
          {
            selector: 'node.person',
            style: {
              'background-color': '#4CAF50',
              'border-color': '#2E7D32'
            }
          },
          {
            selector: 'node.education',
            style: {
              'background-color': '#2196F3',
              'border-color': '#1565C0'
            }
          },
          {
            selector: 'node.experience',
            style: {
              'background-color': '#9C27B0',
              'border-color': '#6A1B9A'
            }
          },
          {
            selector: 'node.group',
            style: {
              'background-color': '#FF9800',
              'border-color': '#F57C00',
              'shape': 'hexagon'
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
          {
            selector: 'edge',
            style: {
              'width': (edge: EdgeSingular) => 1,
              'line-color': (edge: EdgeSingular) => '#999',
              'target-arrow-color': (edge: EdgeSingular) => '#999',
              'target-arrow-shape': (edge: EdgeSingular) => 'triangle',
              'curve-style': (edge: EdgeSingular) => 'bezier',
              'label': (edge: EdgeSingular) => edge.data('label'),
              'font-size': (edge: EdgeSingular) => 16,
              'text-rotation': 'autorotate',
              'text-margin-y': (edge: EdgeSingular) => -10,
              'text-opacity': (edge: EdgeSingular) => 0.8
            }
          }
        ],
        layout: {
          name: 'cose',
          padding: 100,
          nodeRepulsion: (node: any) => 100000000,
          idealEdgeLength: (edge: any) => 200,
          nodeOverlap: 90000000,
          gravity: 2,
          edgeElasticity: (edge: any) => 4,
          spacingFactor: 9.5,
          randomize: false,
          componentSpacing: 0.000000000000000001,
          refresh: 20,
          fit: true,
          stop: function() {
            cyRef.current.center();
            cyRef.current.fit();
          }
        } as LayoutOptions,
        minZoom: 0.2,
        maxZoom: 3,
        wheelSensitivity: 0.2
      });

    } catch (error) {
      console.error('Error initializing cytoscape:', error);
    }

    // Add click event for nodes

    // Add click event for nodes
    if (!cyRef.current) return;
    cyRef.current.on('tap', 'node', function(e: any) {
      e.preventDefault();
      e.stopPropagation();
      
      const node = e.target;
      const data = node.data();
      
      // Remove any existing tooltips
      const existingTooltip = document.querySelector('.modal-overlay');
      if (existingTooltip) {
        existingTooltip.remove();
      }

      // Create modal overlay
      const modalOverlay = document.createElement('div');
      modalOverlay.className = 'modal-overlay';
      
      // Create modal content with proper styling classes
      const tooltip = document.createElement('div');
      tooltip.className = 'modal-content tooltip-content';
      tooltip.innerHTML = createTooltipContent(data);
      
      modalOverlay.appendChild(tooltip);
      document.body.appendChild(modalOverlay);

      // Add styles dynamically
      const style = document.createElement('style');
      style.textContent = `
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          backdrop-filter: blur(2px);
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          padding: 24px;
          max-width: 90vw;
          width: 100%;
          max-height: 85vh;
          overflow-y: auto;
          position: relative;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          z-index: 10000;
        }

        .tooltip-content h3 {
          margin: 0 0 16px 0;
          font-size: 20px;
          color: #333;
        }

        .tooltip-content p {
          margin: 8px 0;
          color: #555;
          font-size: 14px;
          line-height: 1.5;
        }

        .tooltip-content ul {
          margin: 8px 0;
          padding-left: 20px;
          color: #555;
          font-size: 14px;
          line-height: 1.5;
        }

        .tooltip-content .technologies {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #eee;
          font-style: italic;
          color: #666;
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
          display: block;
          width: 100%;
          background-color: #4CAF50;
          color: white;
          padding: 16px 24px;
          border: none;
          border-radius: 8px;
          font-size: 18px;
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
          text-align: center;
          transition: all 0.2s ease;
          z-index: 10001;
          position: relative;
        }

        .download-resume-btn:hover {
          background-color: #45a049;
          transform: translateY(-1px);
        }

        .download-resume-btn:active {
          background-color: #3d8b40;
          transform: translateY(1px);
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

      // Handle click events
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
          modalOverlay.remove();
          style.remove();
        }
      });

      // Prevent download button clicks from closing the modal
      const downloadBtn = tooltip.querySelector('.download-resume-btn');
      if (downloadBtn) {
        downloadBtn.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }
    });

    // Close tooltip when clicking on background
    cyRef.current.on('tap', function(e: any) {
      if (e.target === cyRef.current) {
        const tooltip = document.querySelector('.modal-overlay');
        if (tooltip) {
          tooltip.remove();
        }
      }
    });

    // Initial positioning
    cyRef.current.fit(undefined, 1000);
    cyRef.current.zoom({
      level: 0.012,
      position: cyRef.current.getElementById('Pedro Reichow').position()
    });

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [graphData]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100vh',
        backgroundColor: '#ffffff'
      }} 
    />
  );
};

function getNodeLabel(node: any): string {
  switch (node?.type) {
    case 'Person':
      return `${node.id}\n${node.title}`;
    case 'Education':
      return `${node.id}\n${node.degree}\n${node.years}`;
    case 'Experience':
      return `${node.id}\n${node.title}\n${node.years}`;
    case 'Group':
      return `${node.id}\n${node.description}`;
    case 'Status':
      return `${node.id}\n${node.description}`;
    default:
      return node?.id || '';
  }
}

function createTooltipContent(data: any): string {
    switch (data?.type) {
      case 'Person':
        return `
          <h3>${data.id}</h3>
          <p><strong>${data.title}</strong></p>
          <p>${data.location}</p>
          <p><strong>Contact:</strong></p>
          <ul>
            <li>Email: ${data.contact?.email || ''}</li>
            <li>LinkedIn: ${data.contact?.linkedin || ''}</li>
            <li>GitHub: ${data.contact?.github || ''}</li>
          </ul>
          <a 
            href="/assets/Pedro Reichow - Professional Resume.pdf" 
            download 
            class="download-resume-btn"
          >
            Download Resume
          </a>
        `;
      case 'Education':
        return `
          <h3>${data.id}</h3>
          <p><strong>${data.degree}</strong></p>
          <p>${data.years}</p>
        `;
      case 'Experience':
        return `
          <h3>${data.id}</h3>
          <p><strong>${data.title}</strong></p>
          <p>${data.years}</p>
          ${data.responsibilities ? `
            <p><strong>Responsibilities:</strong></p>
            <ul>
              ${data.responsibilities.map((resp: string) => `<li>${resp}</li>`).join('')}
            </ul>
          ` : ''}
          ${data.technologies ? `
            <div class="technologies">
              Technologies: ${data.technologies.join(', ')}
            </div>
          ` : ''}
        `;
      case 'Skills':
      case 'Achievements':
      case 'Interests':
        return `
          <h3>${data.id}</h3>
          <ul>
            ${data.items?.map((item: string) => `<li>${item}</li>`).join('') || ''}
          </ul>
        `;
      case 'Profile':
        return `
          <h3>${data.id}</h3>
          <p>${data.description}</p>
        `;
      case 'Group':
        return `
          <h3>${data.id}</h3>
          <p>${data.description}</p>
        `;
      case 'Status':
        return `
          <h3>${data.id}</h3>
          <p>${data.description}</p>
        `;
      default:
        return `<h3>${data?.id || ''}</h3>`;
    }
  }
export default GraphComponent;
