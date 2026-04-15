export interface ServiceCost {
  service: string;
  cost: number;
  currency: string;
  period: string;
}

export interface CostDataPoint {
  date: string;
  cost: number;
  service?: string;
}

export interface CloudResource {
  id: string;
  name: string;
  type: string;
  region: string;
  monthlyCost: number;
  status: 'active' | 'idle' | 'underutilized';
}

export interface CloudProvider {
  getCostByService(startDate: string, endDate: string): Promise<ServiceCost[]>;
  getCostTimeSeries(startDate: string, endDate: string, granularity: 'DAILY' | 'MONTHLY'): Promise<CostDataPoint[]>;
  getTopSpenders(limit: number): Promise<ServiceCost[]>;
  getResourceInventory(): Promise<CloudResource[]>;
}
