import { Router, Request, Response } from 'express';
import { getProvider } from '../providers/providerFactory';

export const resourceRouter = Router();

resourceRouter.get('/', async (req: Request, res: Response) => {
  try {
    const provider = getProvider();
    const inventory = await provider.getResourceInventory();
    
    res.json(inventory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});
