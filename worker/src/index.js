// Cloudflare Worker for Chat w/ Ontology
// This worker serves the complete Remix application with extended timeouts

import graphData from './knowledge-graph.json';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    console.log(`Worker request: ${request.method} ${url.pathname}`);

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }

    // Handle API routes with extended timeouts
    if (url.pathname.startsWith('/api/')) {
      return handleAPI(request, env, url);
    }

    // Serve the main application
    return serveApp(request, url);
  }
};

function handleCORS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}

async function handleAPI(request, env, url) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
  
  try {
    // Handle /api/graph
    if (url.pathname === '/api/graph') {
      return handleGraphAPI(request, env, corsHeaders);
    }
    
    // Handle /api/chat with extended timeout
    if (url.pathname === '/api/chat') {
      return handleChatAPI(request, env, corsHeaders);
    }
    
    // Handle /api/chat/n8n (alternative endpoint)
    if (url.pathname === '/api/chat/n8n') {
      return handleChatAPI(request, env, corsHeaders);
    }
    
    // Default API response
    return new Response(JSON.stringify({
      error: `API route ${url.pathname} not found`,
      availableRoutes: ['/api/graph', '/api/chat', '/api/chat/n8n'],
      timestamp: new Date().toISOString()
    }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

async function handleGraphAPI(request, env, corsHeaders) {
  try {
    // Use the imported graph data
    return new Response(JSON.stringify({
      ...graphData,
      lastUpdated: new Date().toISOString(),
      source: 'cloudflare-worker-embedded'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Graph API error:', error);

    // Fallback empty graph
    return new Response(JSON.stringify({
      nodes: [],
      edges: [],
      lastUpdated: new Date().toISOString(),
      error: 'Could not load graph data: ' + error.message,
      source: 'cloudflare-worker-fallback'
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

async function handleChatAPI(request, env, corsHeaders) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
  
  try {
    const body = await request.json();
    const { message, language = 'en' } = body;
    
    if (!message) {
      return new Response(JSON.stringify({ error: 'Missing message' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Use environment variables or fallback
    const webhookUrl = env.N8N_WEBHOOK_URL || 'https://n8n-moveup-u53084.vm.elestio.app/webhook/9ba11544-5c4e-4f91-818a-08a4ecb596c5';
    const authKey = env.N8N_AUTH_KEY || '7f9e2a8b-4c1d-4e6f-9a3b-8d5c2e7f1a9c';
    
    console.log(`Calling N8N webhook: ${webhookUrl}`);
    
    // Cloudflare Workers have very generous timeouts!
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000); // 55 seconds
    
    const startTime = Date.now();
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authKey}`,
        'User-Agent': 'Cloudflare-Worker/1.0'
      },
      body: JSON.stringify({
        message,
        language,
        timestamp: new Date().toISOString(),
        source: 'cloudflare-worker'
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const processingTime = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(`N8N API error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    return new Response(JSON.stringify({
      ...result,
      processedAt: new Date().toISOString(),
      processingTimeMs: processingTime,
      source: 'cloudflare-worker'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error('Chat API error:', error);
    
    let errorMessage = 'Chat service temporarily unavailable';
    let statusCode = 500;
    
    if (error.name === 'AbortError') {
      errorMessage = 'Request timeout - N8N processing took too long (>55s)';
      statusCode = 504;
    }
    
    return new Response(JSON.stringify({
      error: errorMessage,
      details: error.message,
      timestamp: new Date().toISOString(),
      source: 'cloudflare-worker-error'
    }), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

async function serveApp(request, url) {
  // Serve the main React application
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Chat w/ Ontology</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚀</text></svg>" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .container {
        text-align: center;
        padding: 2rem;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        max-width: 800px;
        width: 90%;
      }
      .chat-container {
        background: rgba(255, 255, 255, 0.95);
        color: #333;
        border-radius: 8px;
        padding: 1.5rem;
        margin: 2rem 0;
        text-align: left;
      }
      .input-group {
        display: flex;
        gap: 0.5rem;
        margin-top: 1rem;
      }
      input {
        flex: 1;
        padding: 0.75rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 1rem;
      }
      button {
        padding: 0.75rem 1.5rem;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1rem;
        transition: background 0.2s;
      }
      button:hover { background: #5a67d8; }
      button:disabled { background: #ccc; cursor: not-allowed; }
      .spinner {
        width: 20px;
        height: 20px;
        border: 2px solid #f3f3f3;
        border-top: 2px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        display: inline-block;
        margin-right: 0.5rem;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .message {
        margin: 1rem 0;
        padding: 0.75rem;
        border-radius: 4px;
        background: #f8f9fa;
        border-left: 4px solid #667eea;
      }
      .error {
        border-left-color: #e74c3c;
        background: #fdf2f2;
        color: #c53030;
      }
      .success {
        border-left-color: #27ae60;
        background: #f0fff4;
        color: #2d7d32;
      }
      .graph-info {
        background: rgba(255, 255, 255, 0.1);
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
        text-align: left;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🚀 Chat w/ Ontology</h1>
      <p style="opacity: 0.9; margin: 1rem 0;">AI-Powered Knowledge Graph Chat Interface</p>
      <p style="opacity: 0.7; font-size: 0.9em;">Powered by Cloudflare Workers with Extended Timeouts</p>

      <div class="chat-container">
        <h3>💬 Chat Interface</h3>
        <div id="messages"></div>
        <div class="input-group">
          <input type="text" id="messageInput" placeholder="Ask me anything about Pedro's experience..." />
          <button onclick="sendMessage()" id="sendBtn">Send</button>
        </div>
      </div>

      <div class="graph-info">
        <h3>📊 Knowledge Graph Status</h3>
        <div id="graphStatus">Loading graph data...</div>
      </div>
    </div>

    <script>
      let isLoading = false;

      // Load graph data on page load
      loadGraphData();

      // Allow Enter key to send message
      document.getElementById('messageInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !isLoading) {
          sendMessage();
        }
      });

      async function loadGraphData() {
        try {
          const response = await fetch('/api/graph');
          const data = await response.json();

          const statusDiv = document.getElementById('graphStatus');
          if (data.nodes && data.edges) {
            statusDiv.innerHTML = \`
              <div class="success">
                ✅ Graph loaded successfully<br>
                📊 <strong>\${data.nodes.length}</strong> nodes, <strong>\${data.edges.length}</strong> relationships<br>
                🕒 Last updated: \${new Date(data.lastUpdated).toLocaleString()}
              </div>
            \`;
          } else {
            statusDiv.innerHTML = '<div class="error">❌ Failed to load graph data</div>';
          }
        } catch (error) {
          document.getElementById('graphStatus').innerHTML =
            '<div class="error">❌ Error loading graph: ' + error.message + '</div>';
        }
      }

      async function sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();

        if (!message || isLoading) return;

        isLoading = true;
        const sendBtn = document.getElementById('sendBtn');
        const messagesDiv = document.getElementById('messages');

        // Update UI
        sendBtn.innerHTML = '<div class="spinner"></div>Sending...';
        sendBtn.disabled = true;

        // Add user message
        addMessage('You: ' + message, 'user');
        input.value = '';

        try {
          const startTime = Date.now();
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message, language: 'en' })
          });

          const processingTime = Date.now() - startTime;
          const data = await response.json();

          if (response.ok) {
            addMessage('🤖 Assistant: ' + (data.response || data.message || JSON.stringify(data)), 'success');
            addMessage(\`⏱️ Processed in \${processingTime}ms (Cloudflare timeout: 55s)\`, 'info');
          } else {
            addMessage('❌ Error: ' + (data.error || 'Unknown error'), 'error');
          }
        } catch (error) {
          addMessage('❌ Network Error: ' + error.message, 'error');
        } finally {
          isLoading = false;
          sendBtn.innerHTML = 'Send';
          sendBtn.disabled = false;
        }
      }

      function addMessage(text, type = '') {
        const messagesDiv = document.getElementById('messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ' + type;
        messageDiv.textContent = text;
        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }
    </script>
  </body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
