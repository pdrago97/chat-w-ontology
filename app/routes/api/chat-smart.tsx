import { json, type ActionFunction } from "@remix-run/node";

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
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [id, job] of jobs.entries()) {
    if (job.createdAt < fiveMinutesAgo) {
      jobs.delete(id);
    }
  }
};

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
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

    // Try fast response first (7 seconds timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    console.log(`[SMART-CHAT] Attempting fast response for: ${message.substring(0, 50)}...`);

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          ...headers,
          'User-Agent': 'Remix-Chat-Bot-Smart/1.0'
        },
        body: JSON.stringify({ message, language, history }),
        signal: controller.signal,
        keepalive: true
      });

      clearTimeout(timeoutId);
      const endTime = Date.now();
      console.log(`[SMART-CHAT] Fast response completed in ${endTime - startTime}ms`);

      const raw = await res.text();
      let reply = raw;

      try {
        const parsed = JSON.parse(raw);
        if (parsed.message) reply = parsed.message;
        else if (parsed.response) reply = parsed.response;
        else if (parsed.reply) reply = parsed.reply;
      } catch (e) {
        // Use raw text if JSON parsing fails
      }

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

// Background processing function
async function processJobInBackground(
  jobId: string, 
  message: string, 
  language: string, 
  history: any[], 
  webhookUrl: string, 
  headers: Record<string, string>
) {
  try {
    console.log(`[SMART-CHAT-ASYNC] Starting background processing for job ${jobId}`);
    
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        ...headers,
        'User-Agent': 'Remix-Chat-Bot-Smart-Async/1.0'
      },
      body: JSON.stringify({ message, language, history }),
      keepalive: true
    });

    const raw = await res.text();
    let reply = raw;

    try {
      const parsed = JSON.parse(raw);
      if (parsed.message) reply = parsed.message;
      else if (parsed.response) reply = parsed.response;
      else if (parsed.reply) reply = parsed.reply;
    } catch (e) {
      // Use raw text if JSON parsing fails
    }

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
      job.error = 'Processing failed. Please try asking your question again.';
      jobs.set(jobId, job);
    }
  }
}

// GET endpoint for polling job status
export const loader = async ({ request, params }: { request: Request, params: any }) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const jobId = pathParts[pathParts.length - 1]; // Get last part of path

  if (!jobId || jobId === 'poll') {
    return json({ error: 'Job ID is required' }, { status: 400 });
  }

  const job = jobs.get(jobId);
  if (!job) {
    return json({ error: 'Job not found or expired' }, { status: 404 });
  }

  if (job.status === 'completed') {
    // Clean up completed job
    jobs.delete(jobId);
    return json({
      status: 'completed',
      result: job.result
    });
  } else if (job.status === 'error') {
    // Clean up failed job
    jobs.delete(jobId);
    return json({
      status: 'error',
      error: job.error
    });
  } else {
    return json({
      status: 'processing'
    });
  }
};
