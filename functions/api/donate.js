import { makeClient } from '../../_shared/sheets.js';

// POST /api/donate — public
export async function onRequestPost({ request, env }) {
  try {
    const { 姓名, 物資, 短宣隊, 數量, 奉獻方式 } = await request.json();

    if (!姓名 || !物資 || !短宣隊 || !數量 || 數量 <= 0) {
      return json({ error: '請檢查姓名或數量' }, 400);
    }

    const client = await makeClient(env);
    const items = await client.getAll('items');
    const item = items.find(r => r['名稱'] === 物資 && r['短宣隊'] === 短宣隊);

    if (!item) return json({ error: '找不到對應的認獻項目' }, 400);

    const remaining = Number(item['剩餘數量']);
    if (數量 > remaining) return json({ error: '數量超過剩餘可認獻數' }, 400);

    const totalMoney = Number(item['單價']) * 數量;
    const newRaised = Number(item['已募集']) + 數量;
    const newRemain = remaining - 數量;

    // insert record
    const recId = await client.nextId('records');
    await client.append('records', [recId, 姓名, 物資, 數量, totalMoney, 短宣隊, 奉獻方式]);

    // update item counts
    const itemRow = await client.findRow('items', item['id']);
    await client.updateRange(`items!F${itemRow}:G${itemRow}`, [newRaised, newRemain]);

    return json({
      ok: true,
      receipt: { 姓名, 物資, 短宣隊, 數量, 總金額: totalMoney, 奉獻方式 },
    });
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
