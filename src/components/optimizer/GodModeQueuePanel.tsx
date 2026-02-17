/**
 * God Mode 2.0 - Queue Visualization Panel
 * 
 * Displays the processing queue with priority badges,
 * health scores, and manual management controls.
 */

import { useGodModeEngine } from '@/hooks/useGodModeEngine';
import { Target, Trash2, Plus, ArrowUp, ArrowDown, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function GodModeQueuePanel() {
  const { state, removeFromQueue, addToQueue } = useGodModeEngine();
  const [newUrl, setNewUrl] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getHealthColor = (score: number) => {
    if (score < 30) return 'text-red-400';
    if (score < 50) return 'text-orange-400';
    if (score < 70) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getSlug = (url: string) => {
    try {
      return new URL(url).pathname.split('/').filter(Boolean).pop() || url;
    } catch {
      return url;
    }
  };

  const handleAddUrl = () => {
    if (!newUrl.trim()) return;

    try {
      new URL(newUrl.trim()); // Validate URL
      addToQueue(newUrl.trim(), 'high');
      setNewUrl('');
      setShowAddForm(false);
    } catch {
      // Invalid URL
    }
  };

  const estimatedTime = state.queue.length * (state.config.processingIntervalMinutes || 30);

  return (
    <div className="glass-card border border-white/10 rounded-2xl flex flex-col h-[400px] shadow-2xl overflow-hidden relative group">
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -z-10 -translate-x-1/2 translate-y-1/2" />

      <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5 backdrop-blur-md z-10">
        <h3 className="font-bold text-white flex items-center gap-2.5 text-sm">
          <div className="p-1.5 bg-primary/20 rounded-lg">
            <Target className="w-4 h-4 text-primary" />
          </div>
          Processing Queue
          <span className="text-[10px] font-medium text-zinc-400 bg-black/30 px-2 py-0.5 rounded-full border border-white/5">
            {state.queue.length}
          </span>
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={cn(
            "p-1.5 rounded-lg transition-all",
            showAddForm
              ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105"
              : "text-zinc-400 hover:text-primary hover:bg-white/10"
          )}
          title="Add URL to queue"
        >
          <Plus className={cn("w-4 h-4 transition-transform", showAddForm && "rotate-45")} />
        </button>
      </div>

      {/* Add URL Form */}
      {showAddForm && (
        <div className="p-4 border-b border-white/10 bg-white/5 animate-in slide-in-from-top-2">
          <div className="flex gap-2">
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://example.com/post-url"
              className="flex-1 px-3 py-2 text-sm bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
            />
            <button
              onClick={handleAddUrl}
              disabled={!newUrl.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg hover:shadow-primary/20"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/10 backdrop-blur-sm p-2 space-y-1">
        {state.queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3">
              <Target className="w-6 h-6 text-zinc-600" />
            </div>
            <p className="text-sm font-medium text-zinc-400">Queue Empty</p>
            <p className="text-xs text-zinc-600 mt-1 max-w-[200px] text-center">Add URLs manually or wait for the scanner.</p>
          </div>
        ) : (
          state.queue.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "group flex items-center gap-3 p-3 rounded-xl border transition-all hover:translate-x-1",
                index === 0 && state.status === 'running'
                  ? "bg-primary/10 border-primary/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                  : "bg-white/5 border-white/5 hover:bg-white/10"
              )}
            >
              <div className="flex flex-col items-center gap-1 w-8">
                <span className="text-[10px] font-mono text-zinc-500">#{index + 1}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border",
                    getPriorityColor(item.priority)
                  )}>
                    {item.priority}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono capitalize">
                    {item.source}
                  </span>
                </div>

                <p className={cn(
                  "text-sm font-bold truncate mb-1",
                  index === 0 && state.status === 'running' ? "text-primary" : "text-zinc-200 group-hover:text-white"
                )}>
                  {getSlug(item.url)}
                </p>

                <div className="flex items-center gap-3 text-xs">
                  <span className={cn(
                    "font-mono font-medium",
                    getHealthColor(item.healthScore)
                  )}>
                    Score: {item.healthScore}
                  </span>
                  {item.retryCount > 0 && (
                    <span className="text-yellow-400 flex items-center gap-1 text-[10px] bg-yellow-500/10 px-1.5 rounded">
                      <AlertCircle className="w-3 h-3" /> Retry #{item.retryCount}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => removeFromQueue(item.id)}
                className="p-2 text-zinc-600 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                title="Remove from queue"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Queue Stats */}
      {state.queue.length > 0 && (
        <div className="px-4 py-3 border-t border-white/10 bg-white/5 backdrop-blur-md z-10">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              Est. time: <span className="text-zinc-300">~{estimatedTime} min</span>
            </div>
            <div className="flex gap-4">
              {state.queue.some(q => q.priority === 'critical') && (
                <span className="text-red-400 flex items-center gap-1">
                  {state.queue.filter(q => q.priority === 'critical').length} critical
                </span>
              )}
              {state.queue.some(q => q.priority === 'high') && (
                <span className="text-orange-400 flex items-center gap-1">
                  {state.queue.filter(q => q.priority === 'high').length} high
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
