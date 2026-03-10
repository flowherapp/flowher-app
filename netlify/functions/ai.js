const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const authHeader = event.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { prompt, feature } = body;
  if (!prompt || !feature) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing prompt or feature' }) };
  }

  const systemPrompts = {
    email: `You are FlowHer's AI email assistant. You help professional women with ADHD draft clear, confident workplace emails. Be direct, professional, and empowering. Return only the email body.`,
    script: `You are FlowHer's conversation coach. Provide word-for-word scripts that are calm, clear, and self-advocating. Format as: Opening line, Key points, Closing.`,
    rsd: `You are FlowHer's RSD reality-check tool. 1. Validate the feeling in one sentence. 2. Offer one grounded reality check. 3. Give one concrete micro-action. Be warm but grounded.`,
    braindump: `You are FlowHer's brain dump processor. 1. Acknowledge what she offloaded. 2. Identify the top 3 most urgent items. 3. Suggest the ONE smallest next step.`,
    smallest_step: `You are FlowHer's Smallest Step Engine. Break the task to the absolute tiniest first action — 2 minutes or less. ONE micro-action. One sentence max.`,
  };

  const systemPrompt = systemPrompts[feature] || systemPrompts.email;

  const requestData = JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 600,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(requestData),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const text = parsed.content?.[0]?.text || '';
            resolve({
              statusCode: 200,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({ result: text }),
            });
          } catch {
            resolve({ statusCode: 500, body: JSON.stringify({ error: 'AI parse error' }) });
          }
        });
      }
    );
    req.on('error', () => resolve({ statusCode: 500, body: JSON.stringify({ error: 'AI request failed' }) }));
    req.write(requestData);
    req.end();
  });
};
