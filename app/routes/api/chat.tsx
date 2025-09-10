import { json, type ActionFunction, type LoaderFunction } from "@remix-run/node";

// Queue-based Chat API - Returns immediately, processes in background
// This completely bypasses Vercel's 10-second timeout limitation

interface ChatJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  message: string;
  language: string;
  history: any[];
  result?: string;
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

// Global job storage and processing queue
declare global {
  var chatJobs: Map<string, ChatJob> | undefined;
  var processingQueue: ChatJob[] | undefined;
  var isProcessing: boolean | undefined;
}

if (!global.chatJobs) {
  global.chatJobs = new Map();
}

if (!global.processingQueue) {
  global.processingQueue = [];
}

if (global.isProcessing === undefined) {
  global.isProcessing = false;
}

// Generate simple UUID
const generateJobId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Clean up old jobs (older than 10 minutes)
const cleanupJobs = () => {
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  for (const [id, job] of global.chatJobs!.entries()) {
    if (job.createdAt < tenMinutesAgo) {
      global.chatJobs!.delete(id);
    }
  }
};

// N8N processing function
const processN8NRequest = async (message: string, language: string, history: any[]): Promise<string> => {
  const webhookUrl = process.env.N8N_CHAT_WEBHOOK_URL ||
    'https://n8n-moveup-u53084.vm.elestio.app/webhook/9ba11544-5c4e-4f91-818a-08a4ecb596c5';

  const startTime = Date.now();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  const apiKey = process.env.N8N_API_KEY || '3c8670c5abc5b1052101291e2aac2ebfee58808f4c7c53d98404f7dcbd774fceb8d8a6c338b7971a080492e7629d2da1fa2e12acd53329a491862e7d78458677';
  if (apiKey) headers['x-n8n-api-key'] = apiKey;

  const ragAuthKey = process.env.N8N_AUTH_KEY || '7f9e2a8b-4c1d-4e6f-9a3b-8d5c2e7f1a9c';
  if (ragAuthKey) headers['RAG-Auth-Key'] = ragAuthKey;

  const authHeader = process.env.N8N_CHAT_AUTH_HEADER;
  const authValue = process.env.N8N_CHAT_AUTH_VALUE;
  if (authHeader && authValue) headers[authHeader] = authValue;

  const basicUser = process.env.N8N_CHAT_BASIC_USER;
  const basicPass = process.env.N8N_CHAT_BASIC_PASS;
  if (basicUser && basicPass) {
    const b64 = Buffer.from(`${basicUser}:${basicPass}`).toString('base64');
    headers['Authorization'] = `Basic ${b64}`;
  }

  console.log(`[QUEUE] Processing N8N request: ${message.substring(0, 50)}...`);

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      ...headers,
      'User-Agent': 'Remix-Chat-Queue/1.0'
    },
    body: JSON.stringify({ message, language, history }),
    keepalive: true
  });

  const endTime = Date.now();
  console.log(`[QUEUE] N8N request completed in ${endTime - startTime}ms`);

  const raw = await res.text();
  let out: any;
  try {
    out = JSON.parse(raw);
  } catch (e) {
    out = { reply: raw };
  }

  const reply = out?.reply ?? out?.message ?? out?.text ?? out?.answer ?? out?.response ?? (typeof out === 'string' ? out : raw);

  if (!reply || reply.trim() === '') {
    throw new Error('Empty response from N8N webhook');
  }

  return reply;
};

// Background processor function
const processQueue = async () => {
  if (global.isProcessing || global.processingQueue!.length === 0) {
    return;
  }

  global.isProcessing = true;
  console.log(`[QUEUE] Starting to process ${global.processingQueue!.length} jobs`);

  while (global.processingQueue!.length > 0) {
    const job = global.processingQueue!.shift()!;

    try {
      console.log(`[QUEUE] Processing job ${job.id}: ${job.message.substring(0, 50)}...`);

      // Update job status
      job.status = 'processing';
      job.startedAt = Date.now();
      global.chatJobs!.set(job.id, job);

      // Process the N8N request
      const result = await processN8NRequest(job.message, job.language, job.history);

      // Update job with result
      job.status = 'completed';
      job.result = result;
      job.completedAt = Date.now();
      global.chatJobs!.set(job.id, job);

      console.log(`[QUEUE] Job ${job.id} completed in ${job.completedAt - job.startedAt!}ms`);

    } catch (error: any) {
      console.error(`[QUEUE] Job ${job.id} failed:`, error.message);

      // Update job with error
      job.status = 'error';
      job.error = 'Failed to process your question. Please try again.';
      job.completedAt = Date.now();
      global.chatJobs!.set(job.id, job);
    }
  }

  global.isProcessing = false;
  console.log(`[QUEUE] Queue processing completed`);
};

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });

  try {
    const body = await request.json();
    const { message, language = 'en', history = [] } = body || {};

    if (!message || typeof message !== 'string') {
      return json({ error: 'Missing message' }, { status: 400 });
    }

    // Clean up old jobs
    cleanupJobs();

    // Create new job
    const jobId = generateJobId();
    const job: ChatJob = {
      id: jobId,
      status: 'queued',
      message,
      language,
      history,
      createdAt: Date.now()
    };

    // Store job and add to queue
    global.chatJobs!.set(jobId, job);
    global.processingQueue!.push(job);

    console.log(`[QUEUE] Job ${jobId} queued. Queue length: ${global.processingQueue!.length}`);

    // Start processing queue (non-blocking)
    processQueue().catch(console.error);

    // Return immediately with job info
    return json({
      jobId,
      status: 'queued',
      message: '🤖 Your question is being processed by Pedro\'s AI assistant. This may take a moment for complex queries...',
      pollUrl: `/api/chat/status/${jobId}`,
      isAsync: true
    });

  } catch (error) {
    console.error('Error in queue chat endpoint:', error);
    return json({
      error: 'Failed to queue your request. Please try again.',
      status: 500
    }, { status: 500 });
  }
};

// GET endpoint for polling job status
export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const jobId = pathParts[pathParts.length - 1]; // Get job ID from URL

  if (!jobId || jobId === 'chat') {
    return json({ error: 'Job ID is required' }, { status: 400 });
  }

  const job = global.chatJobs!.get(jobId);
  if (!job) {
    return json({ error: 'Job not found or expired' }, { status: 404 });
  }

  if (job.status === 'completed') {
    // Clean up completed job and return result
    global.chatJobs!.delete(jobId);
    return json({
      status: 'completed',
      message: job.result,
      sender: 'assistant',
      direction: 'incoming'
    });
  } else if (job.status === 'error') {
    // Clean up failed job and return error
    global.chatJobs!.delete(jobId);
    return json({
      status: 'error',
      message: job.error || 'Processing failed. Please try again.',
      sender: 'assistant',
      direction: 'incoming'
    });
  } else {
    // Still processing
    return json({
      status: job.status,
      message: job.status === 'processing' ?
        '🔄 Processing your question about Pedro...' :
        '⏳ Your question is queued for processing...'
    });
  }
};

