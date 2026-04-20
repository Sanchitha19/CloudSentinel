import React, { useState, useEffect, useMemo, useContext } from 'react';
import { dashboardApi } from '../api/dashboard';
import type { Anomaly } from '../api/dashboard';
import type { CostDataPoint } from '../types/provider';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import { AlertCircle, CheckCircle, X, Search, Activity, Zap } from 'lucide-react';
import { RefreshContext } from '../components/Layout/Layout';

const SERVICES = ['All', 'EC2', 'S3', 'RDS', 'Lambda', 'CloudFront'];
const SEVERITIES = ['All', 'critical', 'high', 'medium', 'low'];
const STATUSES = ['All', 'open', 'acknowledged', 'resolved'];

// Utility to tint rows
const getRowColor = (severity: string, isSelected: boolean) => {
  if (isSelected) return 'bg-gray-800 border-l-4 border-blue-500';
  switch (severity) {
    case 'critical': return 'hover:bg-red-900/20 border-l-4 border-red-500/50 hover:border-red-500';
    case 'high': return 'hover:bg-orange-900/20 border-l-4 border-orange-500/50 hover:border-orange-500';
    case 'medium': return 'hover:bg-yellow-900/20 border-l-4 border-yellow-500/50 hover:border-yellow-500';
    case 'low': return 'hover:bg-blue-900/20 border-l-4 border-blue-500/50 hover:border-blue-500';
    default: return 'hover:bg-gray-800 border-l-4 border-transparent';
  }
};

