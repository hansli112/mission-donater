import { makeClient } from '../_shared/sheets.js';

const NUM_COLS = ['id', '單價', '所需數量', '已募集', '剩餘數量'];

function castItem(row) {
  for (const col of NUM_COLS) if (row[col] !== undefined) row[col] = Number(row[col]);
  return row;
}

// GET /api/items — public
export async function onRequestGet({ env }) {
  try {
    const client = await makeClient(env);
    const rows = (await client.getAll('items')).map(castItem);
    rows.sort((a, b) => a.id - b.id);
    return json(rows);
  } catch (e) {
    return err(e);
  }
}

// POST /api/items — admin only
export async function onRequestPost({ request, env }) {
  try {
    const { 名稱, 短宣隊, 單價, 所需數量 } = await request.json();
    if (!名稱 || !短宣隊 || !單價 || 單價 <= 0 || !所需數量 || 所需數量 <= 0) {
      return json({ error: '請檢查名稱、短宣隊、單價或所需數量' }, 400);
    }

    const client = await makeClient(env);
    const existing = await client.getAll('items');
    if (existing.some(r => r['名稱'] === 名稱 && r['短宣隊'] === 短宣隊)) {
      return json({ error: '已存在相同物資與短宣隊的項目' }, 400);
    }

    const id = await client.nextId('items');
    await client.append('items', [id, 名稱, 短宣隊, 單價, 所需數量, 0, 所需數量]);
    return json({ ok: true });
  } catch (e) {
    return err(e);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function err(e) {
  console.error(e);
  return json({ error: 'internal error' }, 500);
}
