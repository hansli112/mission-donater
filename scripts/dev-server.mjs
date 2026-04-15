import fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import * as donateApi from '../functions/api/donate.js';
import * as itemsApi from '../functions/api/items.js';
import * as itemByIdApi from '../functions/api/items/[id].js';
import * as recordsApi from '../functions/api/records.js';
import * as recordByIdApi from '../functions/api/records/[id].js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const devVarsPath = path.join(rootDir, '.dev.vars');

loadDevVars(devVarsPath);

const { host, port } = parseCli(process.argv.slice(2));
const env = buildEnv();

if (!env.GCP_CLIENT_EMAIL || !env.GCP_PRIVATE_KEY || !env.SPREADSHEET_ID) {
  console.warn('[dev-server] Missing one or more required vars in .dev.vars: GCP_CLIENT_EMAIL, GCP_PRIVATE_KEY, SPREADSHEET_ID');
}

startServer({
  host,
  port,
  fetch: handleRequest,
});

console.log(`[dev-server] listening on http://${host}:${port}`);
if (host === '0.0.0.0') {
  console.log('[dev-server] LAN mode enabled. Use your machine LAN IP with this port from other devices.');
}

async function handleRequest(request) {
  const url = new URL(request.url);

  try {
    const apiResponse = await routeApi(url.pathname, request);
    if (apiResponse) return apiResponse;
    return await serveStatic(url.pathname);
  } catch (error) {
    console.error(error);
    return json({ error: error.message || 'Internal Server Error' }, 500);
  }
}

async function routeApi(pathname, request) {
  if (pathname === '/api/items') {
    if (request.method === 'GET' && itemsApi.onRequestGet) return itemsApi.onRequestGet({ env });
    if (request.method === 'POST' && itemsApi.onRequestPost) return itemsApi.onRequestPost({ request, env });
  }

  const itemMatch = pathname.match(/^\/api\/items\/(\d+)$/);
  if (itemMatch && request.method === 'DELETE' && itemByIdApi.onRequestDelete) {
    return itemByIdApi.onRequestDelete({ params: { id: itemMatch[1] }, request, env });
  }

  if (pathname === '/api/records') {
    if (request.method === 'GET' && recordsApi.onRequestGet) return recordsApi.onRequestGet({ env });
  }

  const recordMatch = pathname.match(/^\/api\/records\/(\d+)$/);
  if (recordMatch) {
    if (request.method === 'PUT' && recordByIdApi.onRequestPut) {
      return recordByIdApi.onRequestPut({ params: { id: recordMatch[1] }, request, env });
    }
    if (request.method === 'DELETE' && recordByIdApi.onRequestDelete) {
      return recordByIdApi.onRequestDelete({ params: { id: recordMatch[1] }, request, env });
    }
  }

  if (pathname === '/api/donate' && request.method === 'POST' && donateApi.onRequestPost) {
    return donateApi.onRequestPost({ request, env });
  }

  return null;
}

async function serveStatic(pathname) {
  let relativePath = pathname;
  if (relativePath === '/') relativePath = '/index.html';
  if (relativePath === '/admin') relativePath = '/admin.html';

  const filePath = safeJoin(publicDir, relativePath);
  if (!filePath) return text('Not Found', 404);

  try {
    const body = await fs.readFile(filePath);
    return new Response(body, {
      status: 200,
      headers: { 'Content-Type': contentType(filePath) },
    });
  } catch (error) {
    if (error.code === 'ENOENT') return text('Not Found', 404);
    throw error;
  }
}

function safeJoin(base, relativePath) {
  const resolvedPath = path.resolve(base, `.${relativePath}`);
  if (!resolvedPath.startsWith(base)) return null;
  return resolvedPath;
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.ico':
      return 'image/x-icon';
    default:
      return 'application/octet-stream';
  }
}

function parseCli(argv) {
  let host = process.env.APP_HOST || '127.0.0.1';
  let port = Number(process.env.APP_PORT || 8788);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--host' && argv[i + 1]) host = argv[++i];
    if (arg === '--port' && argv[i + 1]) port = Number(argv[++i]);
  }

  return { host, port };
}

function loadDevVars(filePath) {
  try {
    const raw = fsSync.readFileSync(filePath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;

      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      value = value
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'");

      if (!(key in process.env)) process.env[key] = value;
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function buildEnv() {
  return {
    GCP_CLIENT_EMAIL: process.env.GCP_CLIENT_EMAIL,
    GCP_PRIVATE_KEY: process.env.GCP_PRIVATE_KEY,
    SPREADSHEET_ID: process.env.SPREADSHEET_ID,
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function text(data, status = 200) {
  return new Response(data, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

function startServer({ host, port, fetch }) {
  const server = http.createServer(async (req, res) => {
    const origin = `http://${req.headers.host || `${host}:${port}`}`;
    const url = new URL(req.url || '/', origin);
    const body = await readBody(req);
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: body.length > 0 ? body : undefined,
    });

    const response = await fetch(request);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    const buffer = Buffer.from(await response.arrayBuffer());
    res.end(buffer);
  });

  server.listen(port, host);
  return server;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks.map(chunk => Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
}
