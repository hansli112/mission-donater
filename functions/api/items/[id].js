import { makeClient } from '../../../_shared/sheets.js';

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
