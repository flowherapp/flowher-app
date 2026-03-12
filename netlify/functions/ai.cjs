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
    const { prompt, max_tokens = 700 } = JSON.parse(event.body || '{}');

    if (!prompt) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No prompt' }) };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'No API key' }) };
    }

    const result = await new Promise((resolve, reject) => {
      const body = JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: Math.min(max_tokens, 1000),
        messages: [{ role: 'user', content: prompt }]
      });

      const req = https.request({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch(e) { reject(new Error('Parse error: ' + data)); }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });

    if (result.status !== 200) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'AI failed', detail: JSON.stringify(result.body) }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ result: result.body.content[0].text })
    };

  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
