import { makeClient } from '../../_shared/sheets.js';

// PUT /api/records/:id
export async function onRequestPut({ params, request, env }) {

  try {
    const recordId = parseInt(params.id, 10);
    if (isNaN(recordId)) return json({ error: '無效的記錄 ID' }, 400);

    const { 姓名, 物資, 短宣隊, 數量, 奉獻方式 } = await request.json();
    if (!姓名 || !物資 || !短宣隊 || !Number.isInteger(數量) || 數量 <= 0) {
      return json({ error: '請檢查姓名或數量' }, 400);
    }

    const client = await makeClient(env);
    const [items, records] = await Promise.all([
      client.getAll('items'),
      client.getAll('records'),
    ]);

    // read old values from Sheets — do not trust client
    const oldRec = records.find(r => Number(r['id']) === recordId);
    if (!oldRec) return json({ error: '找不到對應的認獻紀錄' }, 404);

    const old物資 = oldRec['物資'], old短宣隊 = oldRec['短宣隊'], old數量 = Number(oldRec['數量']);

    const newItem = items.find(r => r['名稱'] === 物資 && r['短宣隊'] === 短宣隊);
    const oldItem = items.find(r => r['名稱'] === old物資 && r['短宣隊'] === old短宣隊);
    if (!newItem || !oldItem) return json({ error: '找不到對應的認獻項目' }, 400);

    // simulate count changes
    const sim = {};
    for (const item of items) sim[item['id']] = { ...item };
    sim[oldItem['id']]['已募集'] = Number(oldItem['已募集']) - old數量;
    sim[oldItem['id']]['剩餘數量'] = Number(oldItem['剩餘數量']) + old數量;
    sim[newItem['id']]['已募集'] = Number(sim[newItem['id']]['已募集']) + 數量;
    sim[newItem['id']]['剩餘數量'] = Number(sim[newItem['id']]['剩餘數量']) - 數量;

    for (const id of new Set([oldItem['id'], newItem['id']])) {
      const s = sim[id];
      const req = Number(s['所需數量']), raised = s['已募集'], remain = s['剩餘數量'];
      if (raised < 0 || remain < 0 || raised + remain !== req) {
        return json({ error: '調整後的數量不合理，請確認數量設定' }, 400);
      }
    }

    const newTotal = Number(newItem['單價']) * 數量;

    // items first, record second — partial failure leaves item corrected, record stale (recoverable)
    for (const id of new Set([oldItem['id'], newItem['id']])) {
      const s = sim[id];
      const itemRow = await client.findRow('items', id);
      await client.updateRange(`items!F${itemRow}:G${itemRow}`, [s['已募集'], s['剩餘數量']]);
    }

    const recRow = await client.findRow('records', recordId);
    await client.updateRange(`records!C${recRow}:H${recRow}`, [姓名, 物資, 數量, newTotal, 短宣隊, 奉獻方式]);

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: 'internal error' }, 500);
  }
}

// DELETE /api/records/:id
export async function onRequestDelete({ params, request, env }) {

  try {
    const recordId = parseInt(params.id, 10);
    if (isNaN(recordId)) return json({ error: '無效的記錄 ID' }, 400);

    const client = await makeClient(env);
    const [items, records] = await Promise.all([
      client.getAll('items'),
      client.getAll('records'),
    ]);

    // read values from Sheets — do not trust client body
    const rec = records.find(r => Number(r['id']) === recordId);
    if (!rec) return json({ error: '找不到對應的認獻紀錄' }, 404);

    const { 物資, 短宣隊 } = rec;
    const 數量 = Number(rec['數量']);
    const item = items.find(r => r['名稱'] === 物資 && r['短宣隊'] === 短宣隊);
    if (!item) return json({ error: '找不到對應的認獻項目' }, 400);

    const newRaised = Number(item['已募集']) - 數量;
    const newRemain = Number(item['剩餘數量']) + 數量;
    const req = Number(item['所需數量']);

    if (newRaised < 0 || newRemain < 0 || newRaised + newRemain !== req) {
      return json({ error: '調整後的數量不合理，無法刪除' }, 400);
    }

    // item first, record second — if record delete fails, item is already corrected (admin can retry)
    const itemRow = await client.findRow('items', item['id']);
    await client.updateRange(`items!F${itemRow}:G${itemRow}`, [newRaised, newRemain]);

    const recRow = await client.findRow('records', recordId);
    await client.deleteRow('records', recRow);

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: 'internal error' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
