import { makeClient } from '../_shared/sheets.js';

// POST /api/reset — wipe all records, reset all item counts to 0
export async function onRequestPost({ env }) {
  try {
    const client = await makeClient(env);
    const [items, records] = await Promise.all([
      client.getAll('items'),
      client.getAll('records'),
    ]);

    // reset every item: 已募集=0, 剩餘數量=所需數量
    await Promise.all(items.map(async item => {
      const row = await client.findRow('items', item['id']);
      const req = Number(item['所需數量']);
      await client.updateRange(`items!F${row}:G${row}`, [0, req]);
    }));

    // delete all record rows bottom-up to avoid row index shifting
    for (let i = records.length - 1; i >= 0; i--) {
      const row = await client.findRow('records', records[i]['id']);
      await client.deleteRow('records', row);
    }

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
