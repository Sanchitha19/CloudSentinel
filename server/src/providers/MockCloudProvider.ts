import { CloudProvider, ServiceCost, CostDataPoint, CloudResource } from '../../../shared/src/types/provider';

const SERVICES = ['EC2', 'S3', 'RDS', 'Lambda', 'CloudFront'];
const REGIONS = ['us-east-1', 'us-west-2', 'eu-central-1', 'ap-southeast-1'];
const STATUSES: ('active' | 'idle' | 'underutilized')[] = ['active', 'idle', 'underutilized'];

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export class MockCloudProvider implements CloudProvider {
  
  async getCostByService(startDate: string, endDate: string): Promise<ServiceCost[]> {
    return SERVICES.map(service => ({
      service,
      cost: Number(randomRange(100, 5000).toFixed(2)),
      currency: 'USD',
      period: `${startDate} to ${endDate}`
    }));
  }

  async getCostTimeSeries(startDate: string, endDate: string, granularity: 'DAILY' | 'MONTHLY'): Promise<CostDataPoint[]> {
    const dataPoints: CostDataPoint[] = [];
    
    let end: number;
    let start: number;

    if (endDate && startDate) {
      end = new Date(endDate).getTime();
      start = new Date(startDate).getTime();
    } else {
      end = new Date().getTime();
      start = end - 90 * 24 * 60 * 60 * 1000;
    }
    
    const oneDay = 24 * 60 * 60 * 1000;
    
    for (let current = start; current <= end; current += oneDay) {
      const dateObj = new Date(current);
      const dateStr = dateObj.toISOString().split('T')[0];
      const dayOfMonth = dateObj.getDate();
      const month = dateObj.getMonth();
      
      SERVICES.forEach(service => {
        let baseCost = randomRange(50, 200);
        
        // Spikes for variance
        if (dayOfMonth === 15) {
          baseCost *= randomRange(2.5, 4.0);
        } else if (dayOfMonth >= 28) {
          baseCost *= randomRange(1.5, 3.0);
        } else if ((dayOfMonth + month) % 17 === 0) {
          baseCost *= randomRange(3.0, 5.0);
        }
        
        dataPoints.push({
          date: dateStr,
          cost: Number(baseCost.toFixed(2)),
          service
        });
      });
    }

    if (granularity === 'MONTHLY') {
      const monthlyMap = new Map<string, number>();
      dataPoints.forEach(dp => {
        const monthStr = dp.date.substring(0, 7); // yyyy-mm
        const key = `${monthStr}_${dp.service}`;
        const currentCost = monthlyMap.get(key) || 0;
        monthlyMap.set(key, currentCost + dp.cost);
      });
      
      return Array.from(monthlyMap.entries()).map(([key, cost]) => {
        const [monthStr, service] = key.split('_');
        return {
          date: monthStr,
          cost: Number(cost.toFixed(2)),
          service
        };
      });
    }

    return dataPoints;
  }

  async getTopSpenders(limit: number): Promise<ServiceCost[]> {
    const services = await this.getCostByService('', '');
    return services
      .sort((a, b) => b.cost - a.cost)
      .slice(0, limit);
  }

  async getResourceInventory(): Promise<CloudResource[]> {
    const resources: CloudResource[] = [];
    const count = Math.floor(randomRange(20, 50));
    
    for (let i = 0; i < count; i++) {
      const type = SERVICES[Math.floor(Math.random() * SERVICES.length)];
      const id = `res-${type.toLowerCase()}-${Math.floor(Math.random() * 100000)}`;
      const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
      
      resources.push({
        id,
        name: `${type} Instance ${i + 1}`,
        type,
        region: REGIONS[Math.floor(Math.random() * REGIONS.length)],
        monthlyCost: Number(randomRange(10, 1000).toFixed(2)),
        status
      });
    }
    
    return resources;
  }
}
