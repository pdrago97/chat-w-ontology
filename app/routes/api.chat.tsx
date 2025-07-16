import { json } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";

// Using OpenAI directly for better Vercel compatibility

// Import PDF processor with fallback
let queryVectorStore: ((query: string) => Promise<string>) | null = null;

// Initialize server-side modules function
async function initializeServerModules() {
  if (typeof window !== "undefined") return null;

  try {
    const pdfProcessor = await import("./pdfProcessor");
    return pdfProcessor.queryVectorStore;
  } catch (error) {
    console.warn("Server modules not available, using fallback");
    return null;
  }
}

// Server-side directory helper
function getServerPaths() {
  if (typeof window !== "undefined") return { __filename: "", __dirname: "" };

  try {
    const path = require("path");
    const { fileURLToPath } = require("url");
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    return { __filename, __dirname };
  } catch {
    return { __filename: "", __dirname: "" };
  }
}

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

// Initialize LLM client function
async function initializeLLMClient() {
  // Always use OpenAI directly for better reliability on Vercel
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not found");
    }

    const { OpenAI } = await import("openai");
    const llmClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    console.log("Using OpenAI directly for LLM calls");
    return { client: llmClient, usePortkey: false };
  } catch (error) {
    console.error("Failed to initialize OpenAI client:", error);
    throw new Error("LLM client initialization failed");
  }
}


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
  language?: 'en' | 'pt';
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
    const { message, systemPrompt, graphData, conversationHistory, language = 'en' }: ChatRequest = await request.json();
    const formattedGraph = formatGraphDataForLLM(graphData);

    // Initialize server modules if not already done
    if (!queryVectorStore) {
      queryVectorStore = await initializeServerModules();
    }

    // Get relevant resume content
    let resumeContent = "";
    if (queryVectorStore) {
      try {
        resumeContent = await queryVectorStore(message);
        console.log('Resume content for query:', resumeContent);
      } catch (error) {
        console.warn('Error querying vector store:', error);
        resumeContent = "Resume content not available";
      }
    } else {
      resumeContent = "Resume content not available - using knowledge graph only";
    }

    const messages = [
      {
        role: "system",
        content: `You are an AI assistant that answers questions about Pedro's professional profile.

${language === 'pt' ? 'IMPORTANTE: Responda SEMPRE em português brasileiro.' : 'IMPORTANT: Always respond in English.'}

You have access to two sources of information:
1. Resume Content (from PDF): ${resumeContent}
2. Knowledge Graph (structured data): ${formattedGraph}

Use BOTH sources to provide comprehensive answers. The knowledge graph contains structured information about Pedro's experience, skills, education, and projects. The resume content provides additional context and details.

When answering:
- Prioritize information from the knowledge graph for structured data (companies, roles, technologies, dates)
- Use resume content for additional context and details
- If information conflicts, prefer the knowledge graph as it's more up-to-date
- Only answer questions related to Pedro's professional background
${language === 'pt' ? '- Sempre responda em português brasileiro, mesmo que a pergunta seja em inglês' : '- Always respond in English, even if the question is in Portuguese'}

${systemPrompt}\n\n${GUARDRAILS}`
      },
      ...conversationHistory.map(msg => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.message
      })),
      { role: "user", content: message }
    ];

    // Initialize LLM client
    const { client: llmClient, usePortkey } = await initializeLLMClient();

    // Use LLM client (Portkey or OpenAI)
    const completion = await llmClient.chat.completions.create({
      messages,
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 500
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

    // Check if it's an API key issue
    if (error instanceof Error && error.message.includes("OPENAI_API_KEY")) {
      return json({
        error: "I apologize, but I encountered an error. Something is wrong with the application, please inform Pedro via LinkedIn https://www.linkedin.com/in/pedroreichow."
      }, { status: 500 });
    }

    return json({
      error: "I apologize, but I encountered an error. Something is wrong with the application, please inform Pedro via LinkedIn https://www.linkedin.com/in/pedroreichow."
    }, { status: 500 });
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

