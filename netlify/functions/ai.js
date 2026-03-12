exports.handler = async (event) => {
if (event.httpMethod !== ‘POST’) {
return { statusCode: 405, body: ‘Method Not Allowed’ };
}

try {
const { prompt, max_tokens = 700 } = JSON.parse(event.body);

```
if (!prompt) {
  return {
    statusCode: 400,
    body: JSON.stringify({ error: 'No prompt provided' })
  };
}

const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: Math.min(max_tokens, 1000),
    messages: [{ role: 'user', content: prompt }]
  })
});

if (!response.ok) {
  const errText = await response.text();
  console.error('Anthropic API error:', errText);
  return {
    statusCode: 500,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ error: 'AI request failed', detail: errText })
  };
}

const data = await response.json();

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
console.error(‘AI function error:’, error);
return {
statusCode: 500,
headers: { ‘Content-Type’: ‘application/json’, ‘Access-Control-Allow-Origin’: ‘*’ },
body: JSON.stringify({ error: ‘AI request failed’, detail: error.message })
};
}
};
