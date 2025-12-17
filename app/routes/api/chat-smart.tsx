import { json, type ActionFunction } from "@remix-run/cloudflare";

// Smart Chat API - Tries fast response first, falls back to async if needed
// This provides the best user experience without changing the frontend

interface ChatJob {
  id: string;
  status: 'processing' | 'completed' | 'error';
  result?: any;
  error?: string;
  createdAt: number;
}

// Use global variable to share jobs between routes (same as polling route)
declare global {
  var chatJobs: Map<string, ChatJob> | undefined;
}

if (!global.chatJobs) {
  global.chatJobs = new Map();
}

const jobs = global.chatJobs;

// Generate simple UUID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Cleanup old jobs
const cleanupJobs = () => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [id, job] of jobs.entries()) {
    if (job.createdAt < oneHourAgo) {
      jobs.delete(id);
    }
  }
};

// Background processing function
const processJobInBackground = async (
  jobId: string, 
  message: string, 
  language: string, 
  history: any[], 
  webhookUrl: string, 
  headers: Record<string, string>
) => {
  console.log(`[SMART-CHAT-ASYNC] Starting background processing for job ${jobId}`);
  
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        ...headers,
        'User-Agent': 'Remix-Chat-Smart-Async/1.0'
      },
      body: JSON.stringify({ message, language, history }),
      keepalive: true
    });

    if (!res.ok) {
      throw new Error(`N8N webhook failed: ${res.status}`);
    }

    const raw = await res.text();
    let out: any;
    try {
      out = JSON.parse(raw);
    } catch (e) {
      out = { reply: raw };
    }

    const reply = out?.reply ?? out?.message ?? out?.text ?? out?.answer ?? out?.response ?? (typeof out === 'string' ? out : raw);

    if (!reply || reply.trim() === '') {
      throw new Error('Empty response from N8N');
    }

    // Update job with result
    const job = jobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.result = {
        message: reply,
        sender: 'assistant',
        direction: 'incoming'
      };
      jobs.set(jobId, job);
      console.log(`[SMART-CHAT-ASYNC] Job ${jobId} completed successfully`);
    }

  } catch (error: any) {
    console.error(`[SMART-CHAT-ASYNC] Job ${jobId} failed:`, error.message);
    
    const job = jobs.get(jobId);
    if (job) {
      job.status = 'error';
      job.error = 'The AI system is currently experiencing high load. Please try again in a moment.';
      jobs.set(jobId, job);
    }
  }
};

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { message, language = 'en', history = [] } = await request.json();

    if (!message) {
      return json({ error: 'Message is required' }, { status: 400 });
    }

    // Clean up old jobs
    cleanupJobs();

    const webhookUrl = process.env.N8N_CHAT_WEBHOOK_URL ||
      'https://n8n-moveup-u53084.vm.elestio.app/webhook/9ba11544-5c4e-4f91-818a-08a4ecb596c5';

    const startTime = Date.now();

    // Headers setup
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    const apiKey = process.env.N8N_API_KEY || '3c8670c5abc5b1052101291e2aac2ebfee58808f4c7c53d98404f7dcbd774fceb8d8a6c338b7971a080492e7629d2da1fa2e12acd53329a491862e7d78458677';
    if (apiKey) {
      headers['x-n8n-api-key'] = apiKey;
    }

    const ragAuthKey = process.env.N8N_AUTH_KEY || '7f9e2a8b-4c1d-4e6f-9a3b-8d5c2e7f1a9c';
    if (ragAuthKey) {
      headers['RAG-Auth-Key'] = ragAuthKey;
    }

    const authHeader = process.env.N8N_CHAT_AUTH_HEADER;
    const authValue = process.env.N8N_CHAT_AUTH_VALUE;
    if (authHeader && authValue) headers[authHeader] = authValue;

    const basicUser = process.env.N8N_CHAT_BASIC_USER;
    const basicPass = process.env.N8N_CHAT_BASIC_PASS;
    if (basicUser && basicPass) {
      const b64 = Buffer.from(`${basicUser}:${basicPass}`).toString('base64');
      headers['Authorization'] = `Basic ${b64}`;
    }

    console.log(`[SMART-CHAT] Attempting fast response for: ${message.substring(0, 50)}...`);

    // Try fast response first (10 second timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          ...headers,
          'User-Agent': 'Remix-Chat-Smart-Fast/1.0'
        },
        body: JSON.stringify({ message, language, history }),
        signal: controller.signal,
        keepalive: true
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`N8N webhook failed: ${res.status}`);
      }

      const raw = await res.text();
      let out: any;
      try {
        out = JSON.parse(raw);
      } catch (e) {
        out = { reply: raw };
      }

      const reply = out?.reply ?? out?.message ?? out?.text ?? out?.answer ?? out?.response ?? (typeof out === 'string' ? out : raw);

      if (!reply || reply.trim() === '') {
        throw new Error('Empty response from N8N');
      }

      const endTime = Date.now();
      console.log(`[SMART-CHAT] Fast response completed in ${endTime - startTime}ms`);

      return json({
        message: reply,
        sender: 'assistant',
        direction: 'incoming'
      });

    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.log(`[SMART-CHAT] Fast response timed out, switching to async mode`);
        
        // Start background processing
        const jobId = generateId();
        const job: ChatJob = {
          id: jobId,
          status: 'processing',
          createdAt: Date.now()
        };

        jobs.set(jobId, job);
        processJobInBackground(jobId, message, language, history, webhookUrl, headers);

        // Return async response with polling instructions
        return json({
          message: "⏱️ This is a complex question that requires deep analysis. I'm processing it now and will have a comprehensive answer shortly. Please wait a moment...",
          sender: 'assistant',
          direction: 'incoming',
          isAsync: true,
          jobId: jobId,
          pollUrl: `/api/chat-smart/poll/${jobId}`
        });
      } else {
        throw error; // Re-throw non-timeout errors
      }
    }

  } catch (error) {
    console.error('Error in smart chat endpoint:', error);
    return json({
      message: "I apologize, but I encountered an error. Please try again or contact Pedro via LinkedIn: https://www.linkedin.com/in/pedroreichow",
      sender: 'assistant',
      direction: 'incoming'
    });
  }
};
