import { json, type LoaderFunction } from "@remix-run/node";

// This route handles polling for async job results
// URL format: /api.chat-smart.poll.[jobId]

interface ChatJob {
  id: string;
  status: 'processing' | 'completed' | 'error';
  result?: any;
  error?: string;
  createdAt: number;
}

// Use global variable to share jobs between routes
declare global {
  var chatJobs: Map<string, ChatJob> | undefined;
}

if (!global.chatJobs) {
  global.chatJobs = new Map();
}

export const loader: LoaderFunction = async ({ params }) => {
  const { jobId } = params;

  if (!jobId) {
    return json({ error: 'Job ID is required' }, { status: 400 });
  }

  const job = global.chatJobs!.get(jobId);
  if (!job) {
    return json({ error: 'Job not found or expired' }, { status: 404 });
  }

  if (job.status === 'completed') {
    // Clean up completed job
    global.chatJobs!.delete(jobId);
    return json({
      status: 'completed',
      result: job.result
    });
  } else if (job.status === 'error') {
    // Clean up failed job
    global.chatJobs!.delete(jobId);
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
