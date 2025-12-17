import { json, type ActionFunction } from "@remix-run/cloudflare";

// Simple test endpoint to verify queue system is working
export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });
  
  try {
    const body = await request.json();
    const { message } = body || {};

    // Return immediately with queue-style response
    return json({
      jobId: "test-" + Date.now(),
      status: 'queued',
      message: '🧪 Test queue response: Your message "' + message + '" would be processed in background',
      pollUrl: '/api/test-queue/status/test-123',
      isAsync: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in test queue endpoint:', error);
    return json({
      error: 'Test failed',
      status: 500
    }, { status: 500 });
  }
};
