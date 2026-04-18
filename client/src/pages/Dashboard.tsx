import React, { useEffect, useState, useMemo, useContext } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceDot, PieChart, Pie, Cell, Legend
} from 'recharts';
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, Server, Zap, CheckCircle, XCircle } from 'lucide-react';
import { dashboardApi } from '../api/dashboard';
import type { CostSummary, Anomaly, Recommendation } from '../api/dashboard';
import type { ServiceCost, CostDataPoint, CloudResource } from '../types/provider';
import { RefreshContext } from '../components/Layout/Layout';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
const SERVICES = ['EC2', 'S3', 'RDS', 'Lambda', 'CloudFront'];

export const Dashboard: React.FC = () => {
  console.log("Dashboard rendering...");
  const { refreshKey } = useContext(RefreshContext);
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [timeSeries, setTimeSeries] = useState<CostDataPoint[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [resources, setResources] = useState<CloudResource[]>([]);
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [sum, ts, anom, recs, res] = await Promise.all([
          dashboardApi.getSummary(),
          dashboardApi.getTimeSeries(days),
          dashboardApi.getAnomalies({ limit: 5 }),
          dashboardApi.getRecommendations({ limit: 3 }),
          dashboardApi.getResources()
        ]);
        setSummary(sum);
        setTimeSeries(ts);
        setAnomalies(anom);
        setRecommendations(recs);
        setResources(res);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [days, refreshKey]);

  // Pivot timeSeries for Recharts LineChart
  const chartData = useMemo(() => {
    const map = new Map<string, any>();
    timeSeries.forEach(dp => {
      if (!dp.service) return;
      if (!map.has(dp.date)) {
        map.set(dp.date, { date: dp.date });
      }
      map.get(dp.date)[dp.service] = dp.cost;
    });
    return Array.from(map.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [timeSeries]);

  // Calculate underutilized/idle resources count
  const flaggedResourcesCount = resources.filter(r => r.status === 'idle' || r.status === 'underutilized').length;

  const handleAction = async (type: 'anomaly' | 'recommendation', id: number, action: string) => {
    try {
      if (type === 'anomaly') {
        await dashboardApi.updateAnomaly(id, action as 'acknowledged'|'resolved');
        setAnomalies(prev => prev.filter(a => a.id !== id));
      } else {
        await dashboardApi.updateRecommendation(id, action as 'applied'|'dismissed');
        setRecommendations(prev => prev.filter(r => r.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading && !summary) {
    return <div className="min-h-screen bg-[#0f1117] flex items-center justify-center text-blue-500">Loading CloudSentinel...</div>;
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-gray-100 p-8 font-sans">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Zap className="text-blue-500" strokeWidth={2.5} /> CloudSentinel
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Real-time Cloud Cost & Intelligence Dashboard</p>
        </div>
        <div className="flex bg-[#1e212b] rounded-lg p-1 border border-gray-800">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                days === d ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <KPI 
          title="Total Spend (Month)" 
          value={`$${summary?.currentMonthTotal.toLocaleString() || '0'}`}
          icon={<DollarSign size={20} className="text-blue-500" />}
          sub={
            <span className={`flex items-center text-xs font-semibold ${(summary?.percentChange || 0) <= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {(summary?.percentChange || 0) <= 0 ? <TrendingDown size={14} className="mr-1"/> : <TrendingUp size={14} className="mr-1"/>}
              {Math.abs(summary?.percentChange || 0).toFixed(1)}% vs last month
            </span>
          }
        />
        <KPI 
          title="Active Anomalies" 
          value={anomalies.length.toString()}
          icon={<AlertTriangle size={20} className="text-amber-500" />}
          sub={<span className="text-gray-400 text-xs">Unresolved cost spikes detected</span>}
        />
        <KPI 
          title="Potential Savings" 
          value={`$${recommendations.reduce((sum, r) => sum + Number(r.estimated_savings), 0).toLocaleString()}`}
          icon={<TrendingDown size={20} className="text-green-500" />}
          sub={<span className="text-gray-400 text-xs">From {recommendations.length} recommendations</span>}
        />
        <KPI 
          title="Flagged Resources" 
          value={flaggedResourcesCount.toString()}
          icon={<Server size={20} className="text-purple-500" />}
          sub={<span className="text-gray-400 text-xs">Idle or underutilized units</span>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Line Chart */}
        <div className="lg:col-span-2 bg-[#1e212b] p-6 rounded-xl border border-gray-800 shadow-xl overflow-hidden relative">
          <h2 className="text-lg font-semibold mb-6 flex items-center text-gray-200">Cost Over Time</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
                <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} minTickGap={30} />
                <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} dx={-10} tickFormatter={(v) => `$${v}`} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f1117', borderColor: '#374151', borderRadius: '8px', color: '#f3f4f6' }}
                  itemStyle={{ fontSize: '13px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }} />
                {SERVICES.map((srv, idx) => (
                  <Line key={srv} type="monotone" dataKey={srv} stroke={COLORS[idx]} strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                ))}
                {/* Render anomaly points */}
                {anomalies.map((anom) => {
                  const dateStr = new Date(anom.detected_at).toISOString().split('T')[0];
                  return (
                    <ReferenceDot key={anom.id} r={6} fill="#ef4444" stroke="#fff" x={dateStr} y={anom.actual_cost} />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="bg-[#1e212b] p-6 rounded-xl border border-gray-800 shadow-xl flex flex-col">
          <h2 className="text-lg font-semibold mb-2 text-gray-200">Spend by Service</h2>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summary?.breakdown || []}
                  cx="50%" cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="cost"
                  nameKey="service"
                  stroke="none"
                >
                  {(summary?.breakdown || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[SERVICES.indexOf(entry.service) % COLORS.length] || '#ccc'} />
                  ))}
                </Pie>
                <RechartsTooltip 
                   formatter={(value: number) => `$${value.toLocaleString()}`} 
                   contentStyle={{ backgroundColor: '#0f1117', borderColor: '#374151', borderRadius: '8px' }}
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Anomalies Feed */}
        <div className="bg-[#1e212b] p-6 rounded-xl border border-gray-800 shadow-xl overflow-y-auto max-h-[500px] scrollbar-thin">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-200">Recent Anomalies</h2>
            <button className="text-blue-500 hover:text-blue-400 text-sm font-medium transition-colors">View All</button>
          </div>
          <div className="space-y-4">
            {anomalies.length === 0 ? (
               <p className="text-gray-500 text-center py-6 text-sm">No active anomalies detected.</p>
            ) : anomalies.map(anom => (
              <div key={anom.id} className="bg-[#242833] p-4 rounded-lg border-l-4 flex flex-col gap-2 transition-transform hover:scale-[1.01]" 
                style={{ borderLeftColor: anom.severity === 'critical' ? '#ef4444' : anom.severity === 'high' ? '#f97316' : '#eab308' }}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-100">{anom.service} Spike Detected</h3>
                    <p className="text-xs text-gray-400 mb-1">{new Date(anom.detected_at).toLocaleDateString()} &middot; +{anom.deviation_percent}% deviation</p>
                  </div>
                  <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded bg-[#0f1117] ${anom.severity === 'critical' ? 'text-red-400' : anom.severity === 'high' ? 'text-orange-400' : 'text-yellow-400'}`}>
                    {anom.severity}
                  </span>
                </div>
                <p className="text-sm text-gray-300 bg-[#0f1117] p-3 rounded shadow-inner italic border border-gray-800">"{anom.root_cause_hint.substring(0, 100)}{anom.root_cause_hint.length > 100 ? '...' : ''}"</p>
                <div className="mt-2 flex gap-3">
                  <button onClick={() => handleAction('anomaly', anom.id, 'acknowledged')} className="text-gray-400 hover:text-white text-xs flex items-center transition-colors">
                    <CheckCircle size={14} className="mr-1" /> Acknowledge
                  </button>
                  <button onClick={() => handleAction('anomaly', anom.id, 'resolved')} className="text-green-500 hover:text-green-400 text-xs flex items-center transition-colors">
                    <CheckCircle size={14} className="mr-1" /> Mark Resolved
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations Strip */}
        <div className="bg-[#1e212b] p-6 rounded-xl border border-gray-800 shadow-xl overflow-y-auto max-h-[500px]">
          <h2 className="text-lg font-semibold mb-6 flex items-center text-gray-200">Cost Optimization</h2>
          <div className="space-y-4">
            {recommendations.length === 0 ? (
               <p className="text-gray-500 text-center py-6 text-sm">No new recommendations right now.</p>
            ) : recommendations.map(rec => (
              <div key={rec.id} className="bg-gradient-to-r from-[#242833] to-[#1e212b] p-5 rounded-lg border border-gray-800 flex justify-between items-center transition-all hover:border-gray-700">
                <div className="max-w-[70%]">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-100 text-sm">{rec.title}</h3>
                    {rec.priority === 'high' && <span className="bg-red-500/20 text-red-400 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">High Pri</span>}
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{rec.description}</p>
                  <span className="text-green-400 font-bold text-sm bg-green-500/10 px-2 py-1 rounded inline-block">
                    Save ~${Number(rec.estimated_savings).toLocaleString()}/mo
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => handleAction('recommendation', rec.id, 'applied')} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium py-2 px-4 rounded shadow transition-colors">
                    Apply Fix
                  </button>
                  <button onClick={() => handleAction('recommendation', rec.id, 'dismissed')} className="text-gray-500 hover:text-gray-300 text-xs font-medium py-1 px-4 transition-colors">
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

function KPI({ title, value, sub, icon }: { title: string, value: string | number, sub?: React.ReactNode, icon: React.ReactNode }) {
  return (
    <div className="bg-[#1e212b] p-6 rounded-xl border border-gray-800 shadow-xl flex items-center relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-2xl">
      <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-50"></div>
      <div className="p-3 bg-[#0f1117] rounded-lg border border-gray-800 mr-4">
        {icon}
      </div>
      <div>
        <h3 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1">{title}</h3>
        <p className="text-2xl font-bold text-gray-100 mb-1">{value}</p>
        <div className="mt-1">{sub}</div>
      </div>
    </div>
  );
}
