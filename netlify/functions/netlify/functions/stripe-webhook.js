const https = require('https');
const crypto = require('crypto');

function verifyStripeSignature(payload, signature, secret) {
  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t=')).split('=')[1];
  const sig = parts.find(p => p.startsWith('v1=')).split('=')[1];
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSig = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
}

function updateSupabasePlan(email, plan) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ email, plan, plan_updated_at: new Date().toISOString() });
    const supabaseUrl = new URL(process.env.SUPABASE_URL);
    const req = https.request({
      hostname: supabaseUrl.hostname,
      path: '/rest/v1/rpc/update_user_plan',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  const sig = event.headers['stripe-signature'];
  if (!sig) return { statusCode: 400, body: 'Missing signature' };

  let stripeEvent;
  try {
    const valid = verifyStripeSignature(event.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    if (!valid) return { statusCode: 400, body: 'Invalid signature' };
    stripeEvent = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: `Webhook error: ${err.message}` };
  }

  const type = stripeEvent.type;
  const obj = stripeEvent.data?.object;

  try {
    if (type === 'checkout.session.completed' || type === 'invoice.payment_succeeded') {
      const email = obj.customer_email || obj.customer_details?.email;
      if (email) await updateSupabasePlan(email, 'core');
    }
    if (type === 'customer.subscription.deleted' || type === 'invoice.payment_failed') {
      const email = obj.customer_email;
      if (email) await updateSupabasePlan(email, 'free');
    }
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    return { statusCode: 500, body: 'Handler error' };
  }
};
