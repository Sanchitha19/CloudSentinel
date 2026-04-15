import express, { Request, Response } from 'express';
import { apiRouter } from './routes';
import { migrate } from './db/migrate';
import { seed } from './db/seed';
import { startJob } from './jobs/anomalyJob';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Main API routes
app.use('/api', apiRouter);

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

async function initializeApp() {
  try {
    console.log('Initializing schema migrations...');
    await migrate();
    console.log('Validating baseline tables/seed data context...');
    await seed();
    console.log('Queueing background schedule protocols...');
    startJob();
    
    app.listen(PORT, () => {
      console.log(`CloudSentinel core running successfully natively on port ${PORT}`);
      console.log(`Cloud provider context bound actively to: [${process.env.CLOUD_PROVIDER?.toUpperCase() || 'MOCK'}]`);
    });
  } catch (error) {
    console.error('CRITICAL ERROR: Failed to mount application framework initialization loops:', error);
    process.exit(1);
  }
}

initializeApp();
