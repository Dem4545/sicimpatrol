// netlify/functions/load.js
// GET /api/load  →  returns all patrol confirmations as nested JSON

import { neon } from '@neondatabase/serverless';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS };
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    const rows = await sql`
      SELECT date_key, slot_key, status, user_name, confirmed_at, comment
      FROM patrol_confirmations
      ORDER BY date_key, slot_key
    `;

    // Reshape flat rows → { date_key: { slot_key: { status, user, ts, comment } } }
    const result = {};
    for (const row of rows) {
      if (!result[row.date_key]) result[row.date_key] = {};
      result[row.date_key][row.slot_key] = {
        status: row.status,
        user: row.user_name,
        ts: row.confirmed_at,
        comment: row.comment || '',
      };
    }

    return { statusCode: 200, headers: CORS, body: JSON.stringify(result) };
  } catch (err) {
    console.error('load error:', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
