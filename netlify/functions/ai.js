const https = require(‘https’);

function callAnthropic(apiKey, prompt, maxTokens) {
return new Promise((resolve, reject) => {
const body = JSON.stringify({
model: ‘claude-haiku-4-5-20251001’,
max_tokens: Math.min(maxTokens, 1000),
messages: [{ role: ‘user’, content: prompt }]
});

```
const options = {
  hostname: 'api.anthropic.com',
  path: '/v1/messages',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (res.statusCode !== 200) {
        reject(new Error(`API error ${res.statusCode}: ${data}`));
      } else {
        resolve(parsed);
      }
    } catch (e) {
      reject(new Error('Failed to parse response: ' + data));
    }
  });
});

req.on('error', reject);
req.write(body);
req.end();
```

});
}

exports.handler = async (event) => {
// Handle CORS preflight
if (event.httpMethod === ‘OPTIONS’) {
return {
statusCode: 200,
headers: {
‘Access-Control-Allow-Origin’: ‘*’,
‘Access-Control-Allow-Headers’: ‘Content-Type’,
‘Access-Control-Allow-Methods’: ‘POST, OPTIONS’
},
body: ‘’
};
}

if (event.httpMethod !== ‘POST’) {
return { statusCode: 405, body: ‘Method Not Allowed’ };
}

try {
const { prompt, max_tokens = 700 } = JSON.parse(event.body);

```
if (!prompt) {
  return {
    statusCode: 400,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ error: 'No prompt provided' })
  };
}

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('ANTHROPIC_API_KEY not set');
  return {
    statusCode: 500,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ error: 'API key not configured' })
  };
}

const data = await callAnthropic(apiKey, prompt, max_tokens);

return {
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  },
  body: JSON.stringify({
    content: data.content,
    result: data.content?.[0]?.text || ''
  })
};
```

} catch (error) {
console.error(‘AI function error:’, error.message);
return {
statusCode: 500,
headers: { ‘Content-Type’: ‘application/json’, ‘Access-Control-Allow-Origin’: ‘*’ },
body: JSON.stringify({ error: ‘AI request failed’, detail: error.message })
};
}
};
