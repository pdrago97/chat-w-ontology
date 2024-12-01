import { json } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";

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

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { message, systemPrompt, graphData, conversationHistory }: ChatRequest = await request.json();

    // Format the knowledge graph data for better context
    const formattedGraph = formatGraphDataForLLM(graphData);

    const messages = [
      {
        role: "system",
        content: `${systemPrompt}\n\nKnowledge Graph Data:\n${formattedGraph}`
      },
      ...conversationHistory.map(msg => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.message
      })),
      { role: "user", content: message }
    ];

    // Make API call to your preferred LLM service
    // Example with OpenAI (you'll need to add the openai package and configure API key)
    // const completion = await openai.chat.completions.create({
    //   model: "gpt-4",
    //   messages: messages,
    //   temperature: 0.7,
    //   max_tokens: 500
    // });
    // return json({ response: completion.choices[0].message.content });

    // For now, return a mock response
    return json({ 
      response: `Based on the knowledge graph, I can tell you about Pedro's experience. What specific aspect would you like to know about?` 
    });

  } catch (error) {
    console.error('Error in chat endpoint:', error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
};

function formatGraphDataForLLM(graphData: any): string {
  let formatted = "";

  // Format Person data
  const person = graphData.nodes.find((n: any) => n.type === "Person");
  formatted += `Person Information:\n`;
  formatted += `Name: ${person.id}\n`;
  formatted += `Title: ${person.title}\n`;
  formatted += `Location: ${person.location}\n\n`;

  // Format Education
  formatted += "Education:\n";
  graphData.nodes
    .filter((n: any) => n.type === "Education")
    .forEach((edu: any) => {
      formatted += `- ${edu.degree} at ${edu.id} (${edu.years})\n`;
    });
  formatted += "\n";

  // Format Experience
  formatted += "Professional Experience:\n";
  graphData.nodes
    .filter((n: any) => n.type === "Experience")
    .forEach((exp: any) => {
      formatted += `\n${exp.id} - ${exp.title} (${exp.years})\n`;
      if (exp.responsibilities) {
        formatted += "Responsibilities:\n";
        exp.responsibilities.forEach((resp: string) => {
          formatted += `- ${resp}\n`;
        });
      }
      if (exp.technologies) {
        formatted += `Technologies: ${exp.technologies.join(", ")}\n`;
      }
    });

  return formatted;
}