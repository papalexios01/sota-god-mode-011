// ENHANCED GENERATION MODAL - SOTA Progress Tracking

import { useState, useEffect, useRef } from 'react';
import {
  Loader2, Check, AlertCircle, Sparkles, X,
  Brain, Search, Youtube, BookOpen, FileText,
  Link2, Shield, Zap, Target, Clock, TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GenerationStep {
  id: string;
  label: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error' | 'skipped';
  message?: string;
  duration?: number;
  icon: React.ReactNode;
}

interface GeneratingItem {
  id: string;
  title: string;
  keyword: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  progress: number;
  currentStep?: string;
  error?: string;
}

interface EnhancedGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: GeneratingItem[];
  currentItemIndex: number;
  overallProgress: number;
  steps: GenerationStep[];
  error?: string;
}

const DEFAULT_STEPS: GenerationStep[] = [
  {
    id: 'research',
    label: 'SERP Analysis',
    description: 'Analyzing top-ranking content',
    status: 'pending',
    icon: <Search className="w-4 h-4" />
  },
  {
    id: 'videos',
    label: 'YouTube Discovery',
    description: 'Finding relevant video content',
    status: 'pending',
    icon: <Youtube className="w-4 h-4" />
  },
  {
    id: 'references',
    label: 'Reference Gathering',
    description: 'Collecting authoritative sources',
    status: 'pending',
    icon: <BookOpen className="w-4 h-4" />
  },
  {
    id: 'outline',
    label: 'Content Outline',
    description: 'Structuring the article',
    status: 'pending',
    icon: <FileText className="w-4 h-4" />
  },
  {
    id: 'content',
    label: 'AI Generation',
    description: 'Creating comprehensive content',
    status: 'pending',
    icon: <Brain className="w-4 h-4" />
  },
  {
    id: 'enhance',
    label: 'Content Enhancement',
    description: 'Optimizing for readability',
    status: 'pending',
    icon: <Sparkles className="w-4 h-4" />
  },
  {
    id: 'links',
    label: 'Internal Linking',
    description: 'Adding strategic links',
    status: 'pending',
    icon: <Link2 className="w-4 h-4" />
  },
  {
    id: 'validate',
    label: 'Quality Validation',
    description: 'Ensuring content standards',
    status: 'pending',
    icon: <Target className="w-4 h-4" />
  },
  {
    id: 'schema',
    label: 'Schema Generation',
    description: 'Creating structured data',
    status: 'pending',
    icon: <Shield className="w-4 h-4" />
  },
];

