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

/**
 * Calculates mean, standard deviation, and flags points with Z-score > 2.5.
 */
function extractZScoreAnomalies(dataPoints: CostDataPoint[]): number[] {
  const indices: number[] = [];
  for (let i = 0; i < dataPoints.length; i++) {
    const window = dataPoints.slice(Math.max(0, i - 30), i);
    if (window.length < 2) continue;
    const mean = window.reduce((sum, p) => sum + p.cost, 0) / window.length;
    const variance = window.reduce((sum, p) => sum + Math.pow(p.cost - mean, 2), 0) / window.length;
    const stdDev = Math.sqrt(variance);
    const score = stdDev > 0 ? Math.abs(dataPoints[i].cost - mean) / stdDev : 0;
    if (score > 2.5) indices.push(i);
  }
  return indices;
}

/**
 * Flags points deviating more than 40% from 7-day rolling average.
 */
function extractMovingAverageAnomalies(dataPoints: CostDataPoint[]): number[] {
  const indices: number[] = [];
  for (let i = 0; i < dataPoints.length; i++) {
    const window = dataPoints.slice(Math.max(0, i - 7), i);
    if (window.length === 0) continue;
    const mean = window.reduce((sum, p) => sum + p.cost, 0) / window.length;
    const deviation = mean > 0 ? (Math.abs(dataPoints[i].cost - mean) / mean) * 100 : 0;
    if (deviation > 40) indices.push(i);
  }
  return indices;
}

/**
 * Returns 'low' | 'medium' | 'high' | 'critical' based on deviation thresholds.
 */
function classifySeverity(deviationPercent: number): 'low' | 'medium' | 'high' | 'critical' {
  if (deviationPercent > 200) return 'critical';
  if (deviationPercent >= 100) return 'high';
  if (deviationPercent >= 60) return 'medium';
  return 'low';
}

/**
 * Queries system_events table for correlated events.
 */
async function getRootCauseHint(service: string, date: string): Promise<string> {
  const query = `
    SELECT description FROM system_events
    WHERE service = $1
    AND occurred_at >= $2::timestamp - interval '6 hours'
    AND occurred_at <= $2::timestamp + interval '30 hours'
  `;
  const result = await pool.query(query, [service, date]);
  
  if (result.rows.length > 0) {
    const events = result.rows.map(r => r.description).join(' | ');
    return `Correlated events found: ${events}`;
  }
  
  return "No correlated system event found. Possible causes: traffic spike, misconfiguration, or new resource provisioning.";
}

export async function detectAnomalies(service: string, dataPoints: CostDataPoint[]): Promise<DetectedAnomaly[]> {
  const sortedPoints = [...dataPoints].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const zIndices = extractZScoreAnomalies(sortedPoints);
  const maIndices = extractMovingAverageAnomalies(sortedPoints);
  const allIndices = Array.from(new Set([...zIndices, ...maIndices])).sort((a, b) => a - b);

  const anomalies: DetectedAnomaly[] = [];

  for (const i of allIndices) {
    const point = sortedPoints[i];
    
    // Re-calculate expected cost for reporting
    const zWindow = sortedPoints.slice(Math.max(0, i - 30), i);
    const maWindow = sortedPoints.slice(Math.max(0, i - 7), i);
    
    const zMean = zWindow.length > 0 ? zWindow.reduce((sum, p) => sum + p.cost, 0) / zWindow.length : 0;
    const maMean = maWindow.length > 0 ? maWindow.reduce((sum, p) => sum + p.cost, 0) / maWindow.length : 0;

    const isMaAnomaly = maIndices.includes(i);
    const expectedCost = isMaAnomaly && maMean > 0 ? maMean : zMean;
    const deviationPercent = expectedCost > 0 ? (Math.abs(point.cost - expectedCost) / expectedCost) * 100 : 100;

    anomalies.push({
      service,
      detected_at: new Date(point.date),
      expected_cost: Number(expectedCost.toFixed(2)),
      actual_cost: Number(point.cost.toFixed(2)),
      deviation_percent: Number(deviationPercent.toFixed(2)),
      severity: classifySeverity(deviationPercent),
      root_cause_hint: await getRootCauseHint(service, point.date)
    });
  }

  return anomalies;
}

