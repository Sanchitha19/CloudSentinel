import { pool } from '../db/db';
import { CostDataPoint } from '../../../shared/src/types/provider';

export interface DetectedAnomaly {
  service: string;
  detected_at: Date;
  expected_cost: number;
  actual_cost: number;
  deviation_percent: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  root_cause_hint: string;
}

export async function detectAnomalies(service: string, dataPoints: CostDataPoint[]): Promise<DetectedAnomaly[]> {
  const anomalies: DetectedAnomaly[] = [];

  // Ensure data points are sorted chronologically
  const sortedPoints = [...dataPoints].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (let i = 0; i < sortedPoints.length; i++) {
    const point = sortedPoints[i];
    const cost = point.cost;
    const targetDate = new Date(point.date);
    
    // 1. Z-Score method (Last 30 days trailing window)
    const zWindow = sortedPoints.slice(Math.max(0, i - 30), i);
    let zMean = 0, zStdDev = 0, zScore = 0;
    
    if (zWindow.length >= 2) {
      zMean = zWindow.reduce((sum, p) => sum + p.cost, 0) / zWindow.length;
      const variance = zWindow.reduce((sum, p) => sum + Math.pow(p.cost - zMean, 2), 0) / zWindow.length;
      zStdDev = Math.sqrt(variance);
      zScore = zStdDev > 0 ? Math.abs(cost - zMean) / zStdDev : 0;
    }

    // 2. Moving Average method (7-day rolling trailing average)
    const maWindow = sortedPoints.slice(Math.max(0, i - 7), i);
    let maMean = 0, maDeviation = 0;
    
    if (maWindow.length > 0) {
      maMean = maWindow.reduce((sum, p) => sum + p.cost, 0) / maWindow.length;
      maDeviation = maMean > 0 ? (Math.abs(cost - maMean) / maMean) * 100 : 0;
    }

    const isZAnomaly = zScore > 2.5;
    const isMaAnomaly = maDeviation > 40;

    if (isZAnomaly || isMaAnomaly) {
        // Evaluate combined expected cost
        const expectedCost = isMaAnomaly && maMean > 0 ? maMean : zMean;
        const deviationPercent = expectedCost > 0 ? (Math.abs(cost - expectedCost) / expectedCost) * 100 : 100;
        
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
        if (deviationPercent > 200) severity = 'critical';
        else if (deviationPercent >= 100) severity = 'high';
        else if (deviationPercent >= 60) severity = 'medium';
        else if (deviationPercent >= 40) severity = 'low';
        else severity = 'low'; // Fallback if caught by Z-Score but deviation is technically small

        // Query system events within ±6 hours of this targetDate (using start of day as anchor point, or covering the whole day bounding box)
        const dateString = point.date; // assuming YYYY-MM-DD
        const query = `
          SELECT description FROM system_events
          WHERE service = $1
          AND occurred_at >= $2::timestamp - interval '6 hours'
          AND occurred_at <= $2::timestamp + interval '30 hours'
        `;
        const result = await pool.query(query, [service, dateString]);
        
        let root_cause_hint = "No correlated system event found. Possible causes: traffic spike, misconfiguration, or new resource provisioning.";
        
        if (result.rows.length > 0) {
          const events = result.rows.map(r => r.description).join(' | ');
          root_cause_hint = `Correlated events found: ${events}`;
        }

        anomalies.push({
          service,
          detected_at: targetDate,
          expected_cost: Number(expectedCost.toFixed(2)),
          actual_cost: Number(cost.toFixed(2)),
          deviation_percent: Number(deviationPercent.toFixed(2)),
          severity,
          root_cause_hint
        });
    }
  }

  return anomalies;
}
