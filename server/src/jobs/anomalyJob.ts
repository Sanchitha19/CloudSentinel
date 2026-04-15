import cron from 'node-cron';
import { pool } from '../db/db';
import { detectAnomalies } from '../services/anomalyDetector';
import { CostDataPoint } from '../../../shared/src/types/provider';

async function runAnomalyDetection() {
  console.log('Starting scheduled anomaly detection job...');
  try {
    const servicesResult = await pool.query('SELECT DISTINCT service, provider FROM cost_timeseries');
    let totalAnomaliesDetected = 0;
    
    for (const row of servicesResult.rows) {
      const { service, provider } = row;
      
      const dataResult = await pool.query(`
        SELECT date, cost, service 
        FROM cost_timeseries 
        WHERE service = $1 
        ORDER BY date ASC
      `, [service]);

      const dataPoints: CostDataPoint[] = dataResult.rows.map((r: any) => ({
        // We ensure we pass date string format matching what UI/shared expects
        date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0],
        cost: Number(r.cost),
        service: r.service
      }));

      const anomalies = await detectAnomalies(service, dataPoints);
      
      for (const anomaly of anomalies) {
        // Prevent duplicate anomaly entries for the exact same service and day
        const checkResult = await pool.query(`
          SELECT id FROM anomalies 
          WHERE service = $1 
          AND DATE(detected_at) = DATE($2)
        `, [service, anomaly.detected_at]);

        if (checkResult.rows.length === 0) {
          // Persist the new anomaly
          await pool.query(`
            INSERT INTO anomalies (
              provider, service, detected_at, expected_cost, actual_cost, 
              deviation_percent, severity, status, root_cause_hint
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            provider,
            service,
            anomaly.detected_at,
            anomaly.expected_cost,
            anomaly.actual_cost,
            anomaly.deviation_percent,
            anomaly.severity,
            'open',
            anomaly.root_cause_hint
          ]);
          totalAnomaliesDetected++;
        }
      }
    }
    console.log(`Anomaly detection job completed. Inserted ${totalAnomaliesDetected} new anomalies.`);
  } catch (error) {
    console.error('Error running anomaly detection job:', error);
  }
}

// Runs every 30 minutes
export const anomalyJob = cron.schedule('*/30 * * * *', runAnomalyDetection);

export function startJob() {
    anomalyJob.start();
    console.log('Anomaly job scheduled to execute every 30 minutes.');
}
