import { Pool, QueryResult, QueryResultRow } from 'pg';
import { config } from './config.js';

export const pool = new Pool({ ...config.database, max: 10 });

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  return pool.query<T>(sql, params);
}

export async function one<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const res = await query<T>(sql, params);
  return res.rows[0] ?? null;
}

/** Runs `fn` inside a transaction; rolls back on throw. */
export async function tx<T>(fn: (q: typeof query) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const q = (async <R extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) =>
      (await client.query<R>(sql, params)) as QueryResult<R>) as typeof query;
    const out = await fn(q);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
