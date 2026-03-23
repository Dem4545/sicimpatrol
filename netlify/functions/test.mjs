import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

async function test() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT 1 as test`;
    console.log('SUCCESS:', result);
  } catch (err) {
    console.error('ERROR:', err);
  }
}

test();
