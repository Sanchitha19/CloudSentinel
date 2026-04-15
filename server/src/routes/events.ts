import { Router, Request, Response } from 'express';
import { pool } from '../db/db';

export const eventRouter = Router();

eventRouter.get('/', async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const service = req.query.service as string;
    
    let query = 'SELECT * FROM system_events WHERE 1=1';
    const values: any[] = [];
    
    if (startDate) {
      values.push(startDate);
      query += ` AND occurred_at >= $${values.length}::timestamp`;
    }
    
    if (endDate) {
      values.push(endDate);
      query += ` AND occurred_at <= $${values.length}::timestamp`;
    }
    
    if (service) {
      values.push(service);
      query += ` AND service = $${values.length}`;
    }
    
    query += ' ORDER BY occurred_at DESC LIMIT 100';
    
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});
