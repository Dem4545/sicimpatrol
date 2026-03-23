// netlify/functions/load.js
// GET /api/load  →  returns all patrol confirmations as nested JSON:
// { "2026-03-24": { "DAY_08:00": { status, user, ts, comment } }, ... }

const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    // Ensure table exists
    await sql`
      CREATE TABLE IF NOT EXISTS patrol_confirmations (
        date_key       TEXT NOT NULL,
        slot_key       TEXT NOT NULL,
        status         TEXT NOT NULL,
        user_name      TEXT NOT NULL,
        confirmed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        comment        TEXT DEFAULT '',
        PRIMARY KEY (date_key, slot_key)
      )
    `;

    const rows = await sql`SELECT * FROM patrol_confirmations ORDER BY date_key, slot_key`;

    // Convert flat rows → nested { date_key: { slot_key: { status, user, ts, comment } } }
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error('load error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
