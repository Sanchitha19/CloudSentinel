import { Router, Request, Response } from 'express';
import { pool } from '../db/db';
import { writeLimiter } from '../middleware/rateLimiter';
import { validateId, validateEnum } from '../middleware/validate';

export const recommendationRouter = Router();

recommendationRouter.get('/', 
  validateEnum('priority', ['low', 'medium', 'high']),
  validateEnum('status', ['pending', 'applied', 'dismissed']),
  async (req: Request, res: Response) => {
  try {
    const priority = req.query.priority as string;
    const status = req.query.status as string;
    
    let query = 'SELECT * FROM recommendations WHERE 1=1';
    const values: any[] = [];
    
    if (priority) {
      values.push(priority);
      query += ` AND priority = $${values.length}`;
    }
    
    if (status) {
      values.push(status);
      query += ` AND status = $${values.length}`;
    }
    
    query += ' ORDER BY estimated_savings DESC';
    
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

recommendationRouter.patch('/:id', 
  writeLimiter,
  validateId('id'),
  validateEnum('status', ['applied', 'dismissed'], 'body'),
  async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const status = req.body.status as string;
    
    const result = await pool.query(
      'UPDATE recommendations SET status = $1 WHERE id = $2 RETURNING *',
      [status, Number.parseInt(id, 10)]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update recommendation' });
  }
});
