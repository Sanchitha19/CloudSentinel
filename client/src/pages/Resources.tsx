import React, { useState, useEffect, useMemo, useContext } from 'react';
import { dashboardApi } from '../api/dashboard';
import type { Recommendation } from '../api/dashboard';
import type { CloudResource } from '../types/provider';
import { Server, Database, HardDrive, Zap, Globe, Search, CheckCircle, XCircle, ArrowUpRight } from 'lucide-react';
import { RefreshContext } from '../components/Layout/Layout';

const getTypeIcon = (type: string) => {
  switch(type.toUpperCase()) {
    case 'EC2': return <Server size={16} className="text-blue-400" />;
    case 'RDS': return <Database size={16} className="text-indigo-400" />;
    case 'S3': return <HardDrive size={16} className="text-orange-400" />;
    case 'LAMBDA': return <Zap size={16} className="text-yellow-400" />;
    case 'CLOUDFRONT': return <Globe size={16} className="text-cyan-400" />;
    default: return <Server size={16} className="text-gray-400" />;
  }
};

const getStatusBadge = (status: string) => {
  switch(status) {
    case 'active': return <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs font-bold uppercase">Active</span>;
    case 'idle': return <span className="bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded text-xs font-bold uppercase">Idle</span>;
    case 'underutilized': return <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded text-xs font-bold uppercase">Underutilized</span>;
    default: return <span className="bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded text-xs font-bold uppercase">{status}</span>;
  }
};

