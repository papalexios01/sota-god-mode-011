import { useState, useEffect, useCallback, useRef } from "react";
import { useOptimizerStore } from "@/lib/store";
import { createNeuronWriterService } from "@/lib/sota/NeuronWriterService";
import {
  Key, Globe, User, Building, Image, UserCircle,
  Sparkles, MapPin, Check, AlertCircle, ExternalLink, Database,
  Settings, Loader2, FolderOpen, RefreshCw, XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
// ← CHANGED: Removed duplicate import (was declared twice in original)
import { getSupabaseConfig, saveSupabaseConfig, clearSupabaseConfig, validateSupabaseConfig } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { ensureTableExists, getLastDbCheckError } from "@/lib/api/contentPersistence";

const OPENROUTER_MODELS = [
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' },
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo' },
  { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5' },
  { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B' },
  { id: 'mistralai/mixtral-8x22b-instruct', name: 'Mixtral 8x22B' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat' },
  { id: 'cohere/command-r-plus', name: 'Command R+' },
];

const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' },
  { id: 'llama-3.1-70b-instant', name: 'Llama 3.1 70B Instant' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B' },
  { id: 'llama3-groq-70b-8192-tool-use-preview', name: 'Llama 3 70B Tool Use' },
];

export function SetupConfig() {
  const {
    config,
    setConfig,
    neuronWriterProjects,
    setNeuronWriterProjects,
    neuronWriterLoading,
    setNeuronWriterLoading,
    neuronWriterError,
    setNeuronWriterError
  } = useOptimizerStore();

  const [verifyingWp, setVerifyingWp] = useState(false);
  const [wpVerified, setWpVerified] = useState<boolean | null>(null);
  const [customOpenRouterModel, setCustomOpenRouterModel] = useState('');
  const [customGroqModel, setCustomGroqModel] = useState('');
  const [showCustomOpenRouter, setShowCustomOpenRouter] = useState(false);
  const [showCustomGroq, setShowCustomGroq] = useState(false);
  const [nwFetchAttempted, setNwFetchAttempted] = useState(false);

  const [sbUrl, setSbUrl] = useState(config.supabaseUrl || '');
  const [sbAnonKey, setSbAnonKey] = useState(config.supabaseAnonKey || '');
  const sbStatus = validateSupabaseConfig(sbUrl.trim(), sbAnonKey.trim());

  const configRef = useRef(config);
  configRef.current = config;

  const fetchNeuronWriterProjects = useCallback(async (apiKey: string) => {
    if (!apiKey || apiKey.trim().length < 10) {
      setNeuronWriterProjects([]);
      setNeuronWriterError(null);
      setNwFetchAttempted(false);
      return;
    }

    setNeuronWriterLoading(true);
    setNeuronWriterError(null);
    setNwFetchAttempted(true);

    try {
      const service = createNeuronWriterService(apiKey);
      const result = await service.listProjects();

      if (result.success && result.projects) {
        setNeuronWriterProjects(result.projects);
        setNeuronWriterError(null);

        if (result.projects.length > 0 && !configRef.current.neuronWriterProjectId) {
          setConfig({
            neuronWriterProjectId: result.projects[0].id,
            neuronWriterProjectName: result.projects[0].name
          });
        }
      } else {
        const errorMsg = result.error || 'Failed to fetch projects';
        setNeuronWriterError(errorMsg);
        setNeuronWriterProjects([]);
      }
    } catch (error) {
      console.error('NeuronWriter fetch error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      setNeuronWriterError(`Connection failed: ${message}`);
      setNeuronWriterProjects([]);
    } finally {
      setNeuronWriterLoading(false);
    }
  }, [setNeuronWriterProjects, setNeuronWriterLoading, setNeuronWriterError, setConfig]);

  useEffect(() => {
    if (config.enableNeuronWriter && config.neuronWriterApiKey && config.neuronWriterApiKey.trim().length >= 10) {
      const debounceTimer = setTimeout(() => {
        fetchNeuronWriterProjects(config.neuronWriterApiKey);
      }, 800);
      return () => clearTimeout(debounceTimer);
    }
  }, [config.enableNeuronWriter, config.neuronWriterApiKey, fetchNeuronWriterProjects]);

  const handleSaveSupabase = () => {
    const url = sbUrl.trim();
    const key = sbAnonKey.trim();
    const status = validateSupabaseConfig(url, key);
    if (!status.configured) return;

    setConfig({ supabaseUrl: url, supabaseAnonKey: key });
    saveSupabaseConfig(url, key);
  };

  const handleTestSupabase = async () => {
    try {
      const ok = await ensureTableExists();
      if (ok) {
        toast.success('Supabase connected ✓ History sync is online.');
        return;
      }
      const detail = getLastDbCheckError();
      if (!detail) {
        toast.error('Supabase not configured (missing URL or anon key).');
        return;
      }
      if (detail.kind === 'missing_table') {
        toast.error('Connected, but table generated_blog_posts is missing. Create it in Supabase SQL Editor.');
      } else if (detail.kind === 'rls') {
        toast.error('Connected, but RLS is blocking access. Update your RLS policy.');
      } else {
        toast.error(detail.message);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Supabase connection test failed');
    }
  };

  const handleClearSupabase = () => {
    setSbUrl('');
    setSbAnonKey('');
    setConfig({ supabaseUrl: '', supabaseAnonKey: '' });
    clearSupabaseConfig();
  };

  const handleReloadAfterSupabase = () => {
    window.location.reload();
  };

  const handleVerifyWordPress = async () => {
    if (!config.wpUrl || !config.wpUsername || !config.wpAppPassword) {
      return;
    }

    setVerifyingWp(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setWpVerified(true);
    } catch {
      setWpVerified(false);
    } finally {
      setVerifyingWp(false);
    }
  };

  const handleProjectSelect = (projectId: string) => {
    const project = neuronWriterProjects.find(p => p.id === projectId);
    setConfig({
      neuronWriterProjectId: projectId,
      neuronWriterProjectName: project?.name || ''
    });
  };

  const handleOpenRouterModelChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomOpenRouter(true);
    } else {
      setShowCustomOpenRouter(false);
      setConfig({ openrouterModelId: value });
    }
  };

  const handleGroqModelChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomGroq(true);
    } else {
      setShowCustomGroq(false);
      setConfig({ groqModelId: value });
    }
  };

  const handleCustomOpenRouterSubmit = () => {
    if (customOpenRouterModel.trim()) {
      setConfig({ openrouterModelId: customOpenRouterModel.trim() });
    }
  };

  const handleCustomGroqSubmit = () => {
    if (customGroqModel.trim()) {
      setConfig({ groqModelId: customGroqModel.trim() });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Settings className="w-7 h-7 text-primary" />
          1. Setup & Configuration
        </h1>
        <p className="text-muted-foreground mt-1">
          Connect your AI services and configure WordPress integration.
        </p>
      </div>

      {/* API Keys Section */}
      <section className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          API Keys
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="Google Gemini API Key"
            value={config.geminiApiKey}
            onChange={(v) => setConfig({ geminiApiKey: v })}
            type="password"
            placeholder="AIza..."
          />
          <InputField
            label="Serper API Key (Required for SOTA Research)"
            value={config.serperApiKey}
            onChange={(v) => setConfig({ serperApiKey: v })}
            type="password"
            placeholder="Enter Serper key..."
            required
          />
          <InputField
            label="OpenAI API Key"
            value={config.openaiApiKey}
            onChange={(v) => setConfig({ openaiApiKey: v })}
            type="password"
            placeholder="sk-..."
          />
          <InputField
            label="Anthropic API Key"
            value={config.anthropicApiKey}
            onChange={(v) => setConfig({ anthropicApiKey: v })}
            type="password"
            placeholder="sk-ant-..."
          />
          <InputField
            label="OpenRouter API Key"
            value={config.openrouterApiKey}
            onChange={(v) => setConfig({ openrouterApiKey: v })}
            type="password"
            placeholder="sk-or-..."
          />
          <InputField
            label="Groq API Key"
            value={config.groqApiKey}
            onChange={(v) => setConfig({ groqApiKey: v })}
            type="password"
            placeholder="gsk_..."
          />
        </div>
      </section>

      {/* Model Configuration */}
      <section className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Model Configuration
        </h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Primary Generation Model
            </label>
            <select
              value={config.primaryModel}
              onChange={(e) => setConfig({ primaryModel: e.target.value as any })}
              className="w-full md:w-80 px-4 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="gemini">Google Gemini 2.5 Flash</option>
              <option value="openai">OpenAI GPT-4o</option>
              <option value="anthropic">Anthropic Claude Sonnet 4</option>
              <option value="openrouter">OpenRouter (Custom Model)</option>
              <option value="groq">Groq (High-Speed)</option>
            </select>
          </div>

          {(config.primaryModel === 'openrouter' || config.openrouterApiKey) && (
            <div className="p-4 bg-background/50 border border-border rounded-xl space-y-3">
              <label className="block text-sm font-medium text-foreground">
                OpenRouter Model ID
              </label>
              <div className="flex gap-2">
                <select
                  value={showCustomOpenRouter ? 'custom' : config.openrouterModelId}
                  onChange={(e) => handleOpenRouterModelChange(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {OPENROUTER_MODELS.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                  <option value="custom">Custom Model ID...</option>
                </select>
              </div>
              {showCustomOpenRouter && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customOpenRouterModel}
                    onChange={(e) => setCustomOpenRouterModel(e.target.value)}
                    placeholder="e.g., anthropic/claude-3.5-sonnet:beta"
                    className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    onClick={handleCustomOpenRouterSubmit}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    Set
                  </button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Current: <code className="text-primary">{config.openrouterModelId}</code>
              </p>
            </div>
          )}

          {(config.primaryModel === 'groq' || config.groqApiKey) && (
            <div className="p-4 bg-background/50 border border-border rounded-xl space-y-3">
              <label className="block text-sm font-medium text-foreground">
                Groq Model ID
              </label>
              <div className="flex gap-2">
                <select
                                  {/* Competitor Analysis */}
                    {neuronData.competitors && neuronData.competitors.length > 0 && (
                      <div className="bg-card/50 border border-border rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-primary" />
                          Top Competitors
                        </h3>
                        <div className="space-y-3">
                          {neuronData.competitors.slice(0, 5).map((comp, i) => (
                            <div key={i} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border border-border">
                              <span className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold">
                                {comp.rank}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-foreground truncate">{comp.title}</div>
                                <a href={comp.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary truncate block">
                                  {comp.url}
                                </a>
                              </div>
                              {comp.word_count && (
                                <span className="text-xs text-muted-foreground">
                                  {comp.word_count.toLocaleString()} words
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Questions/Ideas */}
                    {neuronData.ideas && (
                      <div className="grid md:grid-cols-2 gap-6">
                        {neuronData.ideas.people_also_ask && neuronData.ideas.people_also_ask.length > 0 && (
                          <div className="bg-card/50 border border-border rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                              <Type className="w-5 h-5 text-primary" />
                              People Also Ask
                            </h3>
                            <div className="space-y-2">
                              {neuronData.ideas.people_also_ask.slice(0, 8).map((q, i) => (
                                <div key={i} className="p-2 bg-muted/30 rounded-lg text-sm text-muted-foreground">
                                  {q.q}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {neuronData.ideas.suggest_questions && neuronData.ideas.suggest_questions.length > 0 && (
                          <div className="bg-card/50 border border-border rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                              <BookOpen className="w-5 h-5 text-primary" />
                              Suggested Questions
                            </h3>
                            <div className="space-y-2">
                              {neuronData.ideas.suggest_questions.slice(0, 8).map((q, i) => (
                                <div key={i} className="p-2 bg-muted/30 rounded-lg text-sm text-muted-foreground">
                                  {q.q}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-6">
                      <Brain className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">NeuronWriter Not Connected</h3>
                    <p className="text-muted-foreground max-w-md mb-6">
                      Connect NeuronWriter in the Setup tab to get detailed keyword analysis, term recommendations, and content scoring.
                    </p>
                    <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-xl text-primary text-sm">
                      <TrendingUp className="w-4 h-4" />
                      Enable NeuronWriter for advanced SEO insights
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* WordPress Publish Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Publish to WordPress
              </h3>
              <button
                onClick={() => setShowPublishModal(false)}
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!isConfigured ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-foreground mb-2">WordPress Not Configured</h4>
                <p className="text-muted-foreground mb-4">
                  Add your WordPress URL, username, and application password in the Setup tab to enable publishing.
                </p>
                <button
                  onClick={() => setShowPublishModal(false)}
                  className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Post Title
                    </label>
                    <div className="px-4 py-3 bg-muted/30 border border-border rounded-xl text-foreground">
                      {item.title}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Publish Status
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPublishStatus('draft')}
                        className={cn(
                          "flex-1 px-4 py-3 rounded-xl font-medium transition-all border",
                          publishStatus === 'draft'
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50"
                        )}
                      >
                        📝 Draft
                      </button>
                      <button
                        onClick={() => setPublishStatus('publish')}
                        className={cn(
                          "flex-1 px-4 py-3 rounded-xl font-medium transition-all border",
                          publishStatus === 'publish'
                            ? "bg-green-600 text-white border-green-600"
                            : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50"
                        )}
                      >
                        🚀 Publish
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-muted/20 border border-border rounded-xl">
                    <h4 className="text-sm font-medium text-foreground mb-3">What will be published:</h4>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>Full HTML content ({wordCount.toLocaleString()} words)</span>
                      </li>
                      {generatedContent?.seoTitle && (
                        <li className="flex items-start gap-2">
                          <span className="text-green-400">•</span>
                          <span>SEO Title: <span className="font-medium text-foreground">"{generatedContent.seoTitle}"</span></span>
                        </li>
                      )}
                      {generatedContent?.metaDescription && (
                        <li className="flex items-start gap-2">
                          <span className="text-green-400">•</span>
                          <span>Meta Description ({generatedContent.metaDescription.length} chars)</span>
                        </li>
                      )}
                      {sourcePathname && (
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400">•</span>
                          <span>Source URL: <span className="font-mono text-xs">{sourcePathname}</span></span>
                        </li>
                      )}
                      <li className="flex items-start gap-2">
                        <span className="text-yellow-400">•</span>
                        <span>WordPress Slug: <span className="font-mono text-foreground">/{effectivePublishSlug}</span></span>
                      </li>
                    </ul>
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        ✨ SEO title and meta description will be set in Yoast SEO, RankMath, or All-in-One SEO
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPublishModal(false)}
                    className="flex-1 px-4 py-3 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePublishToWordPress}
                    disabled={isPublishing}
                    className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        {publishStatus === 'draft' ? 'Save as Draft' : 'Publish Now'}
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Helper Components
// ═══════════════════════════════════════════════════════

function QualityMetric({ label, value }: { label: string; value: number }) {
  const getColor = (v: number) => {
    if (v >= 80) return 'text-green-400';
    if (v >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formattedValue = Number.isInteger(value) ? value : value.toFixed(1);

  return (
    <div className="text-center">
      <div className={cn("text-3xl font-bold", getColor(value))}>{formattedValue}%</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function MetricCard({ label, value, target, ok }: { label: string; value: string | number; target: string; ok?: boolean }) {
  return (
    <div className="bg-muted/30 rounded-lg p-4 border border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        {ok !== undefined && (
          ok ? <CheckCircle className="w-4 h-4 text-green-400" /> : <AlertTriangle className="w-4 h-4 text-yellow-400" />
        )}
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">Target: {target}</div>
    </div>
  );
}

function ScoreCard({ label, value, percentage }: { label: string; value: string | number; percentage: number }) {
  return (
    <div className="bg-card/50 rounded-lg p-4 border border-border">
      <div className="text-sm text-muted-foreground mb-2">{label}</div>
      <div className="text-xl font-bold text-foreground mb-2">{value}</div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all",
            percentage >= 80 ? "bg-green-500" : percentage >= 50 ? "bg-yellow-500" : "bg-red-500"
          )}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Helper Functions for NeuronWriter Terms
// ═══════════════════════════════════════════════════════

function countTermsUsed(terms: any[] | undefined, content: string): number {
  if (!terms) return 0;
  return terms.filter(t => {
    const regex = new RegExp(t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return content.match(regex);
  }).length;
}

function countTermsUsedByType(terms: any[] | undefined, type: string, content: string): number {
  if (!terms) return 0;
  return terms.filter(t => t.type === type).filter(t => {
    const regex = new RegExp(t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return content.match(regex);
  }).length;
}

function TermRowNeuron({ term, content }: { term: { term: string; type: string; weight: number; frequency: number; usage_pc?: number; sugg_usage?: [number, number] }; content: string }) {
  const regex = new RegExp(term.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const matches = content.match(regex);
  const count = matches?.length || 0;
  const isUsed = count > 0;
  const suggestedMin = term.sugg_usage?.[0] || 1;
  const suggestedMax = term.sugg_usage?.[1] || 3;
  const isOptimal = count >= suggestedMin && count <= suggestedMax;

  return (
    <div className={cn(
      "flex items-center justify-between p-2 rounded-lg transition-colors",
      isOptimal ? "bg-green-500/10" : isUsed ? "bg-yellow-500/10" : "bg-muted/30"
    )}>
      <div className="flex-1 min-w-0">
        <span className={cn(
          "text-sm font-medium",
          isOptimal ? "text-green-400" : isUsed ? "text-yellow-400" : "text-muted-foreground"
        )}>
          {term.term}
        </span>
        {term.usage_pc !== undefined && (
          <span className="ml-2 text-xs text-muted-foreground">
            ({term.usage_pc}% of competitors)
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className={cn(
          "px-2 py-0.5 rounded text-xs font-medium",
          isOptimal ? "bg-green-500/20 text-green-400" : 
          isUsed ? "bg-yellow-500/20 text-yellow-400" : "bg-muted text-muted-foreground"
        )}>
          {count}x / {suggestedMin}-{suggestedMax}
        </span>
        {isOptimal && <CheckCircle className="w-3.5 h-3.5 text-green-400" />}
      </div>
    </div>
  );
}

function KeywordDensityIndicator({ content, keyword }: { content: string; keyword: string }) {
  const words = content.split(/\s+/).length;
  const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const matches = content.match(regex);
  const count = matches?.length || 0;
  const density = words > 0 ? ((count / words) * 100).toFixed(1) : '0';
  const isGood = parseFloat(density) >= 0.5 && parseFloat(density) <= 2.5;

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
      isGood ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
    )}>
      {isGood ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      <span>{count}x ({density}%)</span>
    </div>
  );
}

function formatHtml(html: string): string {
  let formatted = html;
  let indent = 0;
  const tab = '  ';

  formatted = formatted.replace(/></g, '>\n<');
  
  const lines = formatted.split('\n');
  const result = lines.map(line => {
    line = line.trim();
    if (!line) return '';
    
    if (line.match(/^<\/\w/)) {
      indent = Math.max(0, indent - 1);
    }
    
    const indented = tab.repeat(indent) + line;
    
    if (line.match(/^<\w[^>]*[^\/]>.*$/) && !line.match(/^<(br|hr|img|input|meta|link)/)) {
      if (!line.match(/<\/\w+>$/)) {
        indent++;
      }
    }
    
    return indented;
  });

  return result.filter(Boolean).join('\n');
}

