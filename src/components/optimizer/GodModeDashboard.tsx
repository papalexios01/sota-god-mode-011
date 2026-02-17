import { useState, useMemo } from 'react';
import { useGodModeEngine } from '@/hooks/useGodModeEngine';
import { useOptimizerStore } from '@/lib/store';
import {
  Zap, Play, Pause, Square, Settings, Activity, Clock,
  CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw,
  BarChart3, FileText, ExternalLink, Target, TrendingUp, Eye,
  Shield, Gauge, Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { GodModeConfigPanel } from './GodModeConfigPanel';
import { GodModeActivityFeed } from './GodModeActivityFeed';
import { GodModeQueuePanel } from './GodModeQueuePanel';
import { GodModeContentPreview } from './GodModeContentPreview';
import type { GodModeHistoryItem } from '@/lib/sota/GodModeTypes';

export function GodModeDashboard() {
  const { state, isRunning, isPaused, start, stop, pause, resume } = useGodModeEngine();
  const { sitemapUrls, priorityUrls, priorityOnlyMode, setPriorityOnlyMode } = useOptimizerStore();
  const [showConfig, setShowConfig] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [previewItem, setPreviewItem] = useState<GodModeHistoryItem | null>(null);

  const priorityProgress = useMemo(() => {
    if (!priorityOnlyMode || priorityUrls.length === 0) return null;
    const completed = state.stats.totalProcessed;
    const total = priorityUrls.length;
    const pct = Math.min(100, Math.round((completed / total) * 100));
    return { completed, total, pct };
  }, [priorityOnlyMode, priorityUrls.length, state.stats.totalProcessed]);

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await start();
      toast.success('God Mode activated!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start God Mode');
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = () => {
    stop();
    toast.info('God Mode stopped');
  };

  const handlePauseResume = () => {
    if (isPaused) {
      resume();
      toast.info('God Mode resumed');
    } else {
      pause();
      toast.info('God Mode paused');
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getPhaseLabel = () => {
    switch (state.currentPhase) {
      case 'scanning': return 'Scanning Sitemap';
      case 'scoring': return 'Scoring Pages';
      case 'generating': return 'Generating Content';
      case 'publishing': return 'Publishing';
      default: return 'Idle';
    }
  };

  const getPhaseIcon = () => {
    switch (state.currentPhase) {
      case 'scanning': return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'scoring': return <Gauge className="w-4 h-4" />;
      case 'generating': return <Zap className="w-4 h-4" />;
      case 'publishing': return <ExternalLink className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-5">
      {/* Priority Only Mode Banner */}
      {priorityOnlyMode && (
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border border-amber-500/30 rounded-2xl p-5">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center border border-amber-500/20">
                <Target className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-amber-300 text-lg tracking-tight">
                  Priority Only Mode
                </h3>
                <p className="text-sm text-amber-400/70 mt-0.5">
                  Processing {priorityUrls.length} priority URL{priorityUrls.length !== 1 ? 's' : ''} exclusively. Sitemap scanning disabled.
                </p>
              </div>
            </div>
            <button
              onClick={() => setPriorityOnlyMode(false)}
              disabled={isRunning}
              className="px-4 py-2 bg-amber-500/15 text-amber-300 rounded-lg text-sm font-medium border border-amber-500/20 hover:bg-amber-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Switch to Full Sitemap
            </button>
          </div>

          {/* Progress bar for priority mode */}
          {priorityProgress && isRunning && (
            <div className="mt-4 relative">
              <div className="flex items-center justify-between text-xs text-amber-400/70 mb-1.5">
                <span>{priorityProgress.completed} of {priorityProgress.total} processed</span>
                <span>{priorityProgress.pct}%</span>
              </div>
              <div className="h-2 bg-amber-900/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${priorityProgress.pct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Header Section */}
      <div className="glass-card rounded-3xl overflow-hidden relative group backdrop-blur-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-50" />
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative w-14 h-14 bg-gradient-to-br from-teal-500/20 to-emerald-500/20 rounded-2xl flex items-center justify-center border border-teal-500/20">
                <Zap className="w-7 h-7 text-teal-400" />
                {isRunning && !isPaused && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-card">
                    <span className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75" />
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-foreground tracking-tight">God Mode 2.0</h2>
                  <span className={cn(
                    "px-2.5 py-1 text-[11px] font-semibold rounded-md uppercase tracking-wider",
                    state.status === 'running' && "bg-green-500/15 text-green-400 border border-green-500/20",
                    state.status === 'paused' && "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20",
                    state.status === 'error' && "bg-red-500/15 text-red-400 border border-red-500/20",
                    state.status === 'idle' && "bg-muted text-muted-foreground border border-border"
                  )}>
                    {state.status}
                  </span>
                  {priorityOnlyMode && (
                    <span className="px-2.5 py-1 text-[11px] font-semibold rounded-md uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/20">
                      Priority Only
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {priorityOnlyMode
                    ? `Targeted optimization for ${priorityUrls.length} priority URLs`
                    : `Autonomous SEO maintenance engine`
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {!isRunning && !priorityOnlyMode && priorityUrls.length > 0 && (
                <button
                  onClick={() => setPriorityOnlyMode(true)}
                  className="px-3.5 py-2.5 bg-amber-500/10 text-amber-400 rounded-xl text-sm font-medium border border-amber-500/15 hover:bg-amber-500/20 transition-all flex items-center gap-2"
                >
                  <Target className="w-4 h-4" />
                  Priority Only
                </button>
              )}

              <button
                onClick={() => setShowConfig(!showConfig)}
                className={cn(
                  "p-2.5 rounded-xl transition-all border",
                  showConfig
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                )}
              >
                <Settings className="w-5 h-5" />
              </button>

              {isRunning ? (
                <>
                  <button
                    onClick={handlePauseResume}
                    className={cn(
                      "px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all border",
                      isPaused
                        ? "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"
                        : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20"
                    )}
                  >
                    {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={handleStop}
                    className="px-4 py-2.5 bg-red-500/10 text-red-400 rounded-xl font-medium flex items-center gap-2 border border-red-500/20 hover:bg-red-500/20 transition-all"
                  >
                    <Square className="w-4 h-4" />
                    Stop
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStart}
                  disabled={isStarting || (priorityOnlyMode ? priorityUrls.length === 0 : (sitemapUrls.length === 0 && priorityUrls.length === 0))}
                  className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-semibold flex items-center gap-2 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-teal-500/20"
                >
                  {isStarting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : priorityOnlyMode ? (
                    <Target className="w-4 h-4" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  {isStarting ? 'Starting...' : priorityOnlyMode ? `Process ${priorityUrls.length} URLs` : 'Start God Mode'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status strip */}
        <div className="grid grid-cols-4 border-t border-border divide-x divide-border bg-muted/20">
          <div className="px-5 py-3.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-0.5">
              <Activity className="w-3.5 h-3.5" />
              Cycle
            </div>
            <div className="text-xl font-bold text-foreground tabular-nums">
              {state.stats.cycleCount}
            </div>
          </div>
          <div className="px-5 py-3.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-0.5">
              <Target className="w-3.5 h-3.5" />
              Queue
            </div>
            <div className="text-xl font-bold text-foreground tabular-nums">
              {state.queue.length}
            </div>
          </div>
          <div className="px-5 py-3.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-0.5">
              <Clock className="w-3.5 h-3.5" />
              {priorityOnlyMode ? 'Mode' : 'Last Scan'}
            </div>
            <div className="text-base font-semibold text-foreground">
              {priorityOnlyMode ? 'Priority' : formatTime(state.stats.lastScanAt)}
            </div>
          </div>
          <div className="px-5 py-3.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-0.5">
              <RefreshCw className="w-3.5 h-3.5" />
              {priorityOnlyMode ? 'Remaining' : 'Next Scan'}
            </div>
            <div className="text-base font-semibold text-foreground tabular-nums">
              {priorityOnlyMode ? `${state.queue.length} / ${priorityUrls.length}` : formatTime(state.stats.nextScanAt)}
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Panel */}
      {
        showConfig && (
          <GodModeConfigPanel onClose={() => setShowConfig(false)} />
        )
      }

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-3">
        <StatCard
          icon={<FileText className="w-5 h-5 text-blue-400" />}
          iconBg="bg-blue-500/15"
          value={state.stats.totalProcessed}
          label="Processed"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5 text-green-400" />}
          iconBg="bg-green-500/15"
          value={state.stats.successCount}
          label="Success"
        />
        <StatCard
          icon={<XCircle className="w-5 h-5 text-red-400" />}
          iconBg="bg-red-500/15"
          value={state.stats.errorCount}
          label="Errors"
        />
        <StatCard
          icon={<TrendingUp className={cn(
            "w-5 h-5",
            state.stats.avgQualityScore >= 90 ? "text-emerald-400" :
              state.stats.avgQualityScore >= 80 ? "text-yellow-400" : "text-muted-foreground"
          )} />}
          iconBg={cn(
            state.stats.avgQualityScore >= 90 ? "bg-emerald-500/15" :
              state.stats.avgQualityScore >= 80 ? "bg-yellow-500/15" : "bg-muted"
          )}
          value={`${state.stats.avgQualityScore.toFixed(0)}%`}
          label="Avg Quality"
          valueColor={
            state.stats.avgQualityScore >= 90 ? "text-emerald-400" :
              state.stats.avgQualityScore >= 80 ? "text-yellow-400" : undefined
          }
        />
        <StatCard
          icon={<BarChart3 className="w-5 h-5 text-sky-400" />}
          iconBg="bg-sky-500/15"
          value={state.stats.totalWordsGenerated.toLocaleString()}
          label="Words"
        />
      </div>

      {/* SOTA Badge */}
      {
        state.stats.avgQualityScore >= 90 && state.stats.totalProcessed > 0 && (
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-500/25 rounded-xl">
            <Shield className="w-5 h-5 text-emerald-400" />
            <div className="flex-1">
              <span className="text-sm font-semibold text-emerald-300">
                SOTA Quality Achieved
              </span>
              <span className="text-sm text-emerald-400/70 ml-2">
                {state.stats.avgQualityScore.toFixed(1)}% avg across {state.stats.totalProcessed} articles
              </span>
            </div>
          </div>
        )
      }

      {/* Current Processing */}
      {
        state.currentUrl && (
          <div className="flex items-center gap-4 p-5 glass-card border border-primary/20 rounded-2xl animate-pulse-subtle bg-primary/5">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              {state.currentPhase === 'generating' ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : (
                getPhaseIcon()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-1">
                {getPhaseLabel()}
                {state.currentPhase === 'generating' && (
                  <Timer className="w-3 h-3 animate-pulse" />
                )}
              </div>
              <div className="text-base font-medium text-white truncate drop-shadow-sm">{state.currentUrl}</div>
            </div>
          </div>
        )
      }

      {/* Main Content Grid */}
      <div className="grid grid-cols-2 gap-5">
        <GodModeActivityFeed />
        <GodModeQueuePanel />
      </div>

      {/* History Section */}
      <div className="glass-card border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-md">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Processing History
          </h3>
          <span className="text-xs font-medium text-zinc-400 bg-black/20 px-2 py-1 rounded-lg tabular-nums border border-white/5">
            {state.history.length} items
          </span>
        </div>

        <div className="max-h-80 overflow-y-auto custom-scrollbar">
          {state.history.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-zinc-600" />
              </div>
              <p className="text-zinc-300 font-medium">No processing history yet</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs">Activate God Mode to begin the autonomous content generation cycle.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {state.history.map((item) => (
                <div key={item.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors group">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg",
                    item.action === 'published' && "bg-emerald-500/20 shadow-emerald-500/10",
                    item.action === 'generated' && "bg-blue-500/20 shadow-blue-500/10",
                    item.action === 'skipped' && "bg-amber-500/20",
                    item.action === 'error' && "bg-red-500/20"
                  )}>
                    {item.action === 'published' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {item.action === 'generated' && <FileText className="w-4 h-4 text-blue-400" />}
                    {item.action === 'skipped' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                    {item.action === 'error' && <XCircle className="w-4 h-4 text-red-400" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-zinc-200 truncate group-hover:text-white transition-colors">
                      {(() => {
                        try {
                          const urlPath = new URL(item.url).pathname;
                          return urlPath === '/' ? item.url : urlPath.split('/').filter(Boolean).pop() || item.url;
                        } catch {
                          return item.url;
                        }
                      })()}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(item.timestamp).toLocaleTimeString()}</span>
                      {item.qualityScore != null && (
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                          item.qualityScore >= 90 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            item.qualityScore >= 80 ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                              "bg-red-500/10 text-red-400 border-red-500/20"
                        )}>
                          QS: {item.qualityScore}%
                        </span>
                      )}
                      {item.wordCount != null && (
                        <span className="font-mono text-zinc-600">{item.wordCount.toLocaleString()} w</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.generatedContent && (
                      <button
                        onClick={() => setPreviewItem(item)}
                        className="p-2 text-zinc-400 hover:text-primary rounded-lg hover:bg-white/10 transition-colors"
                        title="View content"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    {item.wordPressUrl && (
                      <a
                        href={item.wordPressUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-zinc-400 hover:text-emerald-400 rounded-lg hover:bg-white/10 transition-colors"
                        title="View on WordPress"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Prerequisites Warning */}
      {
        sitemapUrls.length === 0 && priorityUrls.length === 0 && (
          <div className="flex items-center gap-3 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <p className="text-sm text-yellow-400/80">
              <span className="font-semibold text-yellow-400">No URLs available.</span> Crawl your sitemap in "Content Hub" or add priority URLs in "Gap Analysis" before starting.
            </p>
          </div>
        )
      }

      {/* Content Preview Modal */}
      {
        previewItem && (
          <GodModeContentPreview
            item={previewItem}
            onClose={() => setPreviewItem(null)}
          />
        )
      }
    </div >
  );
}

function StatCard({
  icon,
  iconBg,
  value,
  label,
  valueColor,
}: {
  icon: React.ReactNode;
  iconBg: string;
  value: string | number;
  label: string;
  valueColor?: string;
}) {
  return (
    <div className="glass-card hover:bg-white/5 transition-all duration-300 rounded-2xl p-5 hover:-translate-y-1 hover:shadow-lg border-white/5 group">
      <div className="flex items-center gap-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-110 transition-transform", iconBg.replace('bg-', 'bg-opacity-20 bg-'))}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className={cn("text-2xl font-bold tabular-nums truncate tracking-tight", valueColor || "text-white")}>
            {value}
          </div>
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</div>
        </div>
      </div>
    </div>
  );
}
