// ============================================================
// SOTA CONTENT VIEWER PANEL - Enterprise-Grade Content Display
// ============================================================

import { useState } from 'react';
import { 
  X, Copy, Check, Download, ExternalLink, Sparkles, 
  FileText, Code, Search, BarChart3, Link2, Shield,
  ChevronLeft, ChevronRight, Maximize2, Minimize2,
  BookOpen, Clock, Target, Zap, Award, Eye, EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContentItem } from '@/lib/store';
import type { GeneratedContent } from '@/lib/sota';

interface ContentViewerPanelProps {
  item: ContentItem | null;
  generatedContent?: GeneratedContent | null;
  onClose: () => void;
  onPublish?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

type ViewTab = 'preview' | 'html' | 'seo' | 'schema' | 'links';

export function ContentViewerPanel({ 
  item, 
  generatedContent,
  onClose, 
  onPublish,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext
}: ContentViewerPanelProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>('preview');
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRawHtml, setShowRawHtml] = useState(false);

  if (!item) return null;

  const content = item.content || '';
  const hasContent = content.length > 0;
  const wordCount = item.wordCount || content.split(/\s+/).filter(Boolean).length;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.title.toLowerCase().replace(/\s+/g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { id: ViewTab; label: string; icon: React.ReactNode }[] = [
    { id: 'preview', label: 'Preview', icon: <Eye className="w-4 h-4" /> },
    { id: 'html', label: 'HTML', icon: <Code className="w-4 h-4" /> },
    { id: 'seo', label: 'SEO Analysis', icon: <Search className="w-4 h-4" /> },
    { id: 'links', label: 'Internal Links', icon: <Link2 className="w-4 h-4" /> },
    { id: 'schema', label: 'Schema', icon: <Shield className="w-4 h-4" /> },
  ];

  return (
    <div className={cn(
      "fixed bg-black/90 backdrop-blur-xl z-50 flex flex-col",
      isFullscreen ? "inset-0" : "inset-4 rounded-2xl border border-border"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-4">
          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={onPrevious}
              disabled={!hasPrevious}
              className="p-2 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="p-2 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider",
                item.type === 'pillar' && "bg-purple-500/20 text-purple-400 border border-purple-500/30",
                item.type === 'cluster' && "bg-blue-500/20 text-blue-400 border border-blue-500/30",
                item.type === 'single' && "bg-primary/20 text-primary border border-primary/30",
                item.type === 'refresh' && "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
              )}>
                {item.type}
              </span>
              <h2 className="text-lg font-bold text-foreground truncate max-w-[500px]">{item.title}</h2>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                {wordCount.toLocaleString()} words
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                ~{Math.ceil(wordCount / 200)} min read
              </span>
              <span className="flex items-center gap-1">
                <Target className="w-3.5 h-3.5" />
                {item.primaryKeyword}
              </span>
              {generatedContent && (
                <span className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-primary" />
                  <span className="text-primary font-medium">{generatedContent.qualityScore.overall}% Quality</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            disabled={!hasContent}
            className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-30"
            title="Copy HTML"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
          </button>
          <button
            onClick={handleDownload}
            disabled={!hasContent}
            className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-30"
            title="Download HTML"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-all"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card/30">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all border-b-2 -mb-px",
              activeTab === tab.id
                ? "text-primary border-primary bg-primary/5"
                : "text-muted-foreground border-transparent hover:text-foreground hover:border-muted-foreground/30"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {!hasContent ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Content Not Yet Generated</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              This content item is pending generation. Select it and click "Generate Selected" to create the content.
            </p>
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 text-sm">
              <Clock className="w-4 h-4" />
              Status: {item.status}
            </div>
          </div>
        ) : (
          <>
            {/* Preview Tab */}
            {activeTab === 'preview' && (
              <div className="p-8 max-w-4xl mx-auto">
                <article 
                  className="prose prose-invert prose-lg max-w-none
                    prose-headings:text-foreground prose-headings:font-bold
                    prose-h1:text-3xl prose-h1:mb-6 prose-h1:mt-8
                    prose-h2:text-2xl prose-h2:mb-4 prose-h2:mt-8 prose-h2:text-primary
                    prose-h3:text-xl prose-h3:mb-3 prose-h3:mt-6
                    prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-4
                    prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                    prose-strong:text-foreground prose-strong:font-semibold
                    prose-ul:my-4 prose-li:text-muted-foreground prose-li:mb-2
                    prose-ol:my-4
                    prose-blockquote:border-l-primary prose-blockquote:bg-muted/30 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
                    prose-code:bg-muted prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-primary
                    prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border
                    prose-img:rounded-xl prose-img:shadow-lg
                    prose-table:border prose-table:border-border
                    prose-th:bg-muted/50 prose-th:p-3 prose-th:text-left
                    prose-td:p-3 prose-td:border-t prose-td:border-border"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              </div>
            )}

            {/* HTML Tab */}
            {activeTab === 'html' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">HTML Source</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowRawHtml(!showRawHtml)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-sm text-muted-foreground hover:text-foreground transition-all"
                    >
                      {showRawHtml ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {showRawHtml ? 'Show Formatted' : 'Show Raw'}
                    </button>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-2 px-3 py-1.5 bg-primary/20 text-primary rounded-lg text-sm hover:bg-primary/30 transition-all"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy All'}
                    </button>
                  </div>
                </div>
                <div className="bg-muted/20 border border-border rounded-xl overflow-hidden">
                  <div className="bg-muted/30 px-4 py-2 border-b border-border flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                    <span className="ml-2 text-xs text-muted-foreground font-mono">content.html</span>
                  </div>
                  <pre className="p-4 overflow-auto text-sm text-foreground font-mono max-h-[60vh] leading-relaxed">
                    {showRawHtml ? content : formatHtml(content)}
                  </pre>
                </div>
              </div>
            )}

            {/* SEO Tab */}
            {activeTab === 'seo' && (
              <div className="p-6 space-y-6">
                {/* Quality Scores */}
                {generatedContent && (
                  <div className="bg-card/50 border border-border rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      Quality Score Breakdown
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                      <QualityMetric label="Overall" value={generatedContent.qualityScore.overall} />
                      <QualityMetric label="Readability" value={generatedContent.qualityScore.readability} />
                      <QualityMetric label="SEO" value={generatedContent.qualityScore.seo} />
                      <QualityMetric label="E-E-A-T" value={generatedContent.qualityScore.eeat} />
                      <QualityMetric label="Uniqueness" value={generatedContent.qualityScore.uniqueness} />
                      <QualityMetric label="Accuracy" value={generatedContent.qualityScore.factAccuracy} />
                    </div>
                  </div>
                )}

                {/* Content Metrics */}
                <div className="bg-card/50 border border-border rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    Content Metrics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard label="Word Count" value={wordCount.toLocaleString()} target="2,500+" />
                    <MetricCard label="Reading Time" value={`${Math.ceil(wordCount / 200)} min`} target="10-15 min" />
                    <MetricCard label="Paragraphs" value={content.split('</p>').length - 1} target="20+" />
                    <MetricCard label="Headings" value={content.match(/<h[1-6]/g)?.length || 0} target="8-12" />
                  </div>
                </div>

                {/* Keywords */}
                <div className="bg-card/50 border border-border rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Keyword Analysis
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Primary Keyword</span>
                      <div className="mt-2">
                        <span className="px-4 py-2 bg-primary/20 text-primary rounded-lg text-lg font-semibold border border-primary/30">
                          {item.primaryKeyword}
                        </span>
                      </div>
                    </div>
                    {generatedContent?.secondaryKeywords && generatedContent.secondaryKeywords.length > 0 && (
                      <div>
                        <span className="text-sm text-muted-foreground">Secondary Keywords</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {generatedContent.secondaryKeywords.map((kw, i) => (
                            <span key={i} className="px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-sm border border-border">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Improvements */}
                {generatedContent?.qualityScore.improvements && generatedContent.qualityScore.improvements.length > 0 && (
                  <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-yellow-400 mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Suggested Improvements
                    </h3>
                    <ul className="space-y-2">
                      {generatedContent.qualityScore.improvements.map((improvement, i) => (
                        <li key={i} className="flex items-start gap-3 text-muted-foreground">
                          <span className="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          {improvement}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Links Tab */}
            {activeTab === 'links' && (
              <div className="p-6">
                {generatedContent?.internalLinks && generatedContent.internalLinks.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Link2 className="w-5 h-5 text-primary" />
                        Internal Links ({generatedContent.internalLinks.length})
                      </h3>
                    </div>
                    <div className="bg-card/50 border border-border rounded-xl overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Anchor Text</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Target URL</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Relevance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {generatedContent.internalLinks.map((link, i) => (
                            <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                              <td className="px-4 py-3 text-primary font-medium">{link.anchor}</td>
                              <td className="px-4 py-3 text-muted-foreground text-sm truncate max-w-[300px]">
                                {link.targetUrl}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-primary rounded-full" 
                                      style={{ width: `${link.relevanceScore * 100}%` }} 
                                    />
                                  </div>
                                  <span className="text-sm text-muted-foreground">
                                    {Math.round(link.relevanceScore * 100)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                      <Link2 className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Internal Links</h3>
                    <p className="text-muted-foreground">
                      Internal links will be added during content generation based on your sitemap.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Schema Tab */}
            {activeTab === 'schema' && (
              <div className="p-6">
                {generatedContent?.schema ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        Schema.org Structured Data
                      </h3>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(generatedContent.schema, null, 2));
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary/20 text-primary rounded-lg text-sm hover:bg-primary/30 transition-all"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        Copy Schema
                      </button>
                    </div>
                    <div className="bg-muted/20 border border-border rounded-xl overflow-hidden">
                      <div className="bg-muted/30 px-4 py-2 border-b border-border flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/50" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                        <div className="w-3 h-3 rounded-full bg-green-500/50" />
                        <span className="ml-2 text-xs text-muted-foreground font-mono">schema.json</span>
                      </div>
                      <pre className="p-4 overflow-auto text-sm text-foreground font-mono max-h-[60vh] leading-relaxed">
                        {JSON.stringify(generatedContent.schema, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                      <Shield className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Schema Data</h3>
                    <p className="text-muted-foreground">
                      Schema.org structured data will be generated with the content.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {hasContent && onPublish && (
        <div className="p-4 border-t border-border bg-card/30 flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Generated {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : 'recently'}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-all"
            >
              Close
            </button>
            <button
              onClick={onPublish}
              className="px-6 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Publish to WordPress
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
function QualityMetric({ label, value }: { label: string; value: number }) {
  const getColor = (v: number) => {
    if (v >= 80) return { bg: 'bg-green-500', text: 'text-green-400', ring: 'ring-green-500/30' };
    if (v >= 60) return { bg: 'bg-yellow-500', text: 'text-yellow-400', ring: 'ring-yellow-500/30' };
    return { bg: 'bg-red-500', text: 'text-red-400', ring: 'ring-red-500/30' };
  };
  const colors = getColor(value);

  return (
    <div className="text-center">
      <div className={cn(
        "w-16 h-16 mx-auto rounded-full flex items-center justify-center ring-4",
        colors.ring,
        "bg-muted/30"
      )}>
        <span className={cn("text-xl font-bold", colors.text)}>{value}</span>
      </div>
      <div className="mt-2 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function MetricCard({ label, value, target }: { label: string; value: string | number; target: string }) {
  return (
    <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-xs text-primary/70 mt-1">Target: {target}</div>
    </div>
  );
}

function formatHtml(html: string): string {
  // Simple HTML formatting
  return html
    .replace(/></g, '>\n<')
    .replace(/(<[^>]+>)/g, (match) => {
      if (match.startsWith('</')) return match;
      return match;
    });
}

export default ContentViewerPanel;
