'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

// Load .env without an extra dependency. Keep your CoinGlass key on the server.
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i < 1) continue;
    const key = trimmed.slice(0, i).trim();
    const value = trimmed.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

const PORT = Number(process.env.PORT || 3000);
const API_KEY = process.env.COINGLASS_API_KEY || '';
const BASE_URL = 'https://open-api-v4.coinglass.com';
const PUBLIC_DIR = path.join(__dirname, 'public');
const cache = new Map();
const CACHE_MS = 10_000;

const ALLOWED_RANGES = new Set(['12h', '24h', '3d', '7d', '30d', '90d', '180d', '1y']);
const ALLOWED_MODELS = new Set(['1', '2', '3']);
const ALLOWED_EXCHANGES = new Set(['Binance', 'OKX', 'Bybit', 'Bitget', 'Gate', 'KuCoin', 'MEXC']);

function send(res, status, body, contentType = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
  res.end(contentType.startsWith('application/json') ? JSON.stringify(body) : body);
}

function safeStaticPath(urlPath) {
  let pathname = decodeURIComponent(urlPath.split('?')[0]);
  if (pathname === '/') pathname = '/index.html';
  const resolved = path.resolve(PUBLIC_DIR, '.' + pathname);
  if (!resolved.startsWith(PUBLIC_DIR + path.sep) && resolved !== path.join(PUBLIC_DIR, 'index.html')) return null;
  return resolved;
}

async function getHeatmap(reqUrl, res) {
  if (!API_KEY) {
    return send(res, 503, {
      error: 'CoinGlass API key is not configured.',
      help: 'Create a .env file from .env.example and add your CoinGlass API key. Heatmap endpoints require an eligible API plan.',
      code: 'API_KEY_MISSING'
    });
  }

  const exchange = reqUrl.searchParams.get('exchange') || 'Binance';
  const symbol = (reqUrl.searchParams.get('symbol') || 'BTCUSDT').toUpperCase();
  const range = reqUrl.searchParams.get('range') || '24h';
  const model = reqUrl.searchParams.get('model') || '2';

  if (!ALLOWED_EXCHANGES.has(exchange)) return send(res, 400, { error: 'Unsupported exchange selection.' });
  if (!/^[A-Z0-9]{4,24}$/.test(symbol)) return send(res, 400, { error: 'Invalid trading symbol.' });
  if (!ALLOWED_RANGES.has(range)) return send(res, 400, { error: 'Unsupported range.' });
  if (!ALLOWED_MODELS.has(model)) return send(res, 400, { error: 'Unsupported heatmap model.' });

  const cacheKey = `${exchange}:${symbol}:${range}:${model}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return send(res, 200, { ...cached.payload, cached: true });
  }

  const endpoint = `/api/futures/liquidation/heatmap/model${model}`;
  const upstreamUrl = new URL(BASE_URL + endpoint);
  upstreamUrl.searchParams.set('exchange', exchange);
  upstreamUrl.searchParams.set('symbol', symbol);
  upstreamUrl.searchParams.set('range', range);

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: { 'CG-API-KEY': API_KEY, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    const raw = await upstream.text();
    let json;
    try { json = JSON.parse(raw); } catch { json = null; }

    if (!upstream.ok || !json || String(json.code) !== '0') {
      const upstreamMessage = json?.msg || json?.message || `CoinGlass returned HTTP ${upstream.status}`;
      const status = upstream.status === 401 || upstream.status === 403 ? 502 : (upstream.status === 429 ? 429 : 502);
      return send(res, status, {
        error: upstreamMessage,
        code: json?.code ?? upstream.status,
        help: 'Check that the API key is valid and your CoinGlass subscription allows the selected liquidation heatmap endpoint.'
      });
    }

    const payload = {
      source: 'CoinGlass API',
      exchange,
      symbol,
      range,
      model,
      fetchedAt: new Date().toISOString(),
      data: json.data,
    };
    cache.set(cacheKey, { at: Date.now(), payload });
    return send(res, 200, payload);
  } catch (error) {
    return send(res, 502, {
      error: error.name === 'TimeoutError' ? 'CoinGlass request timed out.' : 'Could not reach CoinGlass API.',
      help: 'Try again shortly and check your internet connection.'
    });
  }
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && requestUrl.pathname === '/api/health') {
    return send(res, 200, { ok: true, apiKeyConfigured: Boolean(API_KEY) });
  }
  if (req.method === 'GET' && requestUrl.pathname === '/api/heatmap') {
    return getHeatmap(requestUrl, res);
  }
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed.' });

  const filePath = safeStaticPath(requestUrl.pathname);
  if (!filePath) return send(res, 403, { error: 'Forbidden.' });
  fs.readFile(filePath, (error, contents) => {
    if (error) return send(res, 404, { error: 'Not found.' });
    const ext = path.extname(filePath).toLowerCase();
    const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
    send(res, 200, contents.toString(), types[ext] || 'application/octet-stream');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Liquidation Lens is running at http://localhost:${PORT}`);
  console.log(`CoinGlass API key: ${API_KEY ? 'configured' : 'not configured (demo mode only)'}`);
});
