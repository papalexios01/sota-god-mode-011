import { useOptimizerStore } from "@/lib/store";
import { OptimizerNav } from "./OptimizerNav";
import { SetupConfig } from "./steps/SetupConfig";
import { ContentStrategy } from "./steps/ContentStrategy";
import { ReviewExport } from "./steps/ReviewExport";

export function OptimizerDashboard() {
  const { currentStep } = useOptimizerStore();

  return (
    <div className="min-h-screen gradient-bg flex relative overflow-hidden">
      <div className="hero-glow animate-pulse-glow" style={{ opacity: 0.3 }} />
      <OptimizerNav />
      <main className="flex-1 overflow-auto relative z-10 custom-scrollbar">
        <div className="p-8 max-w-7xl mx-auto animate-fade-in">
          {currentStep === 1 && <SetupConfig />}
          {currentStep === 2 && <ContentStrategy />}
          {currentStep === 3 && <ReviewExport />}
        </div>
      </main>
    </div>
  );
}
