import { Settings, BarChart3, FileText, Check, Zap, Bot } from "lucide-react";
import { useOptimizerStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const steps = [
  { id: 1, label: "Setup & Config", sublabel: "API keys, WordPress", icon: Settings },
  { id: 2, label: "Strategy & Planning", sublabel: "Gap analysis, clusters", icon: BarChart3 },
  { id: 3, label: "Review & Export", sublabel: "Publish content", icon: FileText },
];

export function OptimizerNav() {
  const { currentStep, setCurrentStep, contentItems, godModeState } = useOptimizerStore();

  const totalItems = contentItems.length;
  const completedItems = contentItems.filter((i) => i.status === "completed").length;
  const isGodModeRunning = godModeState.status === 'running';
  const isGodModePaused = godModeState.status === 'paused';

  return (
    <aside className="w-72 bg-background/30 backdrop-blur-xl border-r border-white/10 flex flex-col z-20 relative shadow-2xl">
      <div className="p-6 border-b border-white/5 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-lg tracking-tight">Optimizer</span>
            <div className="text-[10px] text-primary font-bold tracking-widest uppercase">Start Here</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {steps.map((step) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <button
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              className={cn(
                "w-full flex items-start gap-3 p-4 rounded-xl text-left transition-all duration-300 group relative overflow-hidden",
                isActive
                  ? "bg-primary/10 border border-primary/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                  : "hover:bg-white/5 border border-transparent hover:border-white/10"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl shadow-[0_0_10px_#10b981]" />
              )}

              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-300",
                  isActive
                    ? "bg-gradient-to-br from-primary to-emerald-600 text-white shadow-lg"
                    : isCompleted
                      ? "bg-primary/20 text-primary"
                      : "bg-surface-200/50 text-muted-foreground group-hover:bg-white/10 group-hover:text-white"
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <step.icon className={cn("w-5 h-5", isActive && "animate-pulse")} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "font-bold text-sm mb-0.5",
                    isActive ? "text-primary tracking-wide" : "text-zinc-400 group-hover:text-white"
                  )}
                >
                  {step.label}
                </div>
                <div className={cn(
                  "text-xs truncate transition-colors",
                  isActive ? "text-primary/70" : "text-zinc-600 group-hover:text-zinc-400"
                )}>
                  {step.sublabel}
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* God Mode Status */}
      {(isGodModeRunning || isGodModePaused) && (
        <div className="mx-4 mb-4 p-3 bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 rounded-xl">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Bot className="w-4 h-4" />
            God Mode 2.0
            <span className={cn(
              "ml-auto px-1.5 py-0.5 text-xs rounded",
              isGodModeRunning ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
            )}>
              {isGodModeRunning ? 'ACTIVE' : 'PAUSED'}
            </span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {godModeState.currentPhase ? (
              <span className="capitalize">{godModeState.currentPhase}...</span>
            ) : (
              <span>Queue: {godModeState.queue.length} items</span>
            )}
          </div>
        </div>
      )}

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className={cn(
            "w-2 h-2 rounded-full animate-pulse",
            isGodModeRunning ? "bg-green-500" : "bg-primary"
          )} />
          <span>{isGodModeRunning ? 'God Mode Active' : 'System Ready'}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {totalItems} items • {completedItems} done
          {isGodModeRunning && ` • Cycle ${godModeState.stats.cycleCount}`}
        </div>
      </div>
    </aside>
  );
}
