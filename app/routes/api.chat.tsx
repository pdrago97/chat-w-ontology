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

    // Debug logs
    console.log('N8N_WEBHOOK_URL:', N8N_WEBHOOK_URL);
    console.log('N8N_AUTH_KEY:', N8N_AUTH_KEY ? 'SET' : 'NOT SET');
    console.log('Environment N8N_WEBHOOK_URL:', process.env.N8N_WEBHOOK_URL ? 'SET' : 'NOT SET');
    console.log('Environment N8N_AUTH_KEY:', process.env.N8N_AUTH_KEY ? 'SET' : 'NOT SET');

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
      throw new Error(`N8N webhook failed: ${webhookResponse.status} ${webhookResponse.statusText}`);
    }

    const response = await webhookResponse.text();

    return json({ response });

  } catch (error) {
    console.error('Error in chat endpoint:', error);

    return json({
      error: "I apologize, but I encountered an error. Something is wrong with the application, please inform Pedro via LinkedIn https://www.linkedin.com/in/pedroreichow."
    }, { status: 500 });
  }
};



