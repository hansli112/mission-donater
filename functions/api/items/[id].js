import { makeClient } from '../../_shared/sheets.js';

// PUT /api/items/:id
export async function onRequestPut({ params, request, env }) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return json({ error: '無效的項目 ID' }, 400);

    const { 名稱, 短宣隊, 單價, 所需數量 } = await request.json();
    if (!名稱 || !短宣隊 || !單價 || 單價 <= 0 || !所需數量 || 所需數量 <= 0) {
      return json({ error: '請檢查名稱、短宣隊、單價或所需數量' }, 400);
    }

    const client = await makeClient(env);
    const items = await client.getAll('items');
    const item = items.find(r => Number(r['id']) === id);
    if (!item) return json({ error: '找不到對應的項目' }, 404);

    const raised = Number(item['已募集']);
    const newRemain = 所需數量 - raised;
    if (newRemain < 0) {
      return json({ error: `所需數量不能少於已募集數量（${raised}）` }, 400);
    }

    const row = await client.findRow('items', id);
    await client.updateRange(`items!B${row}:G${row}`, [名稱, 短宣隊, 單價, 所需數量, raised, newRemain]);

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: 'internal error' }, 500);
  }
}

// DELETE /api/items/:id
export async function onRequestDelete({ params, env }) {
  try {
    const id = parseInt(params.id);
    const client = await makeClient(env);
    const row = await client.findRow('items', id);
    await client.deleteRow('items', row);
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: e.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
