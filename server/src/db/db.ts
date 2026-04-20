import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const isProduction = process.env.NODE_ENV === 'production';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'cloudsentinel',
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});
