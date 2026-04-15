import { apiClient as api } from './client';
import { ServiceCost, CostDataPoint, CloudResource } from '../types/provider';

export interface CostSummary {
  currentMonthTotal: number;
  lastMonthTotal: number;
  percentChange: number;
  breakdown: ServiceCost[];
}

export interface Anomaly {
  id: number;
  service: string;
  detected_at: string;
  expected_cost: number;
  actual_cost: number;
  deviation_percent: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved';
  root_cause_hint: string;
}

export interface Recommendation {
  id: number;
  resource_id: string;
  resource_type: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  estimated_savings: string | number;
  status: 'pending' | 'applied' | 'dismissed';
}

export const dashboardApi = {
  getSummary: (): Promise<CostSummary> => 
    api.get('/costs/summary'),

  getTimeSeries: (days: number = 30): Promise<CostDataPoint[]> => {
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    return api.get(`/costs/timeseries?startDate=${start.toISOString().split('T')[0]}&endDate=${end.toISOString().split('T')[0]}`);
  },
  
  getAnomalies: (params?: { limit?: number; status?: string; severity?: string }): Promise<Anomaly[]> => {
    let url = `/anomalies?limit=${params?.limit || 50}`;
    if (params?.status && params.status !== 'All') url += `&status=${params.status}`;
    if (params?.severity && params.severity !== 'All') url += `&severity=${params.severity}`;
    return api.get(url);
  },

  getRecommendations: (params?: { limit?: number; status?: string; priority?: string }): Promise<Recommendation[]> => {
    let url = `/recommendations?limit=${params?.limit || 100}`;
    if (params?.status && params.status !== 'All') url += `&status=${params.status}`;
    if (params?.priority && params.priority !== 'All') url += `&priority=${params.priority}`;
    return api.get(url);
  },
    
  getResources: (): Promise<CloudResource[]> => 
    api.get('/resources'),

  updateAnomaly: (id: number, status: 'acknowledged' | 'resolved') => 
    api.patch(`/anomalies/${id}`, { status }),

  updateRecommendation: (id: number, status: 'applied' | 'dismissed') =>
    api.patch(`/recommendations/${id}`, { status }),

  getTimeSeriesByService: (startDate: string, endDate: string, service: string): Promise<CostDataPoint[]> => 
    api.get(`/costs/timeseries?startDate=${startDate}&endDate=${endDate}&service=${service}`),

  getSystemEvents: (service: string, startDate: string, endDate: string): Promise<any[]> => 
    api.get(`/events?service=${service}&startDate=${startDate}&endDate=${endDate}`),
};
