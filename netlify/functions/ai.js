export default async (request) => {
// Handle CORS preflight
if (request.method === ‘OPTIONS’) {
return new Response(null, {
status: 200,
headers: {
‘Access-Control-Allow-Origin’: ‘*’,
‘Access-Control-Allow-Headers’: ‘Content-Type’,
‘Access-Control-Allow-Methods’: ‘POST, OPTIONS’
}
});
}

if (request.method !== ‘POST’) {
return new Response(‘Method Not Allowed’, { status: 405 });
}

try {
const { prompt, max_tokens = 700 } = await request.json();

```
if (!prompt) {
  return new Response(JSON.stringify({ error: 'No prompt provided' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('ANTHROPIC_API_KEY not set');
  return new Response(JSON.stringify({ error: 'API key not configured' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: Math.min(max_tokens, 1000),
    messages: [{ role: 'user', content: prompt }]
  })
});

if (!anthropicRes.ok) {
  const errText = await anthropicRes.text();
  console.error('Anthropic API error:', errText);
  return new Response(JSON.stringify({ error: 'AI request failed', detail: errText }), {
    status: 500,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

const data = await anthropicRes.json();

return new Response(JSON.stringify({
  content: data.content,
  result: data.content?.[0]?.text || ''
}), {
  status: 200,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
});
```

} catch (error) {
console.error(‘AI function error:’, error.message);
return new Response(JSON.stringify({ error: ‘AI request failed’, detail: error.message }), {
status: 500,
headers: { ‘Content-Type’: ‘application/json’, ‘Access-Control-Allow-Origin’: ‘*’ }
});
}
};

export const config = { path: ‘/.netlify/functions/ai’ };
