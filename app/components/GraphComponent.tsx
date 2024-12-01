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

    const elements = {
      nodes: graphData.nodes.map((node: any) => ({
        data: {
          id: node.id,
          label: getNodeLabel(node),
          type: node.type,
          description: node.description,
          years: node.years || '',
          technologies: node.technologies || [],
          responsibilities: node.responsibilities || [],
          ...node
        },
        classes: node.type.toLowerCase()
      })),
      edges: graphData.edges.map((edge: any, index: number) => ({
        data: {
          id: `e${index}`,
          source: edge.source,
          target: edge.target,
          label: edge.relation
        }
      }))
    };

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: elements,
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '13px',
            'font-weight': '500',
            'font-family': 'Arial, sans-serif',
            'width': '300px',
            'height': '100px',
            'padding': '20px',
            'shape': 'roundrectangle',
            'text-wrap': 'wrap',
            'text-max-width': '280px',
            'border-width': '2px',
            'text-outline-width': '2px',
            'text-outline-color': '#fff',
            'text-outline-opacity': 1,
            'background-opacity': 0.95,
            'color': '#000'
          }
        },
        {
          selector: 'node.person',
          style: {
            'background-color': '#4CAF50',
            'border-color': '#2E7D32',
            'color': '#fff',
            'text-outline-color': '#4CAF50'
          }
        },
        {
          selector: 'node.education',
          style: {
            'background-color': '#2196F3',
            'border-color': '#1565C0',
            'color': '#fff',
            'text-outline-color': '#2196F3'
          }
        },
        {
          selector: 'node.experience',
          style: {
            'background-color': '#9C27B0',
            'border-color': '#6A1B9A',
            'color': '#fff',
            'text-outline-color': '#9C27B0'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#666',
            'target-arrow-color': '#666',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.5,
            'label': 'data(label)',
            'font-size': '11px',
            'text-rotation': 'autorotate',
            'text-margin-y': -10,
            'text-background-color': '#fff',
            'text-background-opacity': 0.9,
            'text-background-padding': '3px'
          }
        }
      ],
      layout: {
        name: 'cose',
        padding: 150,
        animate: true,
        nodeDimensionsIncludeLabels: true,
        randomize: false,
        nodeOverlap: 100,
        componentSpacing: 400,
        idealEdgeLength: 350,
        nodeRepulsion: () => 15000,
        gravity: 0.05,
        edgeElasticity: 0.1,
        spacingFactor: 2
      },
      wheelSensitivity: 0.2,
      minZoom: 0.3,
      maxZoom: 2
    });

    // Add tooltip functionality
    cyRef.current.on('mouseover', 'node', function(e: any) {
      const node = e.target;
      const data = node.data();
      
      const tooltip = document.createElement('div');
      tooltip.className = 'node-tooltip';
      tooltip.innerHTML = createTooltipContent(data);
      
      const pos = e.renderedPosition;
      tooltip.style.left = `${pos.x}px`;
      tooltip.style.top = `${pos.y - 10}px`;
      containerRef.current?.appendChild(tooltip);
      
      node.style({
        'border-width': '4px',
        'font-size': '14px',
        'z-index': 999
      });
    });

    cyRef.current.on('mouseout', 'node', function(e: any) {
      const tooltip = containerRef.current?.querySelector('.node-tooltip');
      if (tooltip) {
        tooltip.remove();
      }
      
      e.target.style({
        'border-width': '2px',
        'font-size': '13px'
      });
    });

    // Initial positioning
    cyRef.current.fit(undefined, 100);
    cyRef.current.zoom({
      level: 0.6,
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
          height: '100%',
          backgroundColor: '#ffffff',
          position: 'absolute',
          top: 0,
          left: 0
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
            font-size: 13px;
            transform: translate(-50%, -100%);
            line-height: 1.4;
          }
          .node-tooltip h3 {
            margin: 0 0 8px 0;
            font-size: 16px;
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
        <p><strong>Responsibilities:</strong></p>
        <ul>
          ${data.responsibilities.map((r: string) => `<li>${r}</li>`).join('')}
        </ul>
        <div class="technologies">
          <strong>Technologies:</strong> ${data.technologies.join(', ')}
        </div>
      `;
    default:
      return `<h3>${data.id}</h3>`;
  }
}

export default GraphComponent;