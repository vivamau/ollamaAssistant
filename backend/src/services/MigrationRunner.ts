import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

interface Migration {
  id: number;
  name: string;
  up: (db: sqlite3.Database) => Promise<void>;
  down?: (db: sqlite3.Database) => Promise<void>;
}

export type { Migration };

export class MigrationRunner {
  private db: sqlite3.Database;
  private migrationsDir: string;

  constructor(dbPath: string) {
    this.db = new sqlite3.Database(dbPath);
    this.migrationsDir = path.join(__dirname, '../migrations');
    
    // Ensure migrations directory exists
    if (!fs.existsSync(this.migrationsDir)) {
      fs.mkdirSync(this.migrationsDir, { recursive: true });
    }
  }

  private async createMigrationsTable(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at INTEGER NOT NULL
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private async getAppliedMigrations(): Promise<number[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT id FROM migrations ORDER BY id', (err, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows.map(r => r.id));
      });
    });
  }

  private async recordMigration(id: number, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timestamp = Math.floor(Date.now() / 1000);
      this.db.run(
        'INSERT INTO migrations (id, name, applied_at) VALUES (?, ?, ?)',
        [id, name, timestamp],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async runMigrations(migrations: Migration[]): Promise<void> {
    await this.createMigrationsTable();
    const applied = await this.getAppliedMigrations();

    for (const migration of migrations) {
      if (!applied.includes(migration.id)) {
        console.log(`Running migration ${migration.id}: ${migration.name}`);
        try {
          await migration.up(this.db);
          await this.recordMigration(migration.id, migration.name);
          console.log(`✓ Migration ${migration.id} completed`);
        } catch (error) {
          console.error(`✗ Migration ${migration.id} failed:`, error);
          throw error;
        }
      }
    }
  }

  close(): void {
    this.db.close();
  }
}

// Helper function to run a SQL statement
export function runSQL(db: sqlite3.Database, sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Helper function to get data
export function getAll(db: sqlite3.Database, sql: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}
