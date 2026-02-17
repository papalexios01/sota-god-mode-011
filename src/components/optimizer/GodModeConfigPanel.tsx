/**
 * God Mode 2.0 - Configuration Panel
 * 
 * Full configuration interface for customizing the
 * autonomous engine behavior.
 */

import { useGodModeEngine } from '@/hooks/useGodModeEngine';
import { Settings, Clock, Zap, FileText, Calendar, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GodModeConfigPanelProps {
  onClose: () => void;
}

export function GodModeConfigPanel({ onClose }: GodModeConfigPanelProps) {
  const { state, updateConfig, isRunning } = useGodModeEngine();
  const config = state.config;

  const handleChange = (key: string, value: any) => {
    updateConfig({ [key]: value });
  };

  return (
    <div className="glass-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2" />

      <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5 backdrop-blur-md">
        <h3 className="font-bold text-white flex items-center gap-3 text-lg">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          God Mode Configuration
        </h3>
        <button
          onClick={onClose}
          className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Scanning Settings */}
        <div className="space-y-5">
          <h4 className="font-bold text-zinc-200 flex items-center gap-2 text-sm uppercase tracking-wider">
            <Clock className="w-4 h-4 text-primary" />
            Scanning
          </h4>

          <div className="group">
            <label className="block text-xs font-medium text-zinc-400 mb-2 group-hover:text-primary transition-colors">
              Scan Interval
            </label>
            <select
              value={config.scanIntervalHours}
              onChange={(e) => handleChange('scanIntervalHours', Number(e.target.value))}
              disabled={isRunning}
              className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 disabled:opacity-50 transition-all"
            >
              <option value={1}>Every 1 hour</option>
              <option value={4}>Every 4 hours</option>
              <option value={12}>Every 12 hours</option>
              <option value={24}>Every 24 hours</option>
            </select>
          </div>

          <div className="group">
            <label className="block text-xs font-medium text-zinc-400 mb-2 group-hover:text-primary transition-colors">
              Min Health Score Threshold
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                value={config.minHealthScore}
                onChange={(e) => handleChange('minHealthScore', Number(e.target.value))}
                disabled={isRunning}
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 disabled:opacity-50 transition-all font-mono"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">%</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1.5 flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-500" />
              Pages below this score are optimized
            </p>
          </div>
        </div>

        {/* Processing Settings */}
        <div className="space-y-5">
          <h4 className="font-bold text-zinc-200 flex items-center gap-2 text-sm uppercase tracking-wider">
            <Zap className="w-4 h-4 text-primary" />
            Processing
          </h4>

          <div className="group">
            <label className="block text-xs font-medium text-zinc-400 mb-2 group-hover:text-primary transition-colors">
              Processing Interval
            </label>
            <div className="relative">
              <input
                type="number"
                min={5}
                max={120}
                value={config.processingIntervalMinutes}
                onChange={(e) => handleChange('processingIntervalMinutes', Number(e.target.value))}
                disabled={isRunning}
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 disabled:opacity-50 transition-all font-mono"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">min</span>
            </div>
          </div>

          <div className="group">
            <label className="block text-xs font-medium text-zinc-400 mb-2 group-hover:text-primary transition-colors">
              Quality Threshold
            </label>
            <div className="relative">
              <input
                type="number"
                min={50}
                max={100}
                value={config.qualityThreshold}
                onChange={(e) => handleChange('qualityThreshold', Number(e.target.value))}
                disabled={isRunning}
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 disabled:opacity-50 transition-all font-mono"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">%</span>
            </div>
          </div>

          <div className="group">
            <label className="block text-xs font-medium text-zinc-400 mb-2 group-hover:text-primary transition-colors">
              Retry Attempts
            </label>
            <select
              value={config.retryAttempts}
              onChange={(e) => handleChange('retryAttempts', Number(e.target.value))}
              disabled={isRunning}
              className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 disabled:opacity-50 transition-all"
            >
              <option value={0}>No retries</option>
              <option value={1}>1 retry</option>
              <option value={2}>2 retries</option>
              <option value={3}>3 retries</option>
            </select>
          </div>
        </div>

        {/* Publishing Settings */}
        <div className="space-y-5">
          <h4 className="font-bold text-zinc-200 flex items-center gap-2 text-sm uppercase tracking-wider">
            <FileText className="w-4 h-4 text-primary" />
            Publishing
          </h4>

          <div>
            <label className="flex items-start gap-3 cursor-pointer p-3 bg-black/20 rounded-xl border border-white/5 hover:bg-white/5 transition-colors group">
              <input
                type="checkbox"
                checked={config.autoPublish}
                onChange={(e) => handleChange('autoPublish', e.target.checked)}
                disabled={isRunning}
                className="mt-1 w-4 h-4 rounded border-white/20 bg-black/40 text-primary focus:ring-primary/50 disabled:opacity-50"
              />
              <div>
                <span className="text-sm font-medium text-white group-hover:text-primary transition-colors">Auto-publish Strategy</span>
                <p className="text-xs text-zinc-500 mt-1">
                  {config.autoPublish ? "Posts go live automatically" : "Queue for manual review"}
                </p>
              </div>
            </label>
          </div>

          <div className="group">
            <label className="block text-xs font-medium text-zinc-400 mb-2 group-hover:text-primary transition-colors">
              Default Post Status
            </label>
            <select
              value={config.defaultStatus}
              onChange={(e) => handleChange('defaultStatus', e.target.value)}
              disabled={isRunning}
              className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 disabled:opacity-50 transition-all"
            >
              <option value="draft">Draft (Recommended)</option>
              <option value="publish">Publish Immediately</option>
            </select>
          </div>

          <div className="group">
            <label className="block text-xs font-medium text-zinc-400 mb-2 group-hover:text-primary transition-colors">
              Max Articles Per Day
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={50}
                value={config.maxPerDay}
                onChange={(e) => handleChange('maxPerDay', Number(e.target.value))}
                disabled={isRunning}
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 disabled:opacity-50 transition-all font-mono"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">/ day</span>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Settings */}
      <div className="p-8 pt-0 border-t border-white/5 mt-2">
        <h4 className="font-bold text-zinc-200 flex items-center gap-2 text-sm uppercase tracking-wider mb-6 mt-6">
          <Calendar className="w-4 h-4 text-primary" />
          Schedule Operations
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="group">
            <label className="block text-xs font-medium text-zinc-400 mb-2 group-hover:text-primary transition-colors">
              Active Hours Start
            </label>
            <select
              value={config.activeHoursStart}
              onChange={(e) => handleChange('activeHoursStart', Number(e.target.value))}
              disabled={isRunning}
              className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 disabled:opacity-50 transition-all"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i.toString().padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>

          <div className="group">
            <label className="block text-xs font-medium text-zinc-400 mb-2 group-hover:text-primary transition-colors">
              Active Hours End
            </label>
            <select
              value={config.activeHoursEnd}
              onChange={(e) => handleChange('activeHoursEnd', Number(e.target.value))}
              disabled={isRunning}
              className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 disabled:opacity-50 transition-all"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i.toString().padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-3 cursor-pointer mt-8 p-3 hover:bg-white/5 rounded-xl transition-colors">
              <input
                type="checkbox"
                checked={config.enableWeekends}
                onChange={(e) => handleChange('enableWeekends', e.target.checked)}
                disabled={isRunning}
                className="w-4 h-4 rounded border-white/20 bg-black/40 text-primary focus:ring-primary/50 disabled:opacity-50"
              />
              <span className="text-sm font-medium text-white">Process on weekends</span>
            </label>
          </div>
        </div>
      </div>

      {isRunning && (
        <div className="px-8 pb-8">
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-sm text-yellow-500 font-medium flex items-center gap-3">
            <Settings className="w-5 h-5 animate-spin-slow" />
            Configuration is locked while God Mode is running. Stop the engine to make changes.
          </div>
        </div>
      )}
    </div>
  );
}
