// Google Sheets client for Cloudflare Workers
// Env secrets required: GCP_CLIENT_EMAIL, GCP_PRIVATE_KEY, SPREADSHEET_ID

let _cachedToken = null;
let _tokenExpiry = 0;

function assertRequiredEnv(env) {
  const missing = ['GCP_CLIENT_EMAIL', 'GCP_PRIVATE_KEY', 'SPREADSHEET_ID']
    .filter((key) => !env?.[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required env vars: ${missing.join(', ')}. Set them in Cloudflare secrets or local .dev.vars.`,
    );
  }
}

export async function getAccessToken(env) {
  assertRequiredEnv(env);

  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: env.GCP_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }));

  const signingInput = `${header}.${claim}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(env.GCP_PRIVATE_KEY),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, strToBytes(signingInput));
  const jwt = `${signingInput}.${b64urlBuf(sig)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Failed to get access token: ' + JSON.stringify(data));

  _cachedToken = data.access_token;
  _tokenExpiry = Date.now() + 55 * 60 * 1000;
  return _cachedToken;
}

export async function makeClient(env) {
  assertRequiredEnv(env);
  const token = await getAccessToken(env);
  return new SheetsClient(token, env.SPREADSHEET_ID);
}

export class SheetsClient {
  constructor(token, spreadsheetId) {
    this.token = token;
    this.base = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  }

  async _req(path, opts = {}) {
    const res = await fetch(this.base + path, {
      ...opts,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...(opts.headers || {}),
      },
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Sheets API ${res.status}: ${text}`);
    return JSON.parse(text);
  }

  async getAll(sheet) {
    const d = await this._req(`/values/${ue(sheet)}`);
    if (!d.values || d.values.length < 2) return [];
    const [hdr, ...rows] = d.values;
    return rows.map(row => Object.fromEntries(hdr.map((h, i) => [h, row[i] ?? ''])));
  }

  async append(sheet, values) {
    await this._req(
      `/values/${ue(sheet)}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      { method: 'POST', body: JSON.stringify({ values: [values] }) },
    );
  }

  async updateRange(range, values) {
    await this._req(
      `/values/${ue(range)}?valueInputOption=RAW`,
      { method: 'PUT', body: JSON.stringify({ values: [values] }) },
    );
  }

  async findRow(sheet, id) {
    const d = await this._req(`/values/${ue(sheet)}!A:A`);
    const col = d.values || [];
    const idx = col.findIndex(([v]) => String(v) === String(id));
    if (idx === -1) throw new Error(`ID ${id} not found in ${sheet}`);
    return idx + 1; // 1-based row number
  }

  async sheetId(name) {
    const res = await fetch(`${this.base}?fields=sheets.properties`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    const d = await res.json();
    const s = d.sheets?.find(s => s.properties.title === name);
    if (!s) throw new Error(`Sheet "${name}" not found`);
    return s.properties.sheetId;
  }

  async deleteRow(sheet, rowNum) {
    const sid = await this.sheetId(sheet);
    await this._req(':batchUpdate', {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          deleteDimension: {
            range: { sheetId: sid, dimension: 'ROWS', startIndex: rowNum - 1, endIndex: rowNum },
          },
        }],
      }),
    });
  }

  async nextId(sheet) {
    const d = await this._req(`/values/${ue(sheet)}!A:A`);
    const ids = (d.values || []).slice(1).map(([v]) => parseInt(v)).filter(n => !isNaN(n));
    return ids.length ? Math.max(...ids) + 1 : 1;
  }
}

// helpers
function b64url(str) {
  return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function b64urlBuf(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function strToBytes(str) { return new TextEncoder().encode(str); }
function pemToDer(pem) {
  const normalizedPem = pem.replace(/\\n/g, '\n');
  const b64 = normalizedPem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}
function ue(s) { return encodeURIComponent(s); }
