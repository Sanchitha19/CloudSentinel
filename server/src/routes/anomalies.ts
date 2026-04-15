import { Router, Request, Response } from 'express';
import { pool } from '../db/db';

export const anomalyRouter = Router();

anomalyRouter.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const severity = req.query.severity as string;
    const limit = (req.query.limit as string) || '50';
    
    let query = 'SELECT * FROM anomalies WHERE 1=1';
    const values: any[] = [];
    
    if (status) {
      values.push(status);
      query += ` AND status = $${values.length}`;
    }
    
    if (severity) {
      values.push(severity);
      query += ` AND severity = $${values.length}`;
    }
    
    values.push(parseInt(limit, 10));
    query += ` ORDER BY detected_at DESC LIMIT $${values.length}`;
    
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch anomalies' });
  }
});

anomalyRouter.patch('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const status = req.body.status as string;
    
    if (!status || !['acknowledged', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status update. Use acknowledged or resolved.' });
    }
    
    const result = await pool.query(
      'UPDATE anomalies SET status = $1 WHERE id = $2 RETURNING *',
      [status, parseInt(id, 10)]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Anomaly not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update anomaly' });
  }
});
