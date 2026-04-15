import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, AlertTriangle, Server, Lightbulb, Activity, 
  ChevronLeft, ChevronRight, Zap, RefreshCw
} from 'lucide-react';
import { dashboardApi } from '../../api/dashboard';

export const RefreshContext = React.createContext<{ refreshKey: number }>({ refreshKey: 0 });

export const Layout: React.FC = () => {
  console.log("Layout rendering...");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [anomalyCount, setAnomalyCount] = useState(0);
  const [recCount, setRecCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  const location = useLocation();

  const fetchGlobalStats = async () => {
    try {
      const anom = await dashboardApi.getAnomalies();
      const recs = await dashboardApi.getRecommendations();
      setAnomalyCount(anom.length);
      setRecCount(recs.length);
    } catch(e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchGlobalStats();
  }, [refreshKey]);

  useEffect(() => {
    const iv = setInterval(() => setCurrentTime(new Date()), 10000); // Check freshness every 10s
    return () => clearInterval(iv);
  }, []);

  const handleManualRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setLastRefreshed(new Date());
  };

  const isStale = (currentTime.getTime() - lastRefreshed.getTime()) > 5 * 60 * 1000;

  const NavItem = ({ to, icon: Icon, label, badgeCount, badgeColor }: any) => {
    const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
    return (
      <Link to={to} className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 mb-2
        ${isActive ? 'bg-[#2A2D3E] text-blue-400 border border-blue-500/20 shadow-inner' : 'text-gray-400 border border-transparent hover:bg-[#202330] hover:text-gray-200'}
        ${isCollapsed ? 'justify-center' : ''}`}
      >
        <div className="relative shrink-0">
          <Icon size={22} className={isActive ? 'text-blue-500' : ''} />
          {isCollapsed && badgeCount > 0 && (
            <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${badgeColor}`}></span>
          )}
        </div>
        {!isCollapsed && (
          <div className="flex-1 flex justify-between items-center whitespace-nowrap overflow-hidden">
            <span className="font-medium text-sm tracking-wide">{label}</span>
            {badgeCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}`}>
                {badgeCount}
              </span>
            )}
          </div>
        )}
      </Link>
    );
  };

  const getPageTitle = () => {
    const p = location.pathname;
    if (p.includes('anomalies')) return 'Anomalies Tracker';
    if (p.includes('resources') || p.includes('recommendations')) return 'Resources & Optimizations';
    if (p.includes('events')) return 'System Event Diagnostics';
    return 'Executive Dashboard';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f1117] text-gray-100 font-sans">
      {/* Sidebar Navigation */}
      <aside className={`${isCollapsed ? 'w-20' : 'w-[260px]'} flex flex-col transition-all duration-300 bg-[#161822] border-r border-[#202330] relative z-20`}>
        {/* Logo */}
        <div className={`h-[72px] flex items-center ${isCollapsed ? 'justify-center' : 'px-6'} border-b border-[#202330]`}>
          <Zap className="text-blue-500 shrink-0 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" fill="currentColor" size={26} />
          {!isCollapsed && <span className="ml-2 font-bold text-[22px] tracking-tight text-white whitespace-nowrap">Cloud<span className="text-blue-500">Sentinel</span></span>}
        </div>
        
        {/* Expand/Collapse Toggle */}
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-[14px] top-[80px] bg-[#202330] border border-[#2a2d3e] rounded-full p-1.5 text-gray-400 hover:text-white shadow-xl transition z-30 group">
           {isCollapsed ? <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" /> : <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />}
        </button>

        {/* Links */}
        <nav className="flex-1 px-3 py-6 overflow-y-auto scrollbar-none">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/anomalies" icon={AlertTriangle} label="Anomalies" badgeCount={anomalyCount} badgeColor="bg-red-500 text-white" />
          <NavItem to="/resources" icon={Server} label="Resources" />
          <NavItem to="/resources?tab=recommendations" icon={Lightbulb} label="Recommendations" badgeCount={recCount} badgeColor="bg-yellow-500 text-yellow-900" />
          <NavItem to="/events" icon={Activity} label="Events" />
        </nav>

        {/* Dynamic Provider Footer */}
        <div className={`p-5 border-t border-[#202330] flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} bg-[#12141c]`}>
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
          {!isCollapsed && <span className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Provider <span className="text-gray-200 ml-1">Mock</span></span>}
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#0f1117] relative">
        {/* Persistent Top Header */}
        <header className="h-[72px] flex items-center justify-between px-8 border-b border-[#202330] shrink-0 bg-[#0f1117]/80 backdrop-blur-md sticky top-0 z-10 w-full transform-gpu">
          <h2 className="text-xl font-bold text-white tracking-tight">{getPageTitle()}</h2>
          <div className="flex items-center gap-4 border border-[#2a2d3e] bg-[#161822] px-5 py-2 rounded-full shadow-sm">
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Updated: <span className="text-gray-200">{lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></span>
            <div className="w-[1px] h-4 bg-[#2a2d3e]"></div>
            <div className="flex items-center gap-2" title={isStale ? "Stale Data (>5 min without refreshing)" : "Live Network Connection Active"}>
               <div className={`w-2 h-2 rounded-full ${isStale ? 'bg-yellow-500 animate-pulse' : 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]'} `}></div>
               <span className={`text-[10px] uppercase font-bold tracking-widest ${isStale ? 'text-yellow-500' : 'text-green-500'}`}>{isStale ? 'Stale' : 'Live'}</span>
            </div>
            <button onClick={handleManualRefresh} title="Manual Refresh" className="ml-2 text-gray-500 hover:text-white transition bg-[#202330] p-1.5 rounded-full cursor-pointer hover:rotate-180 duration-500">
               <RefreshCw size={14} />
            </button>
          </div>
        </header>
        
        {/* Router Viewport */}
        <div className="flex-1 overflow-y-auto min-h-0 relative">
          <RefreshContext.Provider value={{ refreshKey }}>
             <Outlet />
          </RefreshContext.Provider>
        </div>
      </main>
    </div>
  );
};
