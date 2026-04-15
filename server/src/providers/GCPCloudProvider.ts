import { CloudProvider, ServiceCost, CostDataPoint, CloudResource } from '../../../shared/src/types/provider';

class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}

export class GCPCloudProvider implements CloudProvider {
  async getCostByService(startDate: string, endDate: string): Promise<ServiceCost[]> {
    throw new NotImplementedError('Switch CLOUD_PROVIDER env var to enable this provider.');
  }

  async getCostTimeSeries(startDate: string, endDate: string, granularity: 'DAILY' | 'MONTHLY'): Promise<CostDataPoint[]> {
    throw new NotImplementedError('Switch CLOUD_PROVIDER env var to enable this provider.');
  }

  async getTopSpenders(limit: number): Promise<ServiceCost[]> {
    throw new NotImplementedError('Switch CLOUD_PROVIDER env var to enable this provider.');
  }

  async getResourceInventory(): Promise<CloudResource[]> {
    throw new NotImplementedError('Switch CLOUD_PROVIDER env var to enable this provider.');
  }
}
