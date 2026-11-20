/**
 * PostgreSQL access for the application layer. One pool per process; queries are
 * parameterised text only, so no caller ever builds SQL by concatenation.
 */
import { Pool, type PoolClient, type QueryResultRow } from "pg";

export interface Queryable {
  query<Row extends QueryResultRow>(text: string, values?: readonly unknown[]): Promise<Row[]>;
}

export interface Database extends Queryable {
  one<Row extends QueryResultRow>(text: string, values?: readonly unknown[]): Promise<Row | undefined>;
  execute(text: string, values?: readonly unknown[]): Promise<number>;
  transaction<T>(work: (tx: Queryable) => Promise<T>): Promise<T>;
  end(): Promise<void>;
}

export function createDatabase(connectionString: string): Database {
  const pool = new Pool({ connectionString });

  return {
    async query<Row extends QueryResultRow>(text: string, values: readonly unknown[] = []) {
      const result = await pool.query<Row>(text, values as unknown[]);
      return result.rows;
    },
    async one<Row extends QueryResultRow>(text: string, values: readonly unknown[] = []) {
      const rows = await this.query<Row>(text, values);
      return rows[0];
    },
    async execute(text: string, values: readonly unknown[] = []) {
      const result = await pool.query(text, values as unknown[]);
      return result.rowCount ?? 0;
    },
    async transaction<T>(work: (tx: Queryable) => Promise<T>) {
      const client: PoolClient = await pool.connect();
      try {
        await client.query("BEGIN");
        const tx: Queryable = {
          async query<Row extends QueryResultRow>(text: string, values: readonly unknown[] = []) {
            const result = await client.query<Row>(text, values as unknown[]);
            return result.rows;
          },
        };
        const value = await work(tx);
        await client.query("COMMIT");
        return value;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    async end() {
      await pool.end();
    },
  };
}