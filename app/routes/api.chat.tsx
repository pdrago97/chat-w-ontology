import { json } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";
import { Portkey } from "portkey-ai";
import { queryVectorStore } from './pdfProcessor';

interface GraphNode {
  id: string;
  type: 'Person' | 'Experience' | 'Education' | 'Profile' | 'Skills' | 'Achievements' | 'Interests';
  title?: string;
  location?: string;
  contact?: {
    email: string;
    linkedin: string;
    github: string;
  };
  years?: string;
  responsibilities?: string[];
  technologies?: string[];
  degree?: string;
  description?: string;
  items?: string[];
}

interface GraphData {
  nodes: GraphNode[];
}

function formatGraphDataForLLM(graphData: GraphData): string {
  let formattedText = '';
  
  // Format nodes
  if (graphData.nodes) {
    formattedText += 'Entities:\n\n';
    graphData.nodes.forEach((node: any) => {
      formattedText += `${node.id} (${node.type}):\n`;
      
      // Handle different node types
      switch (node.type) {
        case 'Person':
          formattedText += `- Title: ${node.title}\n`;
          formattedText += `- Location: ${node.location}\n`;
          if (node.contact) {
            formattedText += `- Contact:\n`;
            formattedText += `  * Email: ${node.contact.email}\n`;
            formattedText += `  * LinkedIn: ${node.contact.linkedin}\n`;
            formattedText += `  * GitHub: ${node.contact.github}\n`;
          }
          break;
        case 'Experience':
          formattedText += `- Title: ${node.title}\n`;
          formattedText += `- Years: ${node.years}\n`;
          if (node.responsibilities) {
            formattedText += '- Responsibilities:\n';
            node.responsibilities.forEach((resp: string) => {
              formattedText += `  * ${resp}\n`;
            });
          }
          if (node.technologies) {
            formattedText += `- Technologies: ${node.technologies.join(', ')}\n`;
          }
          break;
        case 'Education':
          formattedText += `- Degree: ${node.degree}\n`;
          formattedText += `- Years: ${node.years}\n`;
          break;
        case 'Profile':
          formattedText += `- Description: ${node.description}\n`;
          break;
        case 'Skills':
        case 'Achievements':
        case 'Interests':
          formattedText += '- Items:\n';
          node.items?.forEach((item: string) => {
            formattedText += `  * ${item}\n`;
          });
          break;
      }
      formattedText += '\n';
    });
  }

  // Rest of the function remains the same
  if (graphData.edges) {
    formattedText += 'Relationships:\n\n';
    graphData.edges.forEach((edge: any) => {
      formattedText += `${edge.source} ${edge.relation} ${edge.target}\n`;
    });
  }

  return formattedText;
}

console.log(process.env.PORTKEY_API_KEY)
console.log(process.env.OPENAI_API_KEY)


const portkey = new Portkey({
  apiKey: process.env.PORTKEY_API_KEY,
  virtualKey: "open-ai-virtual-e16edd"
})


interface Message {
  message: string;
  sender: "user" | "assistant";
  direction: "incoming" | "outgoing";
}

interface ChatRequest {
  message: string;
  systemPrompt: string;
  graphData: any;
  conversationHistory: Message[];
}

const GUARDRAILS = `
You are an AI assistant focused solely on providing information about Pedro's professional background.
You must:
1. Only answer questions related to Pedro's:
   - Work experience and responsibilities
   - Education
   - Technical skills
   - Soft Skills
   - Future Interests
   - Professional achievements
2. Use information from BOTH the knowledge graph AND the resume content provided
3. If asked about anything outside of Pedro's professional background, politely decline and redirect to professional topics
4. Keep responses concise and factual
5. Never make assumptions or add information not present in either the knowledge graph or resume

You must not:
1. Discuss personal matters
2. Make recommendations
3. Share opinions
4. Provide information not explicitly stated in the knowledge graph or resume
`;

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }
  try {
    const { message, systemPrompt, graphData, conversationHistory }: ChatRequest = await request.json();
    const formattedGraph = formatGraphDataForLLM(graphData);
    
    // Get relevant resume content
    const resumeContent = await queryVectorStore(message);
    console.log('Resume content for query:', resumeContent);

    const messages = [
      {
        role: "system", 
        content: `You are an AI assistant that answers questions based on Pedro's resume.
Use ONLY the following resume content to answer the question: ${resumeContent}

${systemPrompt}\n\n${GUARDRAILS}\n\nKnowledge Graph Data:\n${formattedGraph}`
      },
      ...conversationHistory.map(msg => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.message
      })),
      { role: "user", content: message }
    ];

    // Use Portkey to manage the LLM call
    const completion = await portkey.chat.completions.create({
      messages,
      model: "gpt-4o-mini", // or your preferred model
      temperature: 0.3, // Lower temperature for more focused responses
      max_tokens: 500,
      stop: ["I don't know", "I'm not sure"], // Prevent uncertain responses
      tools: [{
        type: "function",
        function: {
          name: "validateResponse",
          description: "Validates if the response contains only information from the knowledge graph",
          parameters: {
            type: "object",
            properties: {
              isValid: {
                type: "boolean",
                description: "Whether the response contains only valid information"
              },
              response: {
                type: "string",
                description: "The validated response"
              }
            },
            required: ["isValid", "response"]
          }
        }
      }]
    });

    const response = completion.choices[0].message.content;
    
    if (!isValidResponse(response)) {
      return json({ 
        response: "I can only provide information about Pedro's professional background. Could you please ask something about his work experience, education, or skills?" 
      });
    }

    return json({ response });

  } catch (error) {
    console.error('Error in chat endpoint:', error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
};

function isValidResponse(response: string): boolean {
  const professionalKeywords = [
    'experience', 'education', 'skills', 'soft skills', 'future interests', 'personal', 'work', 'project', 'technology',
    'responsibility', 'achievement', 'degree', 'professional', 'technical'
  ];
  
  return professionalKeywords.some(keyword => 
    response.toLowerCase().includes(keyword)
  );
}

