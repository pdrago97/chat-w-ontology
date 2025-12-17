#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Building for Cloudflare Pages...');

// Run the standard Remix build
execSync('npm run build', { stdio: 'inherit' });

// Create the _functions directory
const functionsDir = path.join(__dirname, '..', 'build', 'client', '_functions');
if (!fs.existsSync(functionsDir)) {
  fs.mkdirSync(functionsDir, { recursive: true });
}

// Create the catch-all function for Remix SSR
const functionContent = `// Cloudflare Pages Function for Remix SSR
import { createRequestHandler } from "@remix-run/cloudflare-pages";
import * as build from "../server/index.js";

export async function onRequest(context) {
  const { request, env, waitUntil } = context;
  
  const handleRequest = createRequestHandler({
    build,
    mode: "production",
    getLoadContext: () => ({ env, waitUntil }),
  });

  return handleRequest(request);
}`;

fs.writeFileSync(path.join(functionsDir, '[[path]].js'), functionContent);

// Copy server build to client directory
const serverSrc = path.join(__dirname, '..', 'build', 'server');
const serverDest = path.join(__dirname, '..', 'build', 'client', 'server');

if (fs.existsSync(serverSrc)) {
  // Remove existing server directory in client
  if (fs.existsSync(serverDest)) {
    fs.rmSync(serverDest, { recursive: true });
  }
  
  // Copy server build
  fs.cpSync(serverSrc, serverDest, { recursive: true });
}

console.log('✅ Cloudflare Pages build complete!');
console.log('📁 Deploy directory: build/client');
