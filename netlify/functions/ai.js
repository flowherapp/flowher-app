const Anthropic = require(’@anthropic-ai/sdk’);

exports.handler = async (event) => {
// Only allow POST
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

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const message = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: Math.min(max_tokens, 1000), // cap at 1000
  messages: [{ role: 'user', content: prompt }],
});

return {
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  },
  body: JSON.stringify({
    content: message.content,
    result: message.content?.[0]?.text || '',
  }),
};
```

} catch (error) {
console.error(‘AI function error:’, error);
return {
statusCode: 500,
headers: { ‘Content-Type’: ‘application/json’ },
body: JSON.stringify({ error: ‘AI request failed’, detail: error.message }),
};
}
};
