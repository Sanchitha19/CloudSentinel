import { Router } from 'express';
import { costRouter } from './costs';
import { anomalyRouter } from './anomalies';
import { resourceRouter } from './resources';
import { recommendationRouter } from './recommendations';
import { eventRouter } from './events';

export const apiRouter = Router();

apiRouter.use('/costs', costRouter);
apiRouter.use('/anomalies', anomalyRouter);
apiRouter.use('/resources', resourceRouter);
apiRouter.use('/recommendations', recommendationRouter);
apiRouter.use('/events', eventRouter);
