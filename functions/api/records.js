import { makeClient } from '../../_shared/sheets.js';

const NUM_COLS = ['id', '數量', '總金額'];

function castRecord(row) {
  for (const col of NUM_COLS) if (row[col] !== undefined) row[col] = Number(row[col]);
  return row;
}

// GET /api/records — admin only
export async function onRequestGet({ request, env }) {
  const pw = request.headers.get('X-Admin-Password');
  if (!pw || pw !== env.ADMIN_PASSWORD) return json({ error: 'Unauthorized' }, 401);

  try {
    const client = await makeClient(env);
    const rows = (await client.getAll('records')).map(castRecord);
    rows.sort((a, b) => a.id - b.id);
    return json(rows);
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
