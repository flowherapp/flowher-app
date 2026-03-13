const https = require('https');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    console.log('Body received:', event.body ? event.body.substring(0, 100) : 'EMPTY');

    const parsed = JSON.parse(event.body || '{}');
    const prompt = parsed.prompt;
    const max_tokens = parsed.max_tokens || 700;

    if (!prompt) {
      console.log('ERROR: No prompt in body');
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No prompt' }) };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.log('ERROR: No API key');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'No API key' }) };
    }

    console.log('Calling Anthropic API with prompt length:', prompt.length);

    const result = await new Promise((resolve, reject) => {
      const body = JSON.stringify({
        model: 'claude-haiku-20240307',
        max_tokens: Math.min(max_tokens, 1000),
        messages: [{ role: 'user', content: prompt }]
      });

      const req = https.request({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.by​​​​​​​​​​​​​​​​
