import { json } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";

// Pointing to Python Backend
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

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
    const { message, conversationHistory = [] }: ChatRequest = await request.json();

    const controller = new AbortController();
    // 30 seconds timeout for local backend
    const timeoutId = setTimeout(() => controller.abort(), 30000); 

    const backendResponse = await fetch(`${BACKEND_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        history: conversationHistory
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend chat error:', backendResponse.status, errorText);
      throw new Error(`Backend failed: ${backendResponse.status}`);
    }

    const data = await backendResponse.json();
    const responseText = data.response;

    return json({
      message: responseText,
      sender: "assistant" as const,
      direction: "incoming" as const
    });

  } catch (error: any) {
    console.error('Error in chat endpoint:', error);

    if (error.name === 'AbortError') {
      return json({
        error: "Request timed out. The backend might be starting up."
      }, { status: 408 });
    }

    return json({
      error: "Failed to connect to AI backend."
    }, { status: 500 });
  }
};



