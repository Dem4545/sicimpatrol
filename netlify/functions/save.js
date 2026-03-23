// netlify/functions/save.js
// POST /api/save  →  upserts one patrol confirmation into Neon DB
// Body: { date_key, slot_key, status, user, ts, comment }

const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { date_key, slot_key, status, user, ts, comment } = body;

    if (!date_key || !slot_key || !status || !user) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

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

    // Upsert — last writer wins (appropriate for patrol confirmations)
    await sql`
      INSERT INTO patrol_confirmations (date_key, slot_key, status, user_name, confirmed_at, comment)
      VALUES (
        ${date_key},
        ${slot_key},
        ${status},
        ${user},
        ${ts ? new Date(ts) : new Date()},
        ${comment || ''}
      )
      ON CONFLICT (date_key, slot_key)
      DO UPDATE SET
        status       = EXCLUDED.status,
        user_name    = EXCLUDED.user_name,
        confirmed_at = EXCLUDED.confirmed_at,
        comment      = EXCLUDED.comment
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error('save error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
