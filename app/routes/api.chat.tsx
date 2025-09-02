import { json } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";

// Using n8n webhook for RAG processing

// N8N webhook configuration
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "https://n8n-moveup-u53084.vm.elestio.app/webhook/9ba11544-5c4e-4f91-818a-08a4ecb596c5";
const N8N_AUTH_KEY = process.env.N8N_AUTH_KEY || "7f9e2a8b-4c1d-4e6f-9a3b-8d5c2e7f1a9c";


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

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { message, language = 'en' }: ChatRequest = await request.json();

    // Call n8n webhook with the message
    const webhookResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'RAG-Auth-Key': N8N_AUTH_KEY
      },
      body: JSON.stringify({
        message,
        language
      })
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('N8N webhook error:', webhookResponse.status, errorText);
      throw new Error(`N8N webhook failed: ${webhookResponse.status} - ${errorText}`);
    }

    const responseText = await webhookResponse.text();

    return json({
      message: responseText,
      sender: "assistant" as const,
      direction: "incoming" as const
    });

  } catch (error) {
    console.error('Error in chat endpoint:', error);

    return json({
      error: "I apologize, but I encountered an error. Something is wrong with the application, please inform Pedro via LinkedIn https://www.linkedin.com/in/pedroreichow."
    }, { status: 500 });
  }
};



