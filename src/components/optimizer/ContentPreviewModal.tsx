// CONTENT PREVIEW MODAL - Rich Content Preview

import { useState } from 'react';
import { X, Copy, Check, Download, ExternalLink, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GeneratedContent } from '@/lib/sota';

interface ContentPreviewModalProps {
  content: GeneratedContent | null;
  onClose: () => void;
  onPublish?: (content: GeneratedContent) => void;
}

export function ContentPreviewModal({ content, onClose, onPublish }: ContentPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'html' | 'seo' | 'schema'>('preview');
  const [copied, setCopied] = useState(false);

  if (!content) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content.content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${content.slug}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="glass-card border border-white/10 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -z-10 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl -z-10 translate-x-1/2 translate-y-1/2" />

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5 backdrop-blur-md">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white truncate flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-xl">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              {content.title}
            </h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-zinc-400">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-zinc-500" /> {content.metrics.wordCount.toLocaleString()} words</span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-zinc-500" /> {content.metrics.estimatedReadTime} min read</span>
              <span className={cn(
                "flex items-center gap-1.5 font-medium px-2 py-0.5 rounded-lg border",
                content.qualityScore.overall >= 80 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
              )}>
                Quality: {content.qualityScore.overall}%
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-6">
            <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
              <button
                onClick={handleCopy}
                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors tooltip"
                title="Copy HTML"
              >
                {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
              </button>
              <button
                onClick={handleDownload}
                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors tooltip"
                title="Download HTML"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/5 ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-b border-white/10 bg-black/20">
          {(['preview', 'html', 'seo', 'schema'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-4 text-sm font-bold transition-all relative",
                activeTab === tab
                  ? "text-primary"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary to-primary/0" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 custom-scrollbar bg-black/10">
          {activeTab === 'preview' && (
            <div
              className="prose prose-invert prose-lg max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-a:text-primary prose-img:rounded-2xl prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/10 prose-blockquote:border-l-primary prose-blockquote:bg-white/5 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg"
              dangerouslySetInnerHTML={{ __html: content.content }}
            />
          )}

          {activeTab === 'html' && (
            <div className="relative group">
              <pre className="bg-black/40 border border-white/10 p-6 rounded-2xl overflow-auto text-sm text-zinc-300 font-mono whitespace-pre-wrap custom-scrollbar shadow-inner">
                {content.content}
              </pre>
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Meta Info */}
              <div className="glass-card border border-white/10 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <div className="w-1 h-5 bg-primary rounded-full" />
                  Meta Information
                </h3>
                <div className="space-y-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-zinc-500 font-medium uppercase tracking-wider text-xs">Title Tag</span>
                    <div className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5">
                      <span className="text-white font-medium">{content.title}</span>
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-lg font-mono border",
                        content.title.length <= 60 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                      )}>
                        {content.title.length}/60
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-zinc-500 font-medium uppercase tracking-wider text-xs">Meta Description</span>
                    <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                      <p className="text-zinc-300 leading-relaxed">{content.metaDescription}</p>
                      <div className="flex justify-end mt-2">
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-lg font-mono border",
                          content.metaDescription.length >= 120 && content.metaDescription.length <= 160
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                        )}>
                          {content.metaDescription.length}/160
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-zinc-500 font-medium uppercase tracking-wider text-xs">URL Slug</span>
                    <div className="bg-black/20 p-3 rounded-xl border border-white/5 text-primary font-mono">
                      /{content.slug}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quality Score Breakdown */}
              <div className="glass-card border border-white/10 rounded-2xl p-6 space-y-6">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <div className="w-1 h-5 bg-purple-500 rounded-full" />
                  Quality Analysis
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <ScoreBar label="Overall Score" value={content.qualityScore.overall} large />
                  <div className="grid grid-cols-2 gap-4">
                    <ScoreBar label="Readability" value={content.qualityScore.readability} />
                    <ScoreBar label="SEO Optimization" value={content.qualityScore.seo} />
                    <ScoreBar label="E-E-A-T" value={content.qualityScore.eeat} />
                    <ScoreBar label="Fact Accuracy" value={content.qualityScore.factAccuracy} />
                  </div>
                </div>

                {content.qualityScore.improvements.length > 0 && (
                  <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-5">
                    <h4 className="text-sm font-bold text-yellow-400 mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Suggested Improvements
                    </h4>
                    <ul className="space-y-2">
                      {content.qualityScore.improvements.map((improvement, i) => (
                        <li key={i} className="text-sm text-zinc-300 flex items-start gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/50 mt-1.5 flex-shrink-0" />
                          {improvement}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Keywords */}
              <div className="glass-card border border-white/10 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <div className="w-1 h-5 bg-blue-500 rounded-full" />
                  Keywords Strategy
                </h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-zinc-500 text-xs uppercase tracking-wider font-medium block mb-2">Primary Keyword</span>
                    <span className="inline-block px-4 py-2 bg-primary/20 text-primary border border-primary/20 rounded-xl font-bold">
                      {content.primaryKeyword}
                    </span>
                  </div>
                  {content.secondaryKeywords.length > 0 && (
                    <div>
                      <span className="text-zinc-500 text-xs uppercase tracking-wider font-medium block mb-2">Secondary Keywords</span>
                      <div className="flex flex-wrap gap-2">
                        {content.secondaryKeywords.map((kw, i) => (
                          <span key={i} className="px-3 py-1.5 bg-white/5 text-zinc-300 border border-white/5 rounded-lg text-sm hover:bg-white/10 transition-colors">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Internal Links */}
              {content.internalLinks.length > 0 && (
                <div className="glass-card border border-white/10 rounded-2xl p-6 space-y-4">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <div className="w-1 h-5 bg-teal-500 rounded-full" />
                    Internal Links ({content.internalLinks.length})
                  </h3>
                  <div className="bg-black/20 rounded-xl border border-white/5 divide-y divide-white/5">
                    {content.internalLinks.slice(0, 10).map((link, i) => (
                      <div key={i} className="flex items-center justify-between p-3 text-sm hover:bg-white/5 transition-colors">
                        <span className="text-teal-400 font-medium">{link.anchor}</span>
                        <span className="text-zinc-500 truncate max-w-[300px] text-xs font-mono">{link.targetUrl}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'schema' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                <div>
                  <h3 className="font-bold text-white">Schema.org Structured Data</h3>
                  <p className="text-zinc-400 text-sm mt-0.5">JSON-LD format for search engines</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(content.schema, null, 2));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary border border-primary/20 rounded-xl text-sm font-bold hover:bg-primary/30 transition-all"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  Copy JSON
                </button>
              </div>
              <pre className="bg-black/40 border border-white/10 p-6 rounded-2xl overflow-auto text-sm text-blue-300 font-mono whitespace-pre-wrap shadow-inner custom-scrollbar">
                {JSON.stringify(content.schema, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        {onPublish && (
          <div className="p-6 border-t border-white/10 bg-white/5 backdrop-blur-md flex justify-end gap-4 z-10">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-white/5 text-zinc-300 rounded-xl font-bold hover:bg-white/10 transition-all border border-white/5"
            >
              Close Preview
            </button>
            <button
              onClick={() => onPublish(content)}
              className="px-8 py-3 bg-gradient-to-r from-primary to-emerald-500 text-white font-bold rounded-xl hover:brightness-110 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transform hover:-translate-y-1"
            >
              <ExternalLink className="w-5 h-5" />
              Publish to WordPress
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreBar({ label, value, large }: { label: string; value: number, large?: boolean }) {
  const color = value >= 80 ? 'bg-emerald-500' : value >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  const progressColor = value >= 80 ? 'from-emerald-500 to-teal-400' : value >= 60 ? 'from-yellow-500 to-orange-400' : 'from-red-500 to-pink-500';

  return (
    <div className={large ? "mb-6" : ""}>
      <div className="flex justify-between text-sm mb-2">
        <span className={cn("text-zinc-400 font-medium", large && "text-base")}>{label}</span>
        <span className={cn("font-bold", large ? "text-lg text-white" : "text-zinc-200")}>{value}%</span>
      </div>
      <div className={cn("bg-black/40 rounded-full overflow-hidden border border-white/5", large ? "h-4" : "h-2")}>
        <div
          className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.5)]", progressColor)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default ContentPreviewModal;
