import { makeClient } from '../_shared/sheets.js';

const NUM_COLS = ['id', '數量', '總金額'];

function castRecord(row) {
  for (const col of NUM_COLS) if (row[col] !== undefined) row[col] = Number(row[col]);
  return row;
}

// GET /api/records
export async function onRequestGet({ env }) {
  try {
    const client = await makeClient(env);
    const rows = (await client.getAll('records')).map(castRecord);
    rows.sort((a, b) => a.id - b.id);
    return json(rows);
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
