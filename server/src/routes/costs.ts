import { Router, Request, Response } from 'express';
import { getProvider } from '../providers/providerFactory';

export const costRouter = Router();

costRouter.get('/summary', async (req: Request, res: Response) => {
  try {
    const provider = getProvider();
    
    const now = new Date();
    const currYear = now.getFullYear();
    const currMonth = now.getMonth();
    
    const currMonthStart = new Date(currYear, currMonth, 1).toISOString().split('T')[0];
    const currMonthEnd = new Date(currYear, currMonth + 1, 0).toISOString().split('T')[0];
    
    const lastMonthStart = new Date(currYear, currMonth - 1, 1).toISOString().split('T')[0];
    const lastMonthEnd = new Date(currYear, currMonth, 0).toISOString().split('T')[0];

    const currentCosts = await provider.getCostByService(currMonthStart, currMonthEnd);
    const pastCosts = await provider.getCostByService(lastMonthStart, lastMonthEnd);

    const currentTotal = currentCosts.reduce((acc, curr) => acc + curr.cost, 0);
    const pastTotal = pastCosts.reduce((acc, curr) => acc + curr.cost, 0);
    
    const percentChange = pastTotal > 0 ? ((currentTotal - pastTotal) / pastTotal) * 100 : 0;

    res.json({
      currentMonthTotal: Number(currentTotal.toFixed(2)),
      lastMonthTotal: Number(pastTotal.toFixed(2)),
      percentChange: Number(percentChange.toFixed(2)),
      breakdown: currentCosts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch cost summary' });
  }
});

costRouter.get('/timeseries', async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const granularity = req.query.granularity as 'DAILY' | 'MONTHLY';
    const service = req.query.service as string;

    const provider = getProvider();
    
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const data = await provider.getCostTimeSeries(start, end, granularity || 'DAILY');
    
    const filtered = service ? data.filter(d => d.service === service) : data;

    res.json(filtered);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch cost timeseries' });
  }
});

costRouter.get('/top-spenders', async (req: Request, res: Response) => {
  try {
    const limit = Number.parseInt((req.query.limit as string) || '5', 10);
    const provider = getProvider();
    
    const topSpenders = await provider.getTopSpenders(limit);
    
    res.json(topSpenders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch top spenders' });
  }
});
