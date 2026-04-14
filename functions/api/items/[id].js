import { makeClient } from '../../../_shared/sheets.js';

// DELETE /api/items/:id — admin only
export async function onRequestDelete({ params, request, env }) {
  const pw = request.headers.get('X-Admin-Password');
  if (!pw || pw !== env.ADMIN_PASSWORD) return json({ error: 'Unauthorized' }, 401);

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
