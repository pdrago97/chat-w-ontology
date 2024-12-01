import React, { useEffect, useRef } from "react";
import cytoscape from "cytoscape";

interface GraphData {
  nodes: Array<{
    id: string;
    type: string;
    [key: string]: any;
  }>;
  edges: Array<{
    source: string;
    target: string;
    relation: string;
  }>;
}

interface GraphComponentProps {
  graphData: GraphData;
}

const GraphComponent: React.FC<GraphComponentProps> = ({ graphData }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && graphData) {
      const cy = cytoscape({
        container: ref.current,
        elements: {
          nodes: graphData.nodes.map((node) => ({
            data: { 
              id: node.id,
              type: node.type,
              ...node // Include all other node properties
            }
          })),
          edges: graphData.edges.map((edge, index) => ({
            data: {
              id: `e${index}`, // Unique ID for each edge
              source: edge.source,
              target: edge.target,
              label: edge.relation
            }
          }))
        },
        style: [
          {
            selector: "node",
            css: {
              content: "data(id)",
              "text-valign": "center",
              "text-halign": "center",
              color: "#fff",
              "background-color": "#11479e",
              "text-wrap": "wrap",
              "text-max-width": "80px",
              height: "60px",
              width: "60px",
            },
          },
          {
            selector: "edge",
            css: {
              width: 2,
              "line-color": "#999",
              "curve-style": "bezier",
              "target-arrow-shape": "triangle",
              label: "data(label)",
              "text-rotation": "autorotate",
              "text-margin-y": -10,
            },
          },
        ],
        layout: {
          name: "cose",
          padding: 50,
          animate: false,
          nodeDimensionsIncludeLabels: true,
        },
      });
    }
  }, [graphData]);

  return <div ref={ref} style={{ width: "100%", height: "600px" }} />;
};

export default GraphComponent;