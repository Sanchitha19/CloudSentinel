import fs from 'node:fs';
import path from 'node:path';
import { pool } from './db';

export async function migrate() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Running database schema migration...');
    await pool.query(schemaSql);
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

if (require.main === module) {
  migrate().then(() => pool.end());
}
