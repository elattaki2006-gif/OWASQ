/**
 * Local development proxy server for AI API calls.
 * Replaces the need for Netlify CLI during local development.
 *
 * Usage:
 *   1. Create a .env file with your API key (see .env.example)
 *   2. Run: node dev-server.js
 *   3. The Angular dev-server proxy will forward AI requests here.
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Load .env ───────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌  Missing .env file. Copy .env.example to .env and add your API key.');
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    process.env[key] = value;
  }
}

loadEnv();

// ── Resolve provider ────────────────────────────────────────────────────────
const xaiApiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
const groqApiKey = process.env.GROQ_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

const apiKey = xaiApiKey || groqApiKey || openaiApiKey;
if (!apiKey) {
  console.error('❌  No API key found. Set OPENAI_API_KEY, GROQ_API_KEY, or XAI_API_KEY in .env');
  process.exit(1);
}

const provider = xaiApiKey ? 'xai' : groqApiKey ? 'groq' : 'openai';
const endpoint =
  provider === 'xai'
    ? 'https://api.x.ai/v1/chat/completions'
    : provider === 'groq'
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';
const model =
  provider === 'xai'
    ? process.env.XAI_MODEL || 'grok-2-latest'
    : provider === 'groq'
      ? process.env.GROQ_MODEL || 'llama-3.1-8b-instant'
      : process.env.OPENAI_MODEL || 'gpt-4o-mini';

console.log(`✅  Using ${provider.toUpperCase()} provider (model: ${model})`);

// ── HTTP server ─────────────────────────────────────────────────────────────
const PORT = 8888;

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST' || !req.url.includes('/.netlify/functions/grok')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  let body = '';
  req.on('data', chunk => (body += chunk));
  req.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      const prompt = parsed.prompt;

      if (!prompt) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing prompt' }));
        return;
      }

      const postData = JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      });

      const url = new URL(endpoint);
      const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const proxyReq = https.request(options, proxyRes => {
        let data = '';
        proxyRes.on('data', chunk => (data += chunk));
        proxyRes.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (proxyRes.statusCode !== 200) {
              res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                error: json.error?.message || `${provider.toUpperCase()} API error`
              }));
              return;
            }
            const text = json.choices?.[0]?.message?.content || 'No response generated.';
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ text }));
          } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to parse AI response' }));
          }
        });
      });

      proxyReq.on('error', err => {
        console.error('Proxy error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unable to connect to AI provider API' }));
      });

      proxyReq.write(postData);
      proxyReq.end();
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON body' }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀  Dev AI proxy running on http://localhost:${PORT}`);
  console.log(`    Handles POST /.netlify/functions/grok`);
});
