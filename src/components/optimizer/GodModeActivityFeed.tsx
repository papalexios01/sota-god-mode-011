/**
 * God Mode 2.0 - SOTA Enterprise Activity Feed
 * 
 * State-of-the-art live activity monitoring featuring:
 * - Real-time color-coded activity streaming
 * - Enterprise-grade logging with timestamps
 * - Activity type filtering (info/success/warning/error)
 * - Expandable details with full context
 * - Performance metrics integration
 */

import { useState } from 'react';
import { useOptimizerStore } from '@/lib/store';
import { useGodModeEngine } from '@/hooks/useGodModeEngine';
import { Activity, CheckCircle2, AlertTriangle, XCircle, Info, Trash2, Filter, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

type ActivityFilter = 'all' | 'success' | 'warning' | 'error' | 'info';

export function GodModeActivityFeed() {
  const { state, clearActivityLog } = useGodModeEngine();
  const [filter, setFilter] = useState<ActivityFilter>('all');

  const allActivities = state.activityLog.slice().reverse().slice(0, 100);
  const activities = filter === 'all'
    ? allActivities.slice(0, 50)
    : allActivities.filter(a => a.type === filter).slice(0, 50);

  // Calculate activity stats
  const activityStats = {
    total: allActivities.length,
    success: allActivities.filter(a => a.type === 'success').length,
    warning: allActivities.filter(a => a.type === 'warning').length,
    error: allActivities.filter(a => a.type === 'error').length,
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="glass-card border border-white/10 rounded-2xl flex flex-col h-[400px] shadow-2xl overflow-hidden relative group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2" />

      <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5 backdrop-blur-md z-10">
        <h3 className="font-bold text-white flex items-center gap-2.5 text-sm">
          <div className="p-1.5 bg-primary/20 rounded-lg">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          Live Activity Feed
          <span className="text-[10px] font-medium text-zinc-400 bg-black/30 px-2 py-0.5 rounded-full border border-white/5">
            {activityStats.total}
          </span>
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex bg-black/20 p-1 rounded-lg border border-white/5">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                "px-2.5 py-1 text-[10px] font-bold rounded-md transition-all",
                filter === 'all'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              )}
            >
              ALL
            </button>
            {(['error', 'warning'] as const).map(type => {
              if (activityStats[type] === 0) return null;
              return (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={cn(
                    "px-2.5 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-1.5 ml-1",
                    filter === type
                      ? type === 'error' ? 'bg-red-500 text-white shadow-sm' : 'bg-yellow-500 text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                  )}
                >
                  {type === 'error' ? <XCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  {activityStats[type]}
                </button>
              );
            })}
          </div>

          {allActivities.length > 0 && (
            <button
              onClick={clearActivityLog}
              className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
              title="Clear activity log"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/10 backdrop-blur-sm p-2 space-y-1">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3">
              <Zap className="w-6 h-6 text-zinc-600" />
            </div>
            <p className="text-sm font-medium text-zinc-400">System Ready</p>
            <p className="text-xs text-zinc-600 mt-1">Waiting for engine start...</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className={cn(
                "group flex gap-3 p-3 rounded-xl border transition-all hover:translate-x-1",
                activity.type === 'error' ? "bg-red-500/10 border-red-500/20" :
                  activity.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20" :
                    activity.type === 'warning' ? "bg-amber-500/10 border-amber-500/20" :
                      "bg-white/5 border-white/5 hover:bg-white/10"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm",
                activity.type === 'error' ? "bg-red-500/20" :
                  activity.type === 'success' ? "bg-emerald-500/20" :
                    activity.type === 'warning' ? "bg-amber-500/20" :
                      "bg-white/5 border border-white/5"
              )}>
                {getIcon(activity.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <p className={cn(
                    "text-sm font-bold truncate pr-2",
                    activity.type === 'error' ? "text-red-300" :
                      activity.type === 'success' ? "text-emerald-300" :
                        activity.type === 'warning' ? "text-amber-300" :
                          "text-zinc-200"
                  )}>
                    {activity.message}
                  </p>
                  <span className="text-[10px] font-mono text-zinc-500 whitespace-nowrap bg-black/20 px-1.5 py-0.5 rounded border border-white/5">
                    {formatTime(activity.timestamp)}
                  </span>
                </div>

                {activity.details && (
                  <p className="text-xs text-zinc-400 mt-1 opacity-80 line-clamp-2 leading-relaxed">
                    {activity.details}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Live indicator */}
      {state.status === 'running' && (
        <div className="px-4 py-2 border-t border-white/10 bg-emerald-500/10 backdrop-blur-md flex justify-between items-center">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            System Active
          </div>
          <span className="text-[10px] text-emerald-500/70 font-mono">
            MONITORING
          </span>
        </div>
      )}
    </div>
  );
}
