import { useState } from "react";
import { Zap, Sparkles, LayoutGrid, Shield } from "lucide-react";
import { OptimizerDashboard } from "@/components/optimizer/OptimizerDashboard";

const features = [
  {
    icon: Zap,
    title: "God Mode 2.0",
    description: "Autonomous content optimization that never sleeps. Set it and forget it while your content climbs the rankings 24/7.",
  },
  {
    icon: Sparkles,
    title: "Gap Analysis",
    description: "State-of-the-art content analysis using NLP, entity extraction, and competitor insights powered by NeuronWriter integration.",
  },
  {
    icon: LayoutGrid,
    title: "Bulk Publishing",
    description: "Generate and publish hundreds of optimized articles with one click. Scale your content empire effortlessly.",
  },
  {
    icon: Shield,
    title: "Rank Guardian",
    description: "Real-time monitoring and automatic fixes for content health. Protect your rankings 24/7 with AI-powered alerts.",
  },
];

const Index = () => {
  const [showOptimizer, setShowOptimizer] = useState(false);

  if (showOptimizer) {
    return <OptimizerDashboard />;
  }

  return (
    <div className="min-h-screen gradient-bg selection:bg-primary/30 selection:text-foreground relative overflow-hidden">
      <div className="hero-glow animate-pulse-glow" />

      {/* Header */}
      <header className="px-6 py-4 sticky top-0 z-50 backdrop-blur-md bg-background/10 border-b border-white/5 supports-[backdrop-filter]:bg-background/20">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center glass-card shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <Zap className="w-6 h-6 text-primary drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-sm">
              WP Content Optimizer <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">PRO</span>
            </h1>
            <p className="text-xs text-zinc-400 font-medium tracking-wide">
              ENTERPRISE-GRADE SEO AUTOMATION
            </p>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="px-6 py-20 md:py-32 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card border-primary/20 text-primary text-sm font-medium mb-8 animate-float">
            <Sparkles className="w-4 h-4" />
            <span>v3.0 Now Available: The Ultimate SEO Weapon</span>
          </div>

          <h2 className="text-5xl md:text-7xl font-extrabold text-white mb-4 tracking-tight leading-tight drop-shadow-2xl">
            Turn Your Content Into
          </h2>
          <h2 className="text-5xl md:text-7xl font-extrabold mb-8 tracking-tight leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-400 to-accent drop-shadow-[0_0_30px_rgba(16,185,129,0.4)]">
              Premium Ranking Assets
            </span>
          </h2>
          <p className="text-lg md:text-xl text-zinc-400 max-w-3xl mx-auto mb-12 leading-relaxed font-light">
            Autonomous AI agents that analyze, optimize, and dominate Google's algorithm in real-time.
            <span className="text-zinc-200"> Experience the God Mode advantage.</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <button
              onClick={() => setShowOptimizer(true)}
              className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-primary text-white font-bold text-lg rounded-full hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_40px_rgba(16,185,129,0.6)] hover:scale-105"
            >
              <Zap className="w-6 h-6 fill-current" />
              Launch God Mode
              <div className="absolute inset-0 rounded-full ring-2 ring-white/20 group-hover:ring-white/40 transition-all" />
            </button>
            <button className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-background/30 backdrop-blur-sm border border-white/10 text-white font-semibold text-lg rounded-full hover:bg-white/5 transition-all hover:border-white/20">
              <Sparkles className="w-5 h-5 text-accent group-hover:text-accent/80" />
              View Features
            </button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="max-w-7xl mx-auto mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <div
              key={feature.title}
              className="glass-card rounded-2xl p-8 hover:border-primary/50 transition-all duration-500 group relative overflow-hidden"
              style={{ transitionDelay: `${idx * 100}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="w-14 h-14 bg-gradient-to-br from-gray-800 to-black border border-white/5 rounded-2xl flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform duration-500">
                <feature.icon className="w-7 h-7 text-primary group-hover:text-emerald-300 transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-12 border-t border-white/5 mt-auto bg-black/20 backdrop-blur-sm relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-transparent border border-white/10 rounded-xl flex items-center justify-center backdrop-blur-md">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 font-medium">
                Engineered by <span className="text-white">Alexios Papaioannou</span>
              </p>
              <a href="https://affiliatemarketingforsuccess.com" className="text-xs text-primary hover:text-emerald-300 transition-colors hover:underline underline-offset-4">
                affiliatemarketingforsuccess.com
              </a>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-zinc-500 font-medium">
            {["Terms", "Privacy", "Support", "Documentation"].map((item) => (
              <a
                key={item}
                href="#"
                className="hover:text-primary transition-all hover:scale-105 transform cursor-pointer"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
