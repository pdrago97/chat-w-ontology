#!/usr/bin/env node

/**
 * Test script to verify main application APIs are working
 */

import http from 'http';

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5173,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testMainApp() {
  console.log('🧪 Testing Main Application APIs...\n');

  try {
    // Test 1: Main page
    console.log('1. Testing main page...');
    const mainPage = await makeRequest('/');
    if (mainPage.statusCode === 200) {
      console.log('   ✅ Main page loads successfully');
    } else {
      console.log(`   ❌ Main page failed: ${mainPage.statusCode}`);
    }

    // Test 2: Graph API
    console.log('2. Testing graph API...');
    const graphApi = await makeRequest('/api/graph');
    if (graphApi.statusCode === 200) {
      const graphData = JSON.parse(graphApi.body);
      console.log(`   ✅ Graph API working - ${graphData.nodes?.length || 0} nodes, ${graphData.edges?.length || 0} edges`);
    } else {
      console.log(`   ❌ Graph API failed: ${graphApi.statusCode}`);
    }

    // Test 3: Chat API
    console.log('3. Testing chat API...');
    const chatData = {
      message: "What is Pedro's experience?",
      systemPrompt: "You are Pedro's assistant",
      graphData: { nodes: [], edges: [] },
      conversationHistory: []
    };
    
    const chatApi = await makeRequest('/api/chat', 'POST', chatData);
    if (chatApi.statusCode === 200) {
      const response = JSON.parse(chatApi.body);
      console.log('   ✅ Chat API working');
      console.log(`   💬 Response: ${response.response?.substring(0, 100)}...`);
    } else {
      console.log(`   ❌ Chat API failed: ${chatApi.statusCode}`);
      console.log(`   Error: ${chatApi.body}`);
    }

  } catch (error) {
    console.log(`❌ Error testing main app: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Main Application Test Suite');
  console.log('=' * 50);
  
  // Wait a moment for the server to be ready
  console.log('⏳ Waiting for server to be ready...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testMainApp();
  
  console.log('\n' + '=' * 50);
  console.log('🎯 Test completed! Check results above.');
}

main().catch(console.error);
