import { makeClient } from '../_shared/sheets.js';

// POST /api/reset — wipe all records and all items
export async function onRequestPost({ env }) {
  try {
    const client = await makeClient(env);
    const [items, records] = await Promise.all([
      client.getAll('items'),
      client.getAll('records'),
    ]);

    // delete all record rows bottom-up to avoid row index shifting
    for (let i = records.length - 1; i >= 0; i--) {
      const row = await client.findRow('records', records[i]['id']);
      await client.deleteRow('records', row);
    }

    // delete all item rows bottom-up
    for (let i = items.length - 1; i >= 0; i--) {
      const row = await client.findRow('items', items[i]['id']);
      await client.deleteRow('items', row);
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
