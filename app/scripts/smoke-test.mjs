const apiBase = (process.env.SMOKE_API_BASE || process.env.VITE_API_BASE || '').replace(/\/$/, '');
const frontendUrl = (process.env.SMOKE_FRONTEND_URL || '').replace(/\/$/, '');
const origin = process.env.SMOKE_ORIGIN || frontendUrl || 'https://crystalfield101.com';

const checks = [];

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`${name} is required`);
  }
}

async function checkJson(name, url, expectedStatus, validate) {
  const res = await fetch(url, { headers: { Origin: origin } });
  const body = await res.text();
  if (res.status !== expectedStatus) {
    throw new Error(`${name} expected HTTP ${expectedStatus}, got ${res.status}: ${body.slice(0, 240)}`);
  }
  let json;
  try {
    json = JSON.parse(body);
  } catch {
    throw new Error(`${name} did not return JSON: ${body.slice(0, 240)}`);
  }
  validate(json);
  checks.push(`${name}: ok`);
}

async function checkCorsPreflight() {
  const res = await fetch(`${apiBase}/api/checkout/create-order`, {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type, Authorization',
    },
  });
  if (!res.ok) {
    throw new Error(`CORS preflight expected 2xx, got ${res.status}`);
  }
  const allowOrigin = res.headers.get('access-control-allow-origin') || '';
  if (allowOrigin !== origin && allowOrigin !== '*') {
    throw new Error(`CORS preflight returned unexpected allow-origin: ${allowOrigin || '(empty)'}`);
  }
  checks.push('CORS preflight: ok');
}

async function checkFrontend() {
  if (!frontendUrl) return;
  const res = await fetch(frontendUrl);
  if (!res.ok) {
    throw new Error(`Frontend expected 2xx, got ${res.status}`);
  }
  const html = await res.text();
  if (!html.includes('<div id="root"')) {
    throw new Error('Frontend did not look like the Vite app shell');
  }
  checks.push('Frontend shell: ok');
}

requireEnv('SMOKE_API_BASE or VITE_API_BASE', apiBase);

await checkJson('Checkout catalog', `${apiBase}/api/checkout/catalog`, 200, (json) => {
  if (!json.catalog || json.catalog.tarot_monthly_600?.amount !== 600) {
    throw new Error('Checkout catalog payload is missing tarot_monthly_600 at NT$600');
  }
  const retiredTarotItems = ['tarot_three', 'tarot_celtic', 'tarot_pastlife', 'unicorns_three', 'dragons_three', 'osho_three', 'celtic_cross', 'cosmic_cross', 'egyptian_pastlife', 'three_card_5pack_30d', 'three_pastlife_3plus3_30d', 'deep_spread_5pack_30d', 'membership_monthly'];
  if (retiredTarotItems.some((id) => json.catalog[id])) {
    throw new Error('Checkout catalog still exposes a retired tarot payment item');
  }
});
await checkCorsPreflight();
await checkFrontend();

console.log(checks.join('\n'));
