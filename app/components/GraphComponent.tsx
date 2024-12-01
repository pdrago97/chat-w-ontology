import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';

interface GraphComponentProps {
  graphData: any;
}

const GraphComponent: React.FC<GraphComponentProps> = ({ graphData }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || !graphData) return;

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    cyRef.current = cytoscape({
        container: containerRef.current,
        elements: {
          nodes: graphData.nodes.map((node: any) => ({
            data: { ...node, label: getNodeLabel(node) },
            classes: node.type.toLowerCase()
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
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'text-wrap': 'wrap',
            'text-max-width': '2000px',
            'font-size': '12px',
            'border-width': '1px',
            'padding': '15px',
            'shape': 'roundrectangle',
            'width': 'label',
            'height': 'label',
            'text-margin-y': '5px'
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
          selector: 'edge',
          style: {
            'width': 1,
            'line-color': '#999',
            'target-arrow-color': '#999',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '6px',
            'text-rotation': 'autorotate',
            'text-margin-y': '-10px',
            'text-opacity': 0.8  // Added slight transparency

          }
        }
      ],
      layout: {
        name: 'cose',
        padding: 100,
        nodeRepulsion: 100000000,     // Increased from 8000
        idealEdgeLength: 200,     // Increased for more spacing
        nodeOverlap: 90000000,          // Prevent node overlap
        gravity: 2,             // Slightly increased
        edgeElasticity: 4,
        spacingFactor: 9.5,       // Increased from 2
        randomize: false,          // Enable randomization
        componentSpacing: 0.000000000000000001,    // Added component spacing
        refresh: 20,              // Refresh rate during layout
        fit: true,
        stop: function() {
          cyRef.current.center();
          cyRef.current.fit();
        }
      },
      minZoom: 0.2,              // Allow more zoom out
      maxZoom: 3,
      wheelSensitivity: 0.2
    });

    // Add click event for nodes
    cyRef.current.on('tap', 'node', function(e: any) {
      const node = e.target;
      const data = node.data();
      
      // Remove any existing tooltips
      const existingTooltip = containerRef.current?.querySelector('.node-tooltip');
      if (existingTooltip) {
        existingTooltip.remove();
      }
      
      // Create and position new tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'node-tooltip';
      tooltip.innerHTML = createTooltipContent(data);
      
      const pos = e.renderedPosition;
      tooltip.style.left = `${pos.x}px`;
      tooltip.style.top = `${pos.y - 10}px`;
      containerRef.current?.appendChild(tooltip);
      
      // Highlight selected node

    });

    // Close tooltip when clicking on background
    cyRef.current.on('tap', function(e: any) {
      if (e.target === cyRef.current) {
        const tooltip = containerRef.current?.querySelector('.node-tooltip');
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
    <>
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height: '100vh',
          backgroundColor: '#ffffff'
        }} 
      />
      <style>
        {`
.node-tooltip {
  position: absolute;
  background: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 12px 16px;
  max-width: 400px;
  z-index: 1000;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  font-size: 11px;
  transform: translate(-50%, -100%);
  line-height: 1.4;
  pointer-events: auto;
  cursor: text;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
}
          .node-tooltip h3 {
            margin: 0 0 8px 0;
            font-size: 11px;
            font-weight: 600;
            color: #333;
          }
          .node-tooltip p {
            margin: 6px 0;
            color: #444;
          }
          .node-tooltip ul {
            margin: 8px 0;
            padding-left: 20px;
            color: #555;
          }
          .node-tooltip .technologies {
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid #eee;
            font-style: italic;
            color: #666;
          }
        `}
      </style>
    </>
  );
};

function getNodeLabel(node: any): string {
  switch (node.type) {
    case 'Person':
      return `${node.id}\n${node.title}`;
    case 'Education':
      return `${node.id}\n${node.degree}\n${node.years}`;
    case 'Experience':
      return `${node.id}\n${node.title}\n${node.years}`;
    default:
      return node.id;
  }
}

function createTooltipContent(data: any): string {
  switch (data.type) {
    case 'Person':
      return `
        <h3>${data.id}</h3>
        <p><strong>${data.title}</strong></p>
        <p>${data.location}</p>
        <p><strong>Contact:</strong></p>
        <ul>
          <li>Email: ${data.contact.email}</li>
          <li>LinkedIn: ${data.contact.linkedin}</li>
          <li>GitHub: ${data.contact.github}</li>
        </ul>
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
    default:
      return `<h3>${data.id}</h3>`;
  }
}

export default GraphComponent;