const getBadgeColor = (severity: string) => {
  switch (severity) {
    case 'critical': return 'bg-red-500/20 text-red-400';
    case 'high': return 'bg-orange-500/20 text-orange-400';
    case 'medium': return 'bg-yellow-500/20 text-yellow-400';
    case 'low': return 'bg-blue-500/20 text-blue-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
};

export const Anomalies: React.FC = () => {
  const { refreshKey } = useContext(RefreshContext);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [serviceFilter, setServiceFilter] = useState('All');

  // Selected Anomaly
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  
  // Panel Data
  const [panelTimeSeries, setPanelTimeSeries] = useState<CostDataPoint[]>([]);
  const [panelEvents, setPanelEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchAnomalies = async () => {
      setLoading(true);
      try {
        const params: any = { limit: 100 };
        if (statusFilter !== 'All') params.status = statusFilter;
        if (severityFilter !== 'All') params.severity = severityFilter;
        
        const data = await dashboardApi.getAnomalies(params);
        let filtered = data;
        if (serviceFilter !== 'All') filtered = filtered.filter(a => a.service === serviceFilter);
        setAnomalies(filtered);
      } catch (error) {
        console.error("Failed to load anomalies", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnomalies();
  }, [severityFilter, statusFilter, serviceFilter, refreshKey]);

  useEffect(() => {
    if (!selectedAnomaly) return;

    const fetchPanelData = async () => {
      try {
        const targetDate = new Date(selectedAnomaly.detected_at);
        const start = new Date(targetDate.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const end = new Date(targetDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const [ts, evts] = await Promise.all([
          dashboardApi.getTimeSeriesByService(start, end, selectedAnomaly.service),
          dashboardApi.getSystemEvents(selectedAnomaly.service, start, end)
        ]);
        
        setPanelTimeSeries(ts);
        setPanelEvents(evts);
      } catch (error) {
        console.error("Failed to load panel details", error);
      }
    };
    fetchPanelData();
  }, [selectedAnomaly]);

  const handleAction = async (id: number, action: 'acknowledged' | 'resolved') => {
    try {
      const updated = await dashboardApi.updateAnomaly(id, action);
      // Optimistic URL
      setAnomalies(prev => prev.map(a => a.id === id ? { ...a, status: updated.status as any } : a));
      if (selectedAnomaly?.id === id) setSelectedAnomaly(prev => prev ? { ...prev, status: updated.status as any } : null);
    } catch (e) {
      console.error(e);
    }
  };

  const chartData = useMemo(() => {
    return panelTimeSeries.map(dp => ({
      date: dp.date,
      cost: dp.cost
    }));
  }, [panelTimeSeries]);

  return (
    <div className="flex min-h-screen bg-[#0f1117] text-gray-100 font-sans relative overflow-hidden">
      
      {/* LEFT ZONE: LIST */}
      <div className={`p-8 transition-all duration-300 w-full ${selectedAnomaly ? 'lg:w-[60%] lg:pr-4' : 'w-full'}`}>
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2 mb-2">
            <AlertCircle className="text-blue-500" /> Anomaly Explorer
          </h1>
          <p className="text-gray-400 text-sm">Investigate and remediate unusual cost fluctuations.</p>
        </header>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6 bg-[#1e212b] p-4 rounded-xl border border-gray-800">
          <label className="flex flex-col text-sm text-gray-400 font-medium">
            Service
            (
              <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="mt-1 bg-[#0f1117] text-white p-2 rounded border border-gray-700 outline-none focus:border-blue-500">
                {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )
          </label>
          <label className="flex flex-col text-sm text-gray-400 font-medium">
            Severity
            (
              <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="mt-1 bg-[#0f1117] text-white p-2 rounded border border-gray-700 outline-none focus:border-blue-500">
                {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )
          </label>
          <label className="flex flex-col text-sm text-gray-400 font-medium">
            Status
            (
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="mt-1 bg-[#0f1117] text-white p-2 rounded border border-gray-700 outline-none focus:border-blue-500">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )
          </label>
        </div>

        {/* List */}
        <div className="bg-[#1e212b] rounded-xl border border-gray-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#242833] text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800">
                  <th className="p-4 font-medium">Service</th>
                  <th className="p-4 font-medium">Detected</th>
                  <th className="p-4 font-medium">Cost vs Expected</th>
                  <th className="p-4 font-medium">Deviation</th>
                  <th className="p-4 font-medium">Severity</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  if (loading) return <tr><td colSpan={6} className="text-center py-8 text-gray-500">Loading anomalies...</td></tr>;
                  if (anomalies.length === 0) return <tr><td colSpan={6} className="text-center py-8 text-gray-500">No anomalies found.</td></tr>;
                  return anomalies.map(anom => (
                    <tr 
                      key={anom.id} 
                      onClick={() => setSelectedAnomaly(anom)}
                      className={`cursor-pointer transition-colors border-b border-gray-800 text-sm ${getRowColor(anom.severity, selectedAnomaly?.id === anom.id)}`}
                    >
                      <td className="p-4 font-medium text-gray-200">{anom.service}</td>
                      <td className="p-4 text-gray-400">{new Date(anom.detected_at).toLocaleDateString()}</td>
                      <td className="p-4 text-gray-300">
                        <span className="font-semibold text-white">${anom.actual_cost}</span> <span className="text-xs">vs ${anom.expected_cost}</span>
                      </td>
                      <td className="p-4 font-bold text-red-400">+{anom.deviation_percent}%</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs uppercase font-bold ${getBadgeColor(anom.severity)}`}>
                          {anom.severity}
                        </span>
                      </td>
                      <td className="p-4 text-gray-400 capitalize">{anom.status}</td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RIGHT ZONE: SLIDING PANEL */}
      <div 
        className={`fixed top-0 right-0 h-full w-full lg:w-[40%] bg-[#1a1d26] border-l border-gray-800 shadow-2xl overflow-y-auto transform transition-transform duration-500 ease-in-out z-50 ${selectedAnomaly ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {selectedAnomaly && (
          <div className="p-8 pb-20">
            {/* Panel Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-white shrink-0">{selectedAnomaly.service} Spike</h2>
                  <span className={`px-2 py-1 rounded text-xs uppercase font-bold shrink-0 ${getBadgeColor(selectedAnomaly.severity)}`}>
                    {selectedAnomaly.severity}
                  </span>
                </div>
                <p className="text-gray-400 text-sm">Detected on {new Date(selectedAnomaly.detected_at).toDateString()}</p>
              </div>
              <button onClick={() => setSelectedAnomaly(null)} className="p-2 text-gray-400 hover:text-white bg-[#242833] rounded-full hover:bg-gray-700 transition">
                <X size={20} />
              </button>
            </div>

            {/* Microstats */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-[#0f1117] p-4 rounded-lg border border-gray-800">
                <span className="text-xs text-gray-500 font-semibold uppercase">Cost Deviation</span>
                <p className="text-xl font-bold text-red-400 mt-1">+{selectedAnomaly.deviation_percent}%</p>
              </div>
              <div className="bg-[#0f1117] p-4 rounded-lg border border-gray-800">
                <span className="text-xs text-gray-500 font-semibold uppercase">Est. Impact</span>
                <p className="text-xl font-bold text-white mt-1">${(selectedAnomaly.actual_cost - selectedAnomaly.expected_cost).toFixed(2)}</p>
              </div>
            </div>

            {/* Actions */}
            {selectedAnomaly.status !== 'resolved' && (
               <div className="flex gap-4 mb-8">
                 {selectedAnomaly.status === 'open' && (
                   <button onClick={() => handleAction(selectedAnomaly.id, 'acknowledged')} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded shadow transition flex justify-center items-center gap-2 text-sm">
                     <Activity size={16} /> Acknowledge Alert
                   </button>
                 )}
                 <button onClick={() => handleAction(selectedAnomaly.id, 'resolved')} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-medium py-2.5 rounded shadow transition flex justify-center items-center gap-2 text-sm">
                   <CheckCircle size={16} /> Mark as Resolved
                 </button>
               </div>
            )}
            
            {/* Status if resolved */}
            {selectedAnomaly.status === 'resolved' && (
              <div className="bg-green-900/20 text-green-400 border border-green-500/30 p-3 rounded-lg mb-8 flex items-center font-medium text-sm">
                <CheckCircle size={18} className="mr-2" /> This anomaly has been resolved.
              </div>
            )}

            {/* Chart Zoom */}
            <h3 className="font-semibold text-gray-300 mb-4 flex items-center gap-2"><Activity size={18} className="text-blue-500"/> Context (7 Days)</h3>
            <div className="h-52 bg-[#0f1117] p-4 rounded-xl border border-gray-800 mb-8 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
                  <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(date) => date.split('-').slice(1).join('/')} />
                  <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1e212b', borderColor: '#374151', borderRadius: '4px', fontSize: '12px' }}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                  <Line type="monotone" dataKey="cost" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} />
                  {/* Highlight anomaly point */}
                  <ReferenceDot x={new Date(selectedAnomaly.detected_at).toISOString().split('T')[0]} y={selectedAnomaly.actual_cost} r={6} fill="#ef4444" stroke="#fff" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Root Cause Hint */}
            <h3 className="font-semibold text-gray-300 mb-4 flex items-center gap-2"><Search size={18} className="text-blue-500"/> Root Cause Discovery</h3>
            <div className="bg-[#0f1117] p-5 rounded-xl border border-gray-800 mb-8 leading-relaxed text-sm text-gray-300">
              {selectedAnomaly.root_cause_hint.includes('Correlated events found:') ? (
                <div>
                   <p className="text-orange-400 font-medium mb-3 flex items-center gap-2"><AlertCircle size={16}/> System Events Detected:</p>
                   <ul className="list-disc pl-5 space-y-1 text-gray-200">
                     {selectedAnomaly.root_cause_hint.replace('Correlated events found: ', '').split(' | ').map((evt) => (
                       <li key={evt}>{evt}</li>
                     ))}
                   </ul>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-gray-400 mb-2">{selectedAnomaly.root_cause_hint}</p>
                </div>
              )}
            </div>

            {/* Vertical Timeline */}
            {panelEvents.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-300 mb-4 flex items-center gap-2"><Zap size={18} className="text-blue-500"/> Event Timeline</h3>
                <div className="relative border-l-2 border-gray-700 ml-3 pl-6 space-y-6">
                  {panelEvents.map(evt => (
                     <div key={evt.id} className="relative">
                       <div className="absolute -left-[31px] bg-blue-500 w-3 h-3 rounded-full border-2 border-[#1e212b]"></div>
                       <p className="text-xs text-blue-400 font-semibold mb-1">{new Date(evt.occurred_at).toLocaleString()}</p>
                       <div className="bg-[#0f1117] border border-gray-800 p-3 rounded-lg text-sm text-gray-300">
                         <span className="font-bold text-gray-100">{evt.event_type}</span>: {evt.description}
                       </div>
                     </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
