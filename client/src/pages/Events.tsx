import React, { useState, useEffect, useContext } from 'react';
import { dashboardApi } from '../api/dashboard';
import { RefreshContext } from '../components/Layout/Layout';
import { Activity, Search, Calendar, Zap, Terminal } from 'lucide-react';

export const Events: React.FC = () => {
  const { refreshKey } = useContext(RefreshContext);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [serviceFilter, setServiceFilter] = useState('All');
  
  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      try {
        const evts = await dashboardApi.getSystemEvents(serviceFilter !== 'All' ? serviceFilter : '', '', '');
        setEvents(evts);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, [refreshKey, serviceFilter]);

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
          <Activity className="text-teal-500" strokeWidth={2.5} size={32} /> Infrastructure Audit Log
        </h1>
        <p className="text-gray-400 text-sm">Monitor granular historical patterns and correlative triggers across your entire architectural stack.</p>
      </header>

      <div className="mb-6 bg-[#161822] p-4 rounded-xl border border-[#202330] flex gap-4 shadow-xl">
        <label className="flex flex-col text-xs text-gray-400 font-bold uppercase tracking-wider w-64">
           Service Context
           <select 
             value={serviceFilter} 
             onChange={(e) => setServiceFilter(e.target.value)} 
             className="mt-2 bg-[#0f1117] text-white p-2.5 rounded-lg border border-[#2a2d3e] outline-none focus:border-teal-500 transition-colors font-medium text-sm"
           >
             {['All', 'EC2', 'S3', 'RDS', 'Lambda', 'CloudFront'].map(s => (
               <option key={s} value={s}>{s}</option>
             ))}
           </select>
        </label>
      </div>

      <div className="bg-[#161822] rounded-xl border border-[#202330] shadow-xl overflow-hidden min-h-[500px]">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#1e212b]">
            <tr className="text-gray-400 text-[10px] uppercase tracking-widest">
              <th className="p-4 font-bold border-b border-[#202330]">Timestamp Trace</th>
              <th className="p-4 font-bold border-b border-[#202330]">Origin Domain</th>
              <th className="p-4 font-bold border-b border-[#202330]">Event Identifier</th>
              <th className="p-4 font-bold border-b border-[#202330]">Payload Context</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-20 text-teal-500 font-medium animate-pulse">Scanning encrypted activity logs...</td></tr>
            ) : events.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-20 text-gray-500 font-medium">No system events tracked within standard parameters.</td></tr>
            ) : events.map(evt => (
              <tr key={evt.id} className="border-b border-[#202330] hover:bg-[#1a1d26] transition-colors group cursor-default">
                <td className="p-5 font-medium text-gray-300 w-56 shrink-0 font-mono text-xs cursor-text selection:bg-teal-500/30">
                   {new Date(evt.occurred_at).toLocaleString()}
                </td>
                <td className="p-5 font-medium">
                   <div className="flex items-center gap-2">
                     <span className="text-teal-400">#{evt.service}</span>
                   </div>
                </td>
                <td className="p-5">
                   <span className="font-mono text-[10px] uppercase tracking-wider font-bold px-2.5 py-1.5 rounded-md bg-[#0f1117] text-teal-100 border border-[#2a2d3e] flex inline-flex items-center gap-1.5">
                     <Terminal size={12} className="text-teal-500" /> {evt.event_type}
                   </span>
                </td>
                <td className="p-5 text-gray-400 text-sm leading-relaxed border-l border-transparent group-hover:border-[#2a2d3e]">
                   {evt.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
