import { json, type ActionFunction } from "@remix-run/cloudflare";

// Async Chat API - Workaround for Vercel 10s timeout limit
// Returns immediately with job ID, frontend polls for results

interface ChatJob {
  id: string;
  status: 'processing' | 'completed' | 'error';
  message?: string;
  result?: any;
  error?: string;
  createdAt: number;
}

// In-memory storage for jobs (in production, use Redis/Database)
const jobs = new Map<string, ChatJob>();

// Cleanup old jobs (older than 5 minutes)
const cleanupJobs = () => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [id, job] of jobs.entries()) {
    if (job.createdAt < fiveMinutesAgo) {
      jobs.delete(id);
    }
  }
};

// Generate simple UUID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
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

    // Create new job
    const jobId = generateId();
    const job: ChatJob = {
      id: jobId,
      status: 'processing',
      message,
      createdAt: Date.now()
    };

    jobs.set(jobId, job);

    // Start background processing (don't await)
    processJobInBackground(jobId, message, language, history);

    // Return immediately with job ID
    return json({
      jobId,
      status: 'processing',
      message: '🤖 Starting to process your question about Pedro...'
    });

  } catch (error) {
    console.error('Error in async chat endpoint:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

// Background processing function
async function processJobInBackground(jobId: string, message: string, language: string, history: any[]) {
  const job = jobs.get(jobId);
  if (!job) return;

  try {
    // N8N webhook configuration
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

    console.log(`[N8N-ASYNC] Starting request for job ${jobId}`);

    // Make request without timeout constraints
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        ...headers,
        'User-Agent': 'Remix-Chat-Bot-Async/1.0'
      },
      body: JSON.stringify({ message, language, history }),
      keepalive: true
    });

    const endTime = Date.now();
    console.log(`[N8N-ASYNC] Job ${jobId} completed in ${endTime - startTime}ms`);

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

    // Update job with result
    const updatedJob = jobs.get(jobId);
    if (updatedJob) {
      updatedJob.status = 'completed';
      updatedJob.result = {
        message: reply,
        sender: 'assistant',
        direction: 'incoming'
      };
      jobs.set(jobId, updatedJob);
    }

  } catch (error: any) {
    console.error(`[N8N-ASYNC] Job ${jobId} failed:`, error.message);
    
    const updatedJob = jobs.get(jobId);
    if (updatedJob) {
      updatedJob.status = 'error';
      updatedJob.error = 'The AI system is currently experiencing high load. Please try again in a moment.';
      jobs.set(jobId, updatedJob);
    }
  }
}

// GET endpoint to check job status
export const loader = async ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  const jobId = url.searchParams.get('jobId');

  if (!jobId) {
    return json({ error: 'Job ID is required' }, { status: 400 });
  }

  const job = jobs.get(jobId);
  if (!job) {
    return json({ error: 'Job not found' }, { status: 404 });
  }

  // Return job status
  if (job.status === 'completed') {
    return json({
      status: 'completed',
      result: job.result
    });
  } else if (job.status === 'error') {
    return json({
      status: 'error',
      error: job.error
    });
  } else {
    return json({
      status: 'processing',
      message: '🔄 Processing your question...'
    });
  }
};