export function EnhancedGenerationModal({
  isOpen,
  onClose,
  items,
  currentItemIndex,
  overallProgress,
  steps = DEFAULT_STEPS,
  error
}: EnhancedGenerationModalProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [itemStartTimes, setItemStartTimes] = useState<Record<string, number>>({});
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setElapsedTime(0);
      startTimeRef.current = null;
      return;
    }

    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    const interval = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    // Track start time for each item
    const currentItem = items[currentItemIndex];
    if (currentItem && currentItem.status === 'generating' && !itemStartTimes[currentItem.id]) {
      setItemStartTimes(prev => ({
        ...prev,
        [currentItem.id]: Date.now()
      }));
    }
  }, [currentItemIndex, items, itemStartTimes]);

  if (!isOpen) return null;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const completedItems = items.filter(i => i.status === 'completed').length;
  const failedItems = items.filter(i => i.status === 'error').length;
  const totalItems = items.length;
  const currentItem = items[currentItemIndex];
  const hasError = failedItems > 0 || !!error;
  const isComplete = completedItems === totalItems && !error;

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const currentStep = steps.find(s => s.status === 'running');

  // Estimate remaining time based on average
  const avgTimePerItem = elapsedTime / Math.max(completedItems, 1);
  const remainingItems = totalItems - completedItems;
  const estimatedRemaining = Math.round(avgTimePerItem * remainingItems);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="glass-card border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl -z-10 -translate-x-1/2 translate-y-1/2" />
        {/* Header */}
        <div className="p-8 border-b border-white/10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-5">
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center relative shadow-lg",
                hasError ? "bg-red-500/20 border border-red-500/30" : isComplete ? "bg-emerald-500/20 border border-emerald-500/30" : "bg-primary/20 border border-primary/30"
              )}>
                {hasError ? (
                  <AlertCircle className="w-8 h-8 text-red-400" />
                ) : isComplete ? (
                  <Check className="w-8 h-8 text-emerald-400" />
                ) : (
                  <>
                    <Brain className="w-8 h-8 text-primary animate-pulse" />
                    <div className="absolute inset-0 rounded-2xl border-2 border-primary/50 animate-ping opacity-20" />
                  </>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  {hasError ? 'Generation Error' : isComplete ? 'Mission Complete!' : 'Forging Content'}
                </h2>
                <p className="text-sm text-zinc-400 font-medium">
                  {completedItems} of {totalItems} articles • {formatTime(elapsedTime)} elapsed
                </p>
              </div>
            </div>
            {(isComplete || hasError) && (
              <button
                onClick={onClose}
                className="p-3 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition-all hover:rotate-90 duration-300"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Overall Progress */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Overall Progress</span>
              </div>
              <span className="text-2xl font-bold text-primary">{overallProgress}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden relative">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden",
                  hasError ? "bg-destructive" : "bg-gradient-to-r from-primary to-green-500"
                )}
                style={{ width: `${overallProgress}%` }}
              >
                {!isComplete && !hasError && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                )}
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {completedItems > 0 && remainingItems > 0
                  ? `~${formatTime(estimatedRemaining)} remaining`
                  : 'Calculating...'}
              </span>
              <span>
                {completedItems} completed • {failedItems > 0 ? `${failedItems} failed • ` : ''}{remainingItems} remaining
              </span>
            </div>
          </div>
        </div>

        {/* Current Item */}
        {currentItem && (
          <div className="p-6 border-b border-white/10 bg-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center shadow-inner">
                {currentItem.status === 'generating' ? (
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                ) : currentItem.status === 'completed' ? (
                  <Check className="w-6 h-6 text-emerald-400" />
                ) : currentItem.status === 'error' ? (
                  <X className="w-6 h-6 text-red-400" />
                ) : (
                  <Clock className="w-6 h-6 text-zinc-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-lg truncate mb-1">{currentItem.title}</div>
                <div className="text-sm text-zinc-400 truncate flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50"></span>
                  {currentItem.keyword}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary text-glow">{currentItem.progress}%</div>
                {currentStep && (
                  <div className="text-xs text-zinc-400 font-medium uppercase tracking-wider">{currentStep.label}</div>
                )}
              </div>
            </div>
            {/* Item Progress */}
            <div className="mt-5 h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                style={{ width: `${currentItem.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="p-6 max-h-[300px] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {steps.map((step) => (
              <div
                key={step.id}
                className={cn(
                  "p-4 rounded-xl transition-all border flex items-center gap-4 group",
                  step.status === 'running' && "bg-primary/10 border-primary/50 shadow-[0_0_20px_rgba(16,185,129,0.15)] scale-[1.02]",
                  step.status === 'completed' && "bg-emerald-500/5 border-emerald-500/20",
                  step.status === 'error' && "bg-red-500/5 border-red-500/20",
                  step.status === 'pending' && "bg-white/5 border-white/5 hover:bg-white/10",
                  step.status === 'skipped' && "bg-white/5 border-white/5 opacity-40"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors shadow-inner",
                  step.status === 'pending' && "bg-black/20 text-zinc-500",
                  step.status === 'running' && "bg-primary text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]",
                  step.status === 'completed' && "bg-emerald-500/20 text-emerald-400",
                  step.status === 'error' && "bg-red-500/20 text-red-400",
                  step.status === 'skipped' && "bg-black/20 text-zinc-600"
                )}>
                  {step.status === 'running' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : step.status === 'completed' ? (
                    <Check className="w-5 h-5" />
                  ) : step.status === 'error' ? (
                    <X className="w-5 h-5" />
                  ) : (
                    step.icon
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "font-bold text-sm mb-0.5",
                    step.status === 'running' ? "text-white" : "text-zinc-300"
                  )}>
                    {step.label}
                  </div>
                  <div className="text-xs text-zinc-500 truncate">
                    {step.message || step.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Item Queue */}
        {items.length > 1 && (
          <div className="p-4 border-t border-border">
            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Zap className="w-3 h-3" />
              Generation Queue ({completedItems}/{totalItems})
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex-shrink-0 w-2.5 h-2.5 rounded-full transition-all",
                    item.status === 'completed' && "bg-green-500",
                    item.status === 'generating' && "bg-primary animate-pulse scale-125",
                    item.status === 'error' && "bg-destructive",
                    item.status === 'pending' && "bg-muted-foreground/30"
                  )}
                  title={item.title}
                />
              ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 mx-4 mb-4 bg-destructive/10 border border-destructive/30 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-destructive">Generation Error</div>
                <p className="text-sm text-destructive/80 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-black/20 backdrop-blur-md">
          {isComplete ? (
            <button
              onClick={onClose}
              className="w-full px-6 py-4 bg-gradient-to-r from-primary to-emerald-500 text-white font-bold text-lg rounded-2xl hover:brightness-110 transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_50px_rgba(16,185,129,0.4)] hover:-translate-y-1"
            >
              <Sparkles className="w-6 h-6 fill-current" />
              View Generated Content
            </button>
          ) : hasError ? (
            <button
              onClick={onClose}
              className="w-full px-6 py-4 bg-white/10 text-white font-bold text-lg rounded-2xl hover:bg-white/20 transition-all border border-white/10"
            >
              Close and Review Errors
            </button>
          ) : (
            <div className="flex items-center justify-center gap-4 text-zinc-400">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm font-medium">
                {currentStep
                  ? `${currentStep.label}: ${currentStep.description}...`
                  : 'Initializing neural generation pipeline...'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}

export default EnhancedGenerationModal;