export const Resources: React.FC = () => {
  const { refreshKey } = useContext(RefreshContext);
  const [activeTab, setActiveTab] = useState<'inventory' | 'recommendations'>('inventory');
  
  // Inventory State
  const [resources, setResources] = useState<CloudResource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Recommendation State
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [showDismissed, setShowDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [resParams, recParams] = await Promise.all([
          dashboardApi.getResources(),
          dashboardApi.getRecommendations() // fetches all because of our new params logic
        ]);
        setResources(resParams);
        setRecommendations(recParams);
      } catch (error) {
        console.error("Failed to load resource data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshKey]);

  // Filter & sort resources
  const displayResources = useMemo(() => {
    let filtered = resources;
    if (searchQuery.trim()) {
      const lower = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(lower) || 
        r.type.toLowerCase().includes(lower)
      );
    }
    // Sort by monthlyCost DESC default
    return filtered.sort((a, b) => b.monthlyCost - a.monthlyCost);
  }, [resources, searchQuery]);

  // Filter recommendations
  const displayRecommendations = useMemo(() => {
    return recommendations.filter(r => {
      if (r.status === 'dismissed' && !showDismissed) return false;
      return true;
    });
  }, [recommendations, showDismissed]);

  const pendingRecs = recommendations.filter(r => r.status === 'pending');
  const possibleSavings = pendingRecs.reduce((sum, r) => sum + Number(r.estimated_savings), 0);

  const handleRecAction = async (id: number, status: 'applied' | 'dismissed') => {
    try {
      const updated = await dashboardApi.updateRecommendation(id, status);
      setRecommendations(prev => prev.map(r => r.id === id ? { ...r, status: updated.status as any } : r));
    } catch(e) {
      console.error("Action failed", e);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-gray-100 p-8 font-sans">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2 mb-2">
          <Server className="text-purple-500" strokeWidth={2.5} /> Asset Management & Optimization
        </h1>
        <p className="text-gray-400 text-sm">Monitor your global deployment footprint and actively resolve provisioning waste.</p>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 mb-8 gap-8">
        <button 
          onClick={() => setActiveTab('inventory')} 
          className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'inventory' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          Cloud Inventory
        </button>
        <button 
          onClick={() => setActiveTab('recommendations')} 
          className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'recommendations' ? 'border-green-500 text-green-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          Recommendations <span className="bg-gray-800 text-white rounded-full px-2 py-0.5 text-[10px]">{pendingRecs.length}</span>
        </button>
      </div>

      {(() => {
        if (loading) return <div className="text-blue-500 text-center py-20">Loading resources...</div>;
        if (activeTab === 'inventory') {
          return (
            <section className="bg-[#1e212b] rounded-xl border border-gray-800 shadow-xl overflow-hidden">
              {/* Search Bar */}
              <div className="p-4 border-b border-gray-800 bg-[#242833] flex items-center gap-4">
                 <div className="relative flex-1 max-w-md">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                   <input 
                     type="text" 
                     placeholder="Search by name or type..." 
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full bg-[#0f1117] text-white border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:border-purple-500 transition-colors"
                   />
                 </div>
                 <div className="text-sm text-gray-400 ml-auto font-medium">Showing {displayResources.length} units</div>
              </div>
              
              <div className="overflow-x-auto max-h-[650px] scrollbar-thin">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#242833] shadow-md z-10">
                    <tr className="text-gray-400 text-xs uppercase tracking-wider">
                      <th className="p-4 font-medium border-b border-gray-800">Resource Name</th>
                      <th className="p-4 font-medium border-b border-gray-800">Type</th>
                      <th className="p-4 font-medium border-b border-gray-800">Region</th>
                      <th className="p-4 font-medium border-b border-gray-800">Monthly Cost</th>
                      <th className="p-4 font-medium border-b border-gray-800">Status</th>
                      <th className="p-4 font-medium border-b border-gray-800 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayResources.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-8 text-gray-500">No resources found matching your search.</td></tr>
                    ) : displayResources.map(res => (
                      <tr key={res.id} className="border-b border-gray-800 hover:bg-[#2a2f3d] transition-colors group">
                        <td className="p-4 font-medium text-gray-200">
                          <div className="flex flex-col">
                            <span>{res.name}</span>
                            <span className="text-[10px] text-gray-500 font-mono">{res.id}</span>
                          </div>
                        </td>
                        <td className="p-4 text-gray-300">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(res.type)} <span className="font-semibold">{res.type}</span>
                          </div>
                        </td>
                        <td className="p-4 text-gray-400">{res.region}</td>
                        <td className="p-4 text-gray-200 font-medium">${res.monthlyCost.toLocaleString()}</td>
                        <td className="p-4">{getStatusBadge(res.status)}</td>
                        <td className="p-4 text-right">
                           <button className="text-blue-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1 ml-auto text-xs font-semibold">
                             Details <ArrowUpRight size={14} />
                           </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        }
        return (
          <section>
            <div className="bg-gradient-to-r from-[#1e212b] to-[#242833] p-5 rounded-xl border border-gray-800 shadow-xl flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">{pendingRecs.length} Actionable Recommendations</h2>
                <p className="text-green-400 font-medium">Estimated potential savings: ${possibleSavings.toLocaleString()}/month</p>
              </div>
              
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-white transition-colors border border-gray-700 bg-[#0f1117] p-2 rounded">
                (
                  <input 
                    type="checkbox" 
                    checked={showDismissed} 
                    onChange={(e) => setShowDismissed(e.target.checked)}
                    className="rounded accent-purple-500"
                  />
                )
                Show Dismissed
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {displayRecommendations.length === 0 ? (
                 <div className="col-span-full py-10 text-center text-gray-500">All caught up! No active optimization recommendations.</div>
              ) : displayRecommendations.map(rec => {
                const applied = rec.status === 'applied';
                const dismissed = rec.status === 'dismissed';
                const disabled = applied || dismissed;

                const cardClass = (() => {
                  if (applied) return 'border-green-500/30 opacity-70 bg-green-900/5';
                  if (dismissed) return 'border-gray-800 opacity-50';
                  return 'border-gray-700 hover:border-gray-500 hover:shadow-2xl hover:-translate-y-1';
                })();

                const priorityClass = (() => {
                  if (rec.priority === 'high') return 'bg-red-500/20 text-red-500';
                  if (rec.priority === 'medium') return 'bg-orange-500/20 text-orange-400';
                  return 'bg-blue-500/20 text-blue-400';
                })();

                return (
                  <div key={rec.id} className={`bg-[#1e212b] p-6 rounded-xl border transition-all duration-300 relative overflow-hidden group ${cardClass}`}>
                    {applied && <div className="absolute top-4 right-4 text-green-500 bg-green-500/10 p-1.5 rounded-full"><CheckCircle size={20} /></div>}
                    {dismissed && <div className="absolute top-4 right-4 text-gray-500 bg-gray-500/10 p-1.5 rounded-full"><XCircle size={20} /></div>}
                    
                    <div className="flex gap-2 mb-4 pr-10">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${priorityClass}`}>
                        {rec.priority} Priority
                      </span>
                      <span className="text-[10px] bg-gray-800 text-gray-300 px-2 py-0.5 rounded font-mono border border-gray-700">{rec.resource_type}</span>
                    </div>

                    <h3 className={`text-lg font-bold mb-2 ${applied ? 'text-gray-400 line-through' : 'text-gray-100'}`}>{rec.title}</h3>
                    <p className="text-sm text-gray-400 mb-6 h-10 line-clamp-2 leading-relaxed">{rec.description}</p>

                    <div className="bg-[#0f1117] p-3 rounded-lg border border-gray-800 flex items-center justify-between mb-6">
                      <span className="text-xs text-gray-500 font-semibold uppercase">Target Resource</span>
                      <span className="text-xs font-mono text-gray-300 bg-gray-800 px-2 py-1 rounded truncate max-w-[150px]">{rec.resource_id}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-0.5">Est. Savings</p>
                        <p className={`text-xl font-bold ${applied ? 'text-gray-500' : 'text-green-400'}`}>+${Number(rec.estimated_savings).toLocaleString()}/mo</p>
                      </div>
                      
                      {!disabled && (
                        <div className="flex gap-2">
                          <button onClick={() => handleRecAction(rec.id, 'dismissed')} className="px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded transition-colors">
                            Dismiss
                          </button>
                          <button onClick={() => handleRecAction(rec.id, 'applied')} className="px-4 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-500 rounded shadow transition-colors">
                            Apply
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}
    </div>
  );
};
