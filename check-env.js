#!/usr/bin/env node

/**
 * Environment Variables Checker for Vercel Deployment
 * 
 * This script helps you verify that all required environment variables
 * are properly configured for the chat-w-ontology application.
 */

console.log('🔍 Environment Variables Check for chat-w-ontology');
console.log('='.repeat(60));

const requiredVars = [
  {
    name: 'OPENAI_API_KEY',
    description: 'OpenAI API key for chat functionality and PDF processing',
    required: true,
    example: 'sk-proj-...'
  }
];

const optionalVars = [
  {
    name: 'ANTHROPIC_API_KEY',
    description: 'Anthropic API key (optional, for future Claude integration)',
    required: false,
    example: 'sk-ant-...'
  },
  {
    name: 'NODE_ENV',
    description: 'Environment mode (production for Vercel)',
    required: false,
    example: 'production'
  }
];

let allGood = true;

console.log('\n📋 Required Environment Variables:');
console.log('-'.repeat(40));

requiredVars.forEach(envVar => {
  const value = process.env[envVar.name];
  const status = value ? '✅' : '❌';
  const maskedValue = value ? `${value.substring(0, 8)}...` : 'NOT SET';
  
  console.log(`${status} ${envVar.name}: ${maskedValue}`);
  console.log(`   Description: ${envVar.description}`);
  console.log(`   Example: ${envVar.example}`);
  console.log('');
  
  if (!value && envVar.required) {
    allGood = false;
  }
});

console.log('\n📋 Optional Environment Variables:');
console.log('-'.repeat(40));

optionalVars.forEach(envVar => {
  const value = process.env[envVar.name];
  const status = value ? '✅' : '⚪';
  const maskedValue = value ? (envVar.name.includes('KEY') ? `${value.substring(0, 8)}...` : value) : 'NOT SET';
  
  console.log(`${status} ${envVar.name}: ${maskedValue}`);
  console.log(`   Description: ${envVar.description}`);
  console.log(`   Example: ${envVar.example}`);
  console.log('');
});

console.log('\n🚀 Vercel Deployment Instructions:');
console.log('-'.repeat(40));

if (!allGood) {
  console.log('❌ Missing required environment variables!');
  console.log('\nTo fix this on Vercel:');
  console.log('1. Go to your Vercel dashboard');
  console.log('2. Select your chat-w-ontology project');
  console.log('3. Go to Settings → Environment Variables');
  console.log('4. Add the missing variables:');
  
  requiredVars.forEach(envVar => {
    if (!process.env[envVar.name]) {
      console.log(`   - ${envVar.name}: ${envVar.example}`);
    }
  });
  
  console.log('5. Redeploy your application');
} else {
  console.log('✅ All required environment variables are set!');
  console.log('Your application should work correctly on Vercel.');
}

console.log('\n💡 Tips:');
console.log('- Get your OpenAI API key from: https://platform.openai.com/api-keys');
console.log('- Make sure to set the environment variables for all environments (Production, Preview, Development)');
console.log('- After adding environment variables, trigger a new deployment');

console.log('\n' + '='.repeat(60));
