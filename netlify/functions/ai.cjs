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
        model: process.env.ANTHROPIC_MODEL,
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
          console.log('Anthropic status:', res.statusCode);
          console.log('Anthropic response:', data.substring(0, 200));
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch(e) { reject(new Error('Parse error: ' + data)); }
        });
      });

      req.on('error', (e) => {
        console.log('Request error:', e.message);
        reject(e);
      });
      req.write(body);
      req.end();
    });

    if (result.status !== 200) {
      console.log('API error:', JSON.stringify(result.body));
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'AI failed', detail: JSON.stringify(result.body) }) };
    }

    const text = result.body.content[0].text;
    console.log('Success, response length:', text.length);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ result: text })
    };

  } catch (error) {
    console.log('Caught error:', error.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
