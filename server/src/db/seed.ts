import { pool } from './db';
import { MockCloudProvider } from '../providers/MockCloudProvider';

export async function seed() {
  const checkResult = await pool.query(`SELECT COUNT(*) FROM cost_timeseries`);
  if (Number.parseInt(checkResult.rows[0].count) > 0) {
    console.log('Database already populated. Skipping seeding routine.');
    return;
  }

  console.log('Seeding mock data for last 90 days...');
  const provider = new MockCloudProvider();
  
  const end = new Date();
  const start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);

  const startDateStr = start.toISOString().split('T')[0];
  const endDateStr = end.toISOString().split('T')[0];
  
  try {
    const timeSeries = await provider.getCostTimeSeries(startDateStr, endDateStr, 'DAILY');
    if (timeSeries.length === 0) return;

    console.log(`Beginning transaction to insert ${timeSeries.length} points...`);
    await pool.query('BEGIN');

    const values: any[] = [];
    const placeholders = timeSeries.map((point, i) => {
      const idx = i * 5;
      values.push('mock', point.service || 'Unknown', point.date, point.cost, 'DAILY');
      return `($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5})`;
    }).join(', ');

    const bulkInsertQuery = `
      INSERT INTO cost_timeseries (provider, service, date, cost, granularity)
      VALUES ${placeholders}
    `;

    await pool.query(bulkInsertQuery, values);
    
    await pool.query('COMMIT');
    console.log(`Seeding complete. Successfully inserted ${timeSeries.length} timeseries data points.`);

  } catch (error) {
    console.error('Seeding encountered an error. Attempting rollback...');
    try { await pool.query('ROLLBACK'); } catch(e) { console.error('Rollback failed:', e); }
    console.error('Seeding failed:', error);
  }
}

if (require.main === module) {
  seed().then(() => pool.end());
}
