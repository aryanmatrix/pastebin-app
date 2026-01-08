import { Pool } from 'pg';

let pool = null;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // Parse URL and remove channel_binding parameter
    const url = new URL(connectionString);
    url.searchParams.delete('channel_binding');

    pool = new Pool({
      connectionString: url.toString(),
      ssl: {
        rejectUnauthorized: false
      },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);
      pool = null;
    });
  }
  return pool;
}

export default getPool;