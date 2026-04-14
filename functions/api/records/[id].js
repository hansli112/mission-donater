import { makeClient } from '../../../_shared/sheets.js';

// PUT /api/records/:id — admin only
export async function onRequestPut({ params, request, env }) {
  const pw = request.headers.get('X-Admin-Password');
  if (!pw || pw !== env.ADMIN_PASSWORD) return json({ error: 'Unauthorized' }, 401);

  try {
    const recordId = parseInt(params.id);
    const { 姓名, 物資, 短宣隊, 數量, 奉獻方式, old物資, old短宣隊, old數量 } = await request.json();

    if (!姓名 || !物資 || !短宣隊 || 數量 <= 0) {
      return json({ error: '請檢查姓名或數量' }, 400);
    }

    const client = await makeClient(env);
    const items = await client.getAll('items');

    const newItem = items.find(r => r['名稱'] === 物資 && r['短宣隊'] === 短宣隊);
    const oldItem = items.find(r => r['名稱'] === old物資 && r['短宣隊'] === old短宣隊);

    if (!newItem || !oldItem) return json({ error: '找不到對應的認獻項目' }, 400);

    // simulate count changes
    const sim = {};
    for (const item of items) sim[item['id']] = { ...item };
    sim[oldItem['id']]['已募集'] = Number(oldItem['已募集']) - Number(old數量);
    sim[oldItem['id']]['剩餘數量'] = Number(oldItem['剩餘數量']) + Number(old數量);
    sim[newItem['id']]['已募集'] = Number(sim[newItem['id']]['已募集']) + 數量;
    sim[newItem['id']]['剩餘數量'] = Number(sim[newItem['id']]['剩餘數量']) - 數量;

    for (const id of new Set([oldItem['id'], newItem['id']])) {
      const s = sim[id];
      const req = Number(s['所需數量']), raised = s['已募集'], remain = s['剩餘數量'];
      if (raised < 0 || remain < 0 || raised > req || remain > req || raised + remain !== req) {
        return json({ error: '調整後的數量不合理，請確認數量設定' }, 400);
      }
    }

    const newTotal = Number(newItem['單價']) * 數量;

    // write record
    const recRow = await client.findRow('records', recordId);
    await client.updateRange(`records!B${recRow}:G${recRow}`, [姓名, 物資, 數量, newTotal, 短宣隊, 奉獻方式]);

    // write item counts
    for (const id of new Set([oldItem['id'], newItem['id']])) {
      const s = sim[id];
      const itemRow = await client.findRow('items', id);
      await client.updateRange(`items!F${itemRow}:G${itemRow}`, [s['已募集'], s['剩餘數量']]);
    }

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: e.message }, 500);
  }
}

// DELETE /api/records/:id — admin only
export async function onRequestDelete({ params, request, env }) {
  const pw = request.headers.get('X-Admin-Password');
  if (!pw || pw !== env.ADMIN_PASSWORD) return json({ error: 'Unauthorized' }, 401);

  try {
    const recordId = parseInt(params.id);
    const { 物資, 短宣隊, 數量 } = await request.json();

    const client = await makeClient(env);
    const items = await client.getAll('items');
    const item = items.find(r => r['名稱'] === 物資 && r['短宣隊'] === 短宣隊);
    if (!item) return json({ error: '找不到對應的認獻項目' }, 400);

    const newRaised = Number(item['已募集']) - Number(數量);
    const newRemain = Number(item['剩餘數量']) + Number(數量);
    const req = Number(item['所需數量']);

    if (newRaised < 0 || newRemain < 0 || newRaised + newRemain !== req) {
      return json({ error: '調整後的數量不合理，無法刪除' }, 400);
    }

    // delete record row
    const recRow = await client.findRow('records', recordId);
    await client.deleteRow('records', recRow);

    // update item counts
    const itemRow = await client.findRow('items', item['id']);
    await client.updateRange(`items!F${itemRow}:G${itemRow}`, [newRaised, newRemain]);

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
