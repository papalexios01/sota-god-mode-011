// src/components/ContentViewerPanel.tsx
// SOTA CONTENT VIEWER PANEL - Enterprise-Grade Content Display v3.0
// Improvements: Structured NeuronWriter tab, enhanced internal links, beautiful design

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  X, Copy, Check, Download, ExternalLink, Sparkles,
  FileText, Code, Search, BarChart3, Link2, Shield,
  ChevronLeft, ChevronRight, Maximize2, Minimize2,
  BookOpen, Clock, Target, Zap, Award, Eye, EyeOff,
  TrendingUp, CheckCircle, AlertTriangle, Brain, Globe,
  Hash, List, Type, ArrowRight, Upload, Loader2,
  Edit3, Save, RotateCcw, Bold, Italic, Heading1, Heading2, Heading3,
  ListOrdered, Quote, Table, Image as ImageIcon, Undo, Redo,
  ChevronDown, ChevronUp, Filter, Tag, Layers, Layout
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContentItem } from '@/lib/store';
import type { GeneratedContent } from '@/lib/sota';
import type { NeuronWriterAnalysis, NeuronWriterTermData, NeuronWriterHeadingData } from '@/lib/sota/NeuronWriterService';
import { scoreContentAgainstNeuron } from '@/lib/sota/NeuronWriterService';
import { useWordPressPublish } from '@/hooks/useWordPressPublish';
import { getPathnameFromUrl, getWordPressPostSlugFromUrl, toSafeWpSlug } from '@/lib/wordpress/slug';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════
// SANITIZE & FORMAT HELPERS
// ═══════════════════════════════════════════════════════════════════

function sanitizeHtml(html: string): string {
  let sanitized = html;
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<iframe\b[^>]*>/gi, (match) => {
    if (/src\s*=\s*["'][^"']*(?:youtube\.com\/embed|youtube-nocookie\.com\/embed|player\.vimeo\.com)/i.test(match)) {
      return match;
    }
    return '';
  });
  sanitized = sanitized.replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '');
  sanitized = sanitized.replace(/<embed\b[^>]*>/gi, '');
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');
  sanitized = sanitized.replace(/href\s*=\s*["']?\s*javascript\s*:/gi, 'href="');
  sanitized = sanitized.replace(/src\s*=\s*["']?\s*javascript\s*:/gi, 'src="');
  return sanitized;
}

function formatHtml(html: string): string {
  return html
    .replace(/></g, '>\n<')
    .replace(/(<\/(?:div|p|h[1-6]|ul|ol|li|table|tr|thead|tbody|blockquote|figure|section|article)>)/gi, '$1\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface ContentViewerPanelProps {
  item: ContentItem | null;
  generatedContent?: GeneratedContent | null;
  neuronData?: NeuronWriterAnalysis | null;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  onSaveContent?: (itemId: string, newContent: string) => void;
}

type ViewTab = 'preview' | 'editor' | 'html' | 'seo' | 'links' | 'schema' | 'neuron';

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function ContentViewerPanel({
  item,
  generatedContent,
  neuronData,
  onClose,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  onSaveContent
}: ContentViewerPanelProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>('preview');
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [showRawHtml, setShowRawHtml] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'draft' | 'publish'>('draft');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { publish, isPublishing, publishResult, clearResult, isConfigured } = useWordPressPublish();

  if (!item) return null;

  const content = item.content || '';
  const hasContent = content.length > 0;
  const wordCount = item.wordCount || content.split(/\s+/).filter(Boolean).length;

  const sourcePathname = useMemo(() => getPathnameFromUrl(item.url), [item.url]);
  const sourceSlug = useMemo(() => getWordPressPostSlugFromUrl(item.url), [item.url]);

  const effectivePublishSlug = useMemo(() => {
    if (sourceSlug) return sourceSlug;
    if (generatedContent?.slug) return toSafeWpSlug(generatedContent.slug);
    const title = item.title.replace(/^\s*rewrite\s*:\s*/i, '').trim();
    return toSafeWpSlug(title);
  }, [generatedContent?.slug, item.title, sourceSlug]);

  const headings = useMemo(() => {
    const h2Matches = content.match(/<h2[^>]*>(.*?)<\/h2>/gi) || [];
    const h3Matches = content.match(/<h3[^>]*>(.*?)<\/h3>/gi) || [];
    return {
      h2: h2Matches.map(h => h.replace(/<[^>]*>/g, '')),
      h3: h3Matches.map(h => h.replace(/<[^>]*>/g, ''))
    };
  }, [content]);

  const contentLinks = useMemo(() => {
    const linkMatches = content.match(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi) || [];
    return linkMatches.map(link => {
      const hrefMatch = link.match(/href="([^"]*)"/);
      const textMatch = link.match(/>(.*?)<\/a>/);
      return {
        url: hrefMatch?.[1] || '',
        text: textMatch?.[1]?.replace(/<[^>]*>/g, '') || ''
      };
    });
  }, [content]);

  // NeuronWriter live scoring
  const neuronLiveScore = useMemo(() => {
    if (!neuronData) return null;
    return scoreContentAgainstNeuron(content, neuronData);
  }, [content, neuronData]);

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

  // ─── Editor State ──────────────────────────────────────────────────

  const [editedContent, setEditedContent] = useState<string>('');
  const [isEditorDirty, setIsEditorDirty] = useState(false);
  const [editorHistory, setEditorHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    if (!item?.id) return;
    const autoSaveKey = `sota-editor-autosave-${item.id}`;
    const autoSaved = localStorage.getItem(autoSaveKey);
    const initialContent = autoSaved && autoSaved !== content ? autoSaved : content;
    setEditedContent(initialContent);
    setEditorHistory([initialContent]);
    setHistoryIndex(0);
    setIsEditorDirty(initialContent !== content);
    if (autoSaved && autoSaved !== content) {
      toast.info('Restored unsaved changes from auto-save');
    }
  }, [content, item?.id]);

  useEffect(() => {
    if (!item?.id || !isEditorDirty) return;
    const key = `sota-editor-autosave-${item.id}`;
    const timeout = setTimeout(() => {
      localStorage.setItem(key, editedContent);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [editedContent, isEditorDirty, item?.id]);

  const handleEditorChange = useCallback((newContent: string) => {
    setEditedContent(newContent);
    setIsEditorDirty(newContent !== content);
    setEditorHistory(prev => {
      const newHistory = [...prev.slice(0, historyIndex + 1), newContent].slice(-50);
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
  }, [content, historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setEditedContent(editorHistory[newIndex]);
      setIsEditorDirty(editorHistory[newIndex] !== content);
    }
  }, [historyIndex, editorHistory, content]);

  const handleRedo = useCallback(() => {
    if (historyIndex < editorHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setEditedContent(editorHistory[newIndex]);
      setIsEditorDirty(editorHistory[newIndex] !== content);
    }
  }, [historyIndex, editorHistory, content]);

  const handleResetEditor = useCallback(() => {
    setEditedContent(content);
    setIsEditorDirty(false);
    setEditorHistory([content]);
    setHistoryIndex(0);
    if (item?.id) localStorage.removeItem(`sota-editor-autosave-${item.id}`);
    toast.info('Editor reset to original content');
  }, [content, item?.id]);

  const handleSaveContent = useCallback(() => {
    if (!item || !onSaveContent || !isEditorDirty) return;
    onSaveContent(item.id, editedContent);
    setIsEditorDirty(false);
    if (item.id) localStorage.removeItem(`sota-editor-autosave-${item.id}`);
    toast.success('Content saved successfully!');
  }, [item, onSaveContent, isEditorDirty, editedContent]);

  const insertHtmlTag = useCallback((tag: string, attributes: string = '') => {
    const textarea = textareaRef.current;
    const start = textarea ? textarea.selectionStart : editedContent.length;
    const end = textarea ? textarea.selectionEnd : editedContent.length;
    const selectedText = start !== end ? editedContent.substring(start, end) : 'Your text here';

    let insertion = '';
    if (['h2', 'h3', 'p', 'strong', 'em', 'blockquote'].includes(tag)) {
      insertion = `<${tag}${attributes}>${selectedText}</${tag}>`;
    } else if (tag === 'ul' || tag === 'ol') {
      insertion = `<${tag}>\n  <li>${selectedText}</li>\n</${tag}>`;
    } else if (tag === 'table') {
      insertion = `<table style="width: 100%; border-collapse: collapse;">\n  <thead>\n    <tr>\n      <th style="padding: 12px; border: 1px solid #374151; background: #1f2937;">Header 1</th>\n      <th style="padding: 12px; border: 1px solid #374151; background: #1f2937;">Header 2</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td style="padding: 12px; border: 1px solid #374151;">Data 1</td>\n      <td style="padding: 12px; border: 1px solid #374151;">Data 2</td>\n    </tr>\n  </tbody>\n</table>`;
    } else if (tag === 'img') {
      insertion = `<img src="https://placehold.co/800x400" alt="${selectedText}" style="max-width: 100%; border-radius: 12px;" />`;
    }

    const newContent = editedContent.substring(0, start) + insertion + editedContent.substring(end);
    handleEditorChange(newContent);

    requestAnimationFrame(() => {
      if (textarea) {
        const newPos = start + insertion.length;
        textarea.selectionStart = newPos;
        textarea.selectionEnd = newPos;
        textarea.focus();
      }
    });
  }, [editedContent, handleEditorChange]);

  // ─── Publish Handler ───────────────────────────────────────────────

  const handlePublishToWordPress = async () => {
    if (!item) return;
    const publishContent = isEditorDirty ? editedContent : content;
    if (!publishContent) return;

    const cleanTitle = item.title.replace(/^\s*rewrite\s*:\s*/i, '').trim();
    const effectiveSeoTitle = generatedContent?.seoTitle || cleanTitle;
    const wpTitle = generatedContent?.seoTitle || generatedContent?.title || cleanTitle;

    const result = await publish(wpTitle, publishContent, {
      status: publishStatus,
      slug: effectivePublishSlug,
      metaDescription: generatedContent?.metaDescription,
      excerpt: generatedContent?.metaDescription,
      seoTitle: effectiveSeoTitle,
      sourceUrl: item.url,
    });

    if (result.success) {
      toast.success(`Published to WordPress as ${publishStatus}!`, {
        description: result.postUrl ? `Post ID: ${result.postId}` : undefined,
        action: result.postUrl ? {
          label: 'View Post',
          onClick: () => window.open(result.postUrl, '_blank'),
        } : undefined,
      });
      setShowPublishModal(false);
      if (item.id) localStorage.removeItem(`sota-editor-autosave-${item.id}`);
    } else {
      toast.error('Failed to publish', { description: result.error });
    }
  };

  // ─── Tab Configuration ─────────────────────────────────────────────

  const neuronTermCount = neuronData
    ? (neuronData.basicKeywords?.length || 0) +
      (neuronData.extendedKeywords?.length || 0) +
      (neuronData.entities?.length || 0)
    : (neuronData as any)?.terms?.length || 0;

  const tabs: { id: ViewTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'preview', label: 'Preview', icon: <Eye className="w-4 h-4" /> },
    { id: 'editor', label: 'Editor', icon: <Edit3 className="w-4 h-4" />, badge: isEditorDirty ? 1 : undefined },
    { id: 'html', label: 'HTML', icon: <Code className="w-4 h-4" /> },
    { id: 'seo', label: 'SEO Analysis', icon: <Search className="w-4 h-4" /> },
    { id: 'links', label: 'Internal Links', icon: <Link2 className="w-4 h-4" />, badge: generatedContent?.internalLinks?.length || contentLinks.length },
    { id: 'schema', label: 'Schema', icon: <Shield className="w-4 h-4" /> },
    { id: 'neuron', label: 'NeuronWriter', icon: <Brain className="w-4 h-4" />, badge: neuronTermCount || undefined },
  ];

  // ─── Effective display content (edited or original) ────────────────

  const displayContent = isEditorDirty ? editedContent : content;

  return (
    <div className={cn(
      "fixed bg-background/98 backdrop-blur-xl z-50 flex flex-col",
      isFullscreen ? "inset-0" : "inset-4 rounded-2xl border border-border"
    )}>
      {/* ═══════════════ HEADER ═══════════════ */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <button onClick={onPrevious} disabled={!hasPrevious} className="p-2 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={onNext} disabled={!hasNext} className="p-2 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider",
                item.type === 'pillar' && "bg-purple-500/20 text-purple-400 border border-purple-500/30",
                item.type === 'cluster' && "bg-blue-500/20 text-blue-400 border border-blue-500/30",
                item.type === 'single' && "bg-primary/20 text-primary border border-primary/30",
                item.type === 'refresh' && "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
              )}>{item.type}</span>
              <h2 className="text-lg font-bold text-foreground truncate max-w-[500px]">{item.title}</h2>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{wordCount.toLocaleString()} words</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />~{Math.ceil(wordCount / 200)} min read</span>
              <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" />{item.primaryKeyword}</span>
              {generatedContent && (
                <span className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-primary" />
                  <span className="text-primary font-medium">{generatedContent.qualityScore.overall}% Quality</span>
                </span>
              )}
              {neuronLiveScore && (
                <span className="flex items-center gap-1">
                  <Brain className="w-3.5 h-3.5 text-purple-400" />
                  <span className={cn("font-medium", neuronLiveScore.score >= 90 ? "text-green-400" : neuronLiveScore.score >= 70 ? "text-yellow-400" : "text-red-400")}>
                    {neuronLiveScore.score}% NW
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCopy} disabled={!hasContent} className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-30">
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
          </button>
          <button onClick={handleDownload} disabled={!hasContent} className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-30">
            <Download className="w-4 h-4" /><span className="hidden sm:inline">Download</span>
          </button>
          <button onClick={() => setShowPublishModal(true)} disabled={!hasContent} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-30">
            <Upload className="w-4 h-4" />Publish to WP
          </button>
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-all">
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ═══════════════ TABS ═══════════════ */}
      <div className="flex border-b border-border bg-card/30 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn(
            "flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap",
            activeTab === tab.id ? "text-primary border-primary bg-primary/5" : "text-muted-foreground border-transparent hover:text-foreground hover:border-muted-foreground/30"
          )}>
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-primary/20 text-primary text-xs rounded-full font-bold">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════ CONTENT AREA ═══════════════ */}
      <div className="flex-1 overflow-auto">
        {!hasContent ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Content Not Yet Generated</h3>
            <p className="text-muted-foreground max-w-md mb-6">Select this item and click "Generate Selected" to create the content.</p>
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 text-sm">
              <Clock className="w-4 h-4" />Status: {item.status}
            </div>
          </div>
        ) : (
          <>
            {/* ────── PREVIEW TAB ────── */}
            {activeTab === 'preview' && (
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4 px-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">WordPress Preview</span>
                  {isEditorDirty && (
                    <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-medium ml-2">Showing edited version</span>
                  )}
                </div>
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden max-w-4xl mx-auto">
                  <div className="bg-gray-100 px-4 py-2.5 border-b border-gray-200 flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 bg-white rounded-lg px-3 py-1 text-xs text-gray-500 font-mono truncate border border-gray-200">
                      {item.url || `yoursite.com/${effectivePublishSlug}`}
                    </div>
                  </div>
                  <style dangerouslySetInnerHTML={{ __html: `
                    .wp-preview-content h1 { font-size: 32px; font-weight: 800; color: #0f172a; margin: 32px 0 16px; line-height: 1.3; }
                    .wp-preview-content h2 { font-size: 26px; font-weight: 700; color: #0f172a; margin: 40px 0 16px; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; }
                    .wp-preview-content h3 { font-size: 21px; font-weight: 700; color: #1e293b; margin: 32px 0 12px; }
                    .wp-preview-content p { margin: 0 0 20px; color: #374151; line-height: 1.85; font-size: 17px; }
                    .wp-preview-content a { color: #2563eb; text-decoration: none; }
                    .wp-preview-content a:hover { text-decoration: underline; }
                    .wp-preview-content strong { color: #0f172a; font-weight: 700; }
                    .wp-preview-content ul, .wp-preview-content ol { margin: 16px 0 24px; padding-left: 28px; color: #374151; }
                    .wp-preview-content li { margin-bottom: 10px; line-height: 1.8; }
                    .wp-preview-content blockquote { border-left: 4px solid #10b981; margin: 24px 0; padding: 16px 24px; background: #f8fafc; border-radius: 0 12px 12px 0; }
                    .wp-preview-content img { max-width: 100%; height: auto; border-radius: 12px; margin: 24px 0; }
                    .wp-preview-content table { width: 100%; border-collapse: collapse; margin: 24px 0; }
                    .wp-preview-content th { background: #f8fafc; padding: 14px 18px; text-align: left; font-weight: 700; border: 1px solid #e2e8f0; }
                    .wp-preview-content td { padding: 14px 18px; border: 1px solid #e2e8f0; color: #374151; }
                    .wp-preview-content hr { border: none; border-top: 2px solid #f1f5f9; margin: 40px 0; }
                  `}} />
                  <article
                    className="wp-preview-content"
                    style={{ padding: '48px 56px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#1a1a1a', lineHeight: 1.8, fontSize: '17px', backgroundColor: '#ffffff' }}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(displayContent) }}
                  />
                </div>
              </div>
            )}

            {/* ────── EDITOR TAB ────── */}
            {activeTab === 'editor' && (
              <div className="p-6 h-full flex flex-col">
                <div className="bg-card/50 border border-border rounded-xl p-3 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Edit3 className="w-5 h-5 text-primary" />Content Editor
                      {isEditorDirty && <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-medium">Unsaved Changes</span>}
                    </h3>
                    <div className="flex items-center gap-2">
                      <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-2 bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all disabled:opacity-30" title="Undo"><Undo className="w-4 h-4" /></button>
                      <button onClick={handleRedo} disabled={historyIndex >= editorHistory.length - 1} className="p-2 bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all disabled:opacity-30" title="Redo"><Redo className="w-4 h-4" /></button>
                      <div className="w-px h-6 bg-border mx-1" />
                      <button onClick={handleResetEditor} disabled={!isEditorDirty} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg text-sm transition-all disabled:opacity-30"><RotateCcw className="w-4 h-4" />Reset</button>
                      <button onClick={() => { navigator.clipboard.writeText(editedContent); toast.success('Copied!'); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 text-primary hover:bg-primary/30 rounded-lg text-sm transition-all"><Copy className="w-4 h-4" />Copy</button>
                      {onSaveContent && (
                        <button onClick={handleSaveContent} disabled={!isEditorDirty} className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-semibold transition-all disabled:opacity-30 shadow-sm"><Save className="w-4 h-4" />Save Changes</button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <div className="flex items-center gap-0.5 bg-muted/30 rounded-lg p-1">
                      <button onClick={() => insertHtmlTag('h2')} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-all" title="H2"><Heading2 className="w-4 h-4" /></button>
                      <button onClick={() => insertHtmlTag('h3')} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-all" title="H3"><Heading3 className="w-4 h-4" /></button>
                    </div>
                    <div className="w-px h-6 bg-border mx-1" />
                    <div className="flex items-center gap-0.5 bg-muted/30 rounded-lg p-1">
                      <button onClick={() => insertHtmlTag('strong')} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-all" title="Bold"><Bold className="w-4 h-4" /></button>
                      <button onClick={() => insertHtmlTag('em')} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-all" title="Italic"><Italic className="w-4 h-4" /></button>
                    </div>
                    <div className="w-px h-6 bg-border mx-1" />
                    <div className="flex items-center gap-0.5 bg-muted/30 rounded-lg p-1">
                      <button onClick={() => insertHtmlTag('ul')} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-all" title="Bullet List"><List className="w-4 h-4" /></button>
                      <button onClick={() => insertHtmlTag('ol')} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-all" title="Numbered List"><ListOrdered className="w-4 h-4" /></button>
                    </div>
                    <div className="w-px h-6 bg-border mx-1" />
                    <div className="flex items-center gap-0.5 bg-muted/30 rounded-lg p-1">
                      <button onClick={() => insertHtmlTag('blockquote')} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-all" title="Quote"><Quote className="w-4 h-4" /></button>
                      <button onClick={() => insertHtmlTag('table')} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-all" title="Table"><Table className="w-4 h-4" /></button>
                      <button onClick={() => insertHtmlTag('img')} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-all" title="Image"><ImageIcon className="w-4 h-4" /></button>
                    </div>
                    <div className="ml-auto text-xs text-muted-foreground">{editedContent.split(/\s+/).filter(Boolean).length.toLocaleString()} words</div>
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
                  <div className="flex flex-col bg-muted/20 border border-border rounded-xl overflow-hidden">
                    <div className="bg-muted/30 px-4 py-2 border-b border-border flex items-center gap-2">
                      <Code className="w-4 h-4 text-muted-foreground" /><span className="text-sm font-medium text-foreground">HTML Source</span>
                    </div>
                    <textarea
                      ref={textareaRef}
                      value={editedContent}
                      onChange={(e) => handleEditorChange(e.target.value)}
                      className="flex-1 p-4 bg-transparent text-foreground font-mono text-sm resize-none focus:outline-none placeholder:text-muted-foreground leading-relaxed"
                      placeholder="Paste or type your HTML content here..."
                      spellCheck={false}
                    />
                  </div>
                  <div className="flex flex-col bg-muted/20 border border-border rounded-xl overflow-hidden">
                    <div className="bg-muted/30 px-4 py-2 border-b border-border flex items-center gap-2">
                      <Eye className="w-4 h-4 text-primary" /><span className="text-sm font-medium text-foreground">Live Preview</span>
                    </div>
                    <div className="flex-1 overflow-auto p-4">
                      <article className="prose prose-invert prose-sm max-w-none prose-headings:text-foreground prose-h2:text-xl prose-h2:text-primary prose-p:text-muted-foreground prose-p:leading-relaxed prose-a:text-primary prose-strong:text-foreground prose-blockquote:border-l-primary prose-blockquote:bg-muted/30"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(editedContent) }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ────── HTML TAB ────── */}
            {activeTab === 'html' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">HTML Source</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowRawHtml(!showRawHtml)} className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-sm text-muted-foreground hover:text-foreground transition-all">
                      {showRawHtml ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {showRawHtml ? 'Formatted' : 'Raw'}
                    </button>
                    <button onClick={handleCopy} className="flex items-center gap-2 px-3 py-1.5 bg-primary/20 text-primary rounded-lg text-sm hover:bg-primary/30 transition-all">
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
                  <pre className="p-4 overflow-auto text-sm text-foreground font-mono max-h-[60vh] leading-relaxed whitespace-pre-wrap">
                    {showRawHtml ? content : formatHtml(content)}
                  </pre>
                </div>
              </div>
            )}

            {/* ────── SEO ANALYSIS TAB ────── */}
            {activeTab === 'seo' && (
              <div className="p-6 space-y-6">
                {generatedContent && (
                  <div className="bg-card/50 border border-border rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-primary" />Quality Score Breakdown
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <QualityMetric label="Overall" value={generatedContent.qualityScore.overall} />
                      <QualityMetric label="Readability" value={generatedContent.qualityScore.readability} />
                      <QualityMetric label="SEO" value={generatedContent.qualityScore.seo} />
                      <QualityMetric label="E-E-A-T" value={generatedContent.qualityScore.eeat} />
                      <QualityMetric label="Uniqueness" value={generatedContent.qualityScore.uniqueness} />
                      <QualityMetric label="Fact Accuracy" value={generatedContent.qualityScore.factAccuracy} />
                    </div>
                  </div>
                )}
                <div className="bg-card/50 border border-border rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />Keywords
                  </h3>
                  <div className="space-y-3">
                    <div><span className="text-muted-foreground text-sm">Primary:</span> <span className="ml-2 px-3 py-1 bg-primary/20 text-primary rounded-lg text-sm">{item.primaryKeyword}</span></div>
                    {generatedContent?.secondaryKeywords && generatedContent.secondaryKeywords.length > 0 && (
                      <div>
                        <span className="text-muted-foreground text-sm">Secondary:</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {generatedContent.secondaryKeywords.map((kw: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs">{kw}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-card/50 border border-border rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Hash className="w-5 h-5 text-primary" />Content Structure
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <p className="text-muted-foreground">H2 Headings: <span className="text-foreground font-medium">{headings.h2.length}</span></p>
                      <p className="text-muted-foreground">H3 Headings: <span className="text-foreground font-medium">{headings.h3.length}</span></p>
                      <p className="text-muted-foreground">Word Count: <span className="text-foreground font-medium">{wordCount.toLocaleString()}</span></p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-muted-foreground">Internal Links: <span className="text-foreground font-medium">{contentLinks.length}</span></p>
                      <p className="text-muted-foreground">Slug: <span className="text-primary font-mono text-xs">/{effectivePublishSlug}</span></p>
                    </div>
                  </div>
                  {headings.h2.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <h4 className="text-sm font-semibold text-foreground mb-2">Heading Outline</h4>
                      <div className="space-y-1">
                        {headings.h2.map((h, i) => (
                          <div key={`h2-${i}`} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-xs rounded font-mono flex-shrink-0 mt-0.5">H2</span>
                            <span>{h}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ────── INTERNAL LINKS TAB ────── */}
            {activeTab === 'links' && (
              <div className="p-6 space-y-6">
                <div className="bg-card/50 border border-border rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-primary" />
                    Internal Links ({generatedContent?.internalLinks?.length || contentLinks.length})
                  </h3>
                  {(generatedContent?.internalLinks && generatedContent.internalLinks.length > 0) ? (
                    <div className="space-y-3">
                      {generatedContent.internalLinks.map((link: any, i: number) => (
                        <div key={i} className="flex items-start gap-4 p-4 bg-muted/20 border border-border rounded-xl hover:bg-muted/30 transition-colors">
                          <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary text-sm font-bold">{i + 1}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-semibold text-primary">{link.anchor}</p>
                              {link.position && (
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                  link.position === 'early' && "bg-blue-500/20 text-blue-400",
                                  link.position === 'middle' && "bg-purple-500/20 text-purple-400",
                                  link.position === 'late' && "bg-amber-500/20 text-amber-400"
                                )}>{link.position}</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{link.targetUrl}</p>
                            {link.context && (
                              <p className="text-xs text-muted-foreground/70 mt-1 italic">{link.context}</p>
                            )}
                            {link.relevanceScore !== undefined && (
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-muted-foreground">Relevance:</span>
                                <div className="h-2 flex-1 max-w-[140px] bg-muted rounded-full overflow-hidden">
                                  <div className={cn("h-full rounded-full transition-all", link.relevanceScore >= 70 ? "bg-green-500" : link.relevanceScore >= 40 ? "bg-yellow-500" : "bg-red-500")} style={{ width: `${link.relevanceScore}%` }} />
                                </div>
                                <span className={cn("text-xs font-semibold", link.relevanceScore >= 70 ? "text-green-400" : link.relevanceScore >= 40 ? "text-yellow-400" : "text-red-400")}>{link.relevanceScore}%</span>
                              </div>
                            )}
                          </div>
                          <a href={link.targetUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-muted/50">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : contentLinks.length > 0 ? (
                    <div className="space-y-2">
                      {contentLinks.map((link, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg text-sm hover:bg-muted/30 transition-colors">
                          <span className="text-primary font-medium">{link.text}</span>
                          <span className="text-muted-foreground truncate max-w-[300px] ml-4 font-mono text-xs">{link.url}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-8">No internal links found in this content.</p>
                  )}
                </div>
              </div>
            )}

            {/* ────── SCHEMA TAB ────── */}
            {activeTab === 'schema' && (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />Schema.org Structured Data
                  </h3>
                  <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(generatedContent?.schema || {}, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary/20 text-primary rounded-lg text-sm hover:bg-primary/30 transition-all">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}Copy Schema
                  </button>
                </div>
                {generatedContent?.schema ? (
                  <pre className="bg-muted/20 border border-border p-4 rounded-xl overflow-auto text-sm text-foreground font-mono whitespace-pre-wrap max-h-[60vh]">
                    {JSON.stringify(generatedContent.schema, null, 2)}
                  </pre>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-12">No schema data available for this content.</p>
                )}
              </div>
            )}

            {/* ────── NEURONWRITER TAB (COMPLETELY REDESIGNED) ────── */}
            {activeTab === 'neuron' && (
              <NeuronWriterTab
                neuronData={neuronData}
                content={displayContent}
                neuronLiveScore={neuronLiveScore}
              />
            )}
          </>
        )}
      </div>

      {/* ═══════════════ PUBLISH MODAL ═══════════════ */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setShowPublishModal(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2"><Upload className="w-5 h-5 text-primary" />Publish to WordPress</h3>
              <button onClick={() => setShowPublishModal(false)} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            {!isConfigured && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                WordPress is not configured. Go to Setup tab to add your credentials.
              </div>
            )}
            {isEditorDirty && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-sm flex items-start gap-2">
                <Edit3 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                You have unsaved editor changes. The <strong>edited version</strong> will be published.
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">Post Status</label>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => setPublishStatus('draft')} className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all", publishStatus === 'draft' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>Draft</button>
                  <button onClick={() => setPublishStatus('publish')} className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all", publishStatus === 'publish' ? "bg-green-600 text-white" : "bg-muted text-muted-foreground hover:text-foreground")}>Publish</button>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">URL Slug</label>
                <p className="text-sm text-primary font-mono mt-1">/{effectivePublishSlug}</p>
              </div>
              {generatedContent?.seoTitle && (
                <div>
                  <label className="text-sm text-muted-foreground">SEO Title</label>
                  <p className="text-sm text-foreground mt-1">{generatedContent.seoTitle}</p>
                </div>
              )}
              {generatedContent?.metaDescription && (
                <div>
                  <label className="text-sm text-muted-foreground">Meta Description</label>
                  <p className="text-sm text-foreground mt-1 line-clamp-2">{generatedContent.metaDescription}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowPublishModal(false)} className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm hover:bg-muted/80 transition-all">Cancel</button>
              <button onClick={handlePublishToWordPress} disabled={isPublishing || !isConfigured} className="px-6 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-sm hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2">
                {isPublishing ? <><Loader2 className="w-4 h-4 animate-spin" />Publishing...</> : <><Upload className="w-4 h-4" />Publish {publishStatus === 'publish' ? 'Now' : 'as Draft'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// NEURONWRITER TAB - COMPLETE REDESIGN WITH SEPARATE SECTIONS
// ═══════════════════════════════════════════════════════════════════

interface NeuronWriterTabProps {
  neuronData: NeuronWriterAnalysis | null | undefined;
  content: string;
  neuronLiveScore: { score: number; missing: string[]; underused: string[]; optimal: string[] } | null;
}

function NeuronWriterTab({ neuronData, content, neuronLiveScore }: NeuronWriterTabProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    extended: true,
    entities: true,
    h1: false,
    h2: true,
    h3: false,
    gaps: true,
  });

  const [termFilter, setTermFilter] = useState<'all' | 'missing' | 'underused' | 'optimal'>('all');

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const hasStructuredData = neuronData && (
    Array.isArray(neuronData.basicKeywords) ||
    Array.isArray(neuronData.extendedKeywords) ||
    Array.isArray(neuronData.entities)
  );

  const legacyTerms: any[] = !hasStructuredData && (neuronData as any)?.terms
    ? (neuronData as any).terms
    : [];

  const contentLower = content.replace(/<[^>]*>/g, ' ').toLowerCase();

  function countTermInContent(term: string): number {
    const termLower = term.toLowerCase();
    const regex = new RegExp(termLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = contentLower.match(regex);
    return matches ? matches.length : 0;
  }

  if (!neuronData) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4">
            <Brain className="w-8 h-8 text-purple-400" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">NeuronWriter Not Connected</h3>
          <p className="text-muted-foreground max-w-md">Enable NeuronWriter integration in the Setup tab to see keyword analysis, heading suggestions, entities, and content optimization scores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">

      {/* ── Score Overview Card ── */}
      <div className="bg-card/50 border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />NeuronWriter Score
          </h3>
          {neuronData.keyword && (
            <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-medium">
              &quot;{neuronData.keyword}&quot;
            </span>
          )}
        </div>
        {neuronLiveScore ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2 md:col-span-1">
              <div className="relative w-24 h-24 mx-auto">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" stroke="currentColor" className="text-muted/30" strokeWidth="8" fill="none" />
                  <circle cx="50" cy="50" r="42" stroke="currentColor"
                    className={cn(neuronLiveScore.score >= 90 ? "text-green-500" : neuronLiveScore.score >= 70 ? "text-yellow-500" : "text-red-500")}
                    strokeWidth="8" fill="none" strokeDasharray={`${neuronLiveScore.score * 2.64} 264`} strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={cn("text-2xl font-bold", neuronLiveScore.score >= 90 ? "text-green-400" : neuronLiveScore.score >= 70 ? "text-yellow-400" : "text-red-400")}>
                    {neuronLiveScore.score}%
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-muted-foreground">Optimal</span>
              </div>
              <span className="text-2xl font-bold text-green-400">{neuronLiveScore.optimal.length}</span>
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-sm text-muted-foreground">Underused</span>
              </div>
              <span className="text-2xl font-bold text-yellow-400">{neuronLiveScore.underused.length}</span>
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm text-muted-foreground">Missing</span>
              </div>
              <span className="text-2xl font-bold text-red-400">{neuronLiveScore.missing.length}</span>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Score data not available.</p>
        )}

        {hasStructuredData && neuronData.recommendations && (
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-muted/20 rounded-lg p-3">
              <span className="text-muted-foreground">Target Words</span>
              <p className="text-foreground font-bold text-lg">{neuronData.recommendations.targetWordCount?.toLocaleString()}</p>
            </div>
            <div className="bg-muted/20 rounded-lg p-3">
              <span className="text-muted-foreground">Target Score</span>
              <p className="text-foreground font-bold text-lg">{neuronData.recommendations.targetScore}%</p>
            </div>
            <div className="bg-muted/20 rounded-lg p-3">
              <span className="text-muted-foreground">Min H2 Count</span>
              <p className="text-foreground font-bold text-lg">{neuronData.recommendations.minH2Count}</p>
            </div>
            <div className="bg-muted/20 rounded-lg p-3">
              <span className="text-muted-foreground">Min H3 Count</span>
              <p className="text-foreground font-bold text-lg">{neuronData.recommendations.minH3Count}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground mr-2">Filter:</span>
        {(['all', 'missing', 'underused', 'optimal'] as const).map(f => (
          <button
            key={f}
            onClick={() => setTermFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize",
              termFilter === f
                ? f === 'missing' ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/30"
                  : f === 'underused' ? "bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/30"
                  : f === 'optimal' ? "bg-green-500/20 text-green-400 ring-1 ring-green-500/30"
                  : "bg-primary/20 text-primary ring-1 ring-primary/30"
                : "bg-muted/30 text-muted-foreground hover:text-foreground"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── Structured Sections (new NeuronWriterService data) ── */}
      {hasStructuredData ? (
        <>
          {/* Basic Keywords */}
          <NeuronSection title="Basic Keywords" subtitle="High priority — MUST use all" icon={<Target className="w-5 h-5 text-red-400" />} accentColor="red" isExpanded={expandedSections.basic} onToggle={() => toggleSection('basic')} count={neuronData.basicKeywords?.length || 0}>
            <TermGrid terms={neuronData.basicKeywords || []} content={contentLower} filter={termFilter} />
          </NeuronSection>

          {/* Extended Keywords */}
          <NeuronSection title="Extended Keywords" subtitle="Medium priority — use most" icon={<Layers className="w-5 h-5 text-blue-400" />} accentColor="blue" isExpanded={expandedSections.extended} onToggle={() => toggleSection('extended')} count={neuronData.extendedKeywords?.length || 0}>
            <TermGrid terms={neuronData.extendedKeywords || []} content={contentLower} filter={termFilter} />
          </NeuronSection>

          {/* Entities */}
          <NeuronSection title="Entities" subtitle="Semantic relevance — include naturally" icon={<Tag className="w-5 h-5 text-purple-400" />} accentColor="purple" isExpanded={expandedSections.entities} onToggle={() => toggleSection('entities')} count={neuronData.entities?.length || 0}>
            <TermGrid terms={neuronData.entities || []} content={contentLower} filter={termFilter} />
          </NeuronSection>

          {/* H1 Suggestions */}
          {neuronData.h1Suggestions && neuronData.h1Suggestions.length > 0 && (
            <NeuronSection title="H1 Title Suggestions" subtitle="Recommended H1 titles from top competitors" icon={<Type className="w-5 h-5 text-amber-400" />} accentColor="amber" isExpanded={expandedSections.h1} onToggle={() => toggleSection('h1')} count={neuronData.h1Suggestions.length}>
              <HeadingList headings={neuronData.h1Suggestions} />
            </NeuronSection>
          )}

          {/* H2 Suggestions */}
          {neuronData.h2Suggestions && neuronData.h2Suggestions.length > 0 && (
            <NeuronSection title="H2 Heading Suggestions" subtitle="Use or adapt these headings in your content" icon={<Hash className="w-5 h-5 text-emerald-400" />} accentColor="emerald" isExpanded={expandedSections.h2} onToggle={() => toggleSection('h2')} count={neuronData.h2Suggestions.length}>
              <HeadingList headings={neuronData.h2Suggestions} />
            </NeuronSection>
          )}

          {/* H3 Suggestions */}
          {neuronData.h3Suggestions && neuronData.h3Suggestions.length > 0 && (
            <NeuronSection title="H3 Subheading Suggestions" subtitle="Sub-topics to cover within sections" icon={<List className="w-5 h-5 text-cyan-400" />} accentColor="cyan" isExpanded={expandedSections.h3} onToggle={() => toggleSection('h3')} count={neuronData.h3Suggestions.length}>
              <HeadingList headings={neuronData.h3Suggestions} />
            </NeuronSection>
          )}

          {/* Content Gaps */}
          {neuronData.recommendations?.contentGaps && neuronData.recommendations.contentGaps.length > 0 && (
            <NeuronSection title="Content Gaps" subtitle="Critical missing terms — add these to boost score" icon={<AlertTriangle className="w-5 h-5 text-red-400" />} accentColor="red" isExpanded={expandedSections.gaps} onToggle={() => toggleSection('gaps')} count={neuronData.recommendations.contentGaps.length}>
              <div className="flex flex-wrap gap-2">
                {neuronData.recommendations.contentGaps.map((term: string, i: number) => (
                  <span key={i} className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm font-medium">
                    {term}
                  </span>
                ))}
              </div>
            </NeuronSection>
          )}

          {/* Competitor Data */}
          {neuronData.competitorData && neuronData.competitorData.length > 0 && (
            <div className="bg-card/50 border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />Competitor Analysis
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">#</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">URL</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Title</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">Words</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {neuronData.competitorData.slice(0, 10).map((comp: any, i: number) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                        <td className="py-2 px-3">
                          <a href={comp.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block max-w-[200px]">
                            {(() => { try { return new URL(comp.url).hostname; } catch { return comp.url; } })()}
                          </a>
                        </td>
                        <td className="py-2 px-3 text-foreground truncate max-w-[250px]">{comp.title}</td>
                        <td className="py-2 px-3 text-right text-muted-foreground">{(comp.wordCount || 0).toLocaleString()}</td>
                        <td className="py-2 px-3 text-right">
                          <span className={cn("font-medium", (comp.score || 0) >= 70 ? "text-green-400" : (comp.score || 0) >= 50 ? "text-yellow-400" : "text-muted-foreground")}>{comp.score || 0}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        /* ── Legacy Flat Terms View (fallback) ── */
        <div className="bg-card/50 border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />Terms Analysis
          </h3>
          {legacyTerms.length > 0 ? (
            <div className="space-y-2">
              {legacyTerms.slice(0, 50).map((term: any, i: number) => {
                const termText = term.term || term.name || term.text || (typeof term === 'string' ? term : '');
                if (!termText) return null;
                const isUsed = contentLower.includes(termText.toLowerCase());
                const count = countTermInContent(termText);
                return (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-medium", isUsed ? "text-green-400" : "text-foreground")}>{termText}</span>
                      {term.weight && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded">w:{term.weight}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {count > 0 && (
                        <span className="text-xs text-muted-foreground">{count}×</span>
                      )}
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        isUsed ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                      )}>
                        {isUsed ? '✓ Used' : '✗ Missing'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">No NeuronWriter term data available.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// HELPER COMPONENTS (defined OUTSIDE NeuronWriterTab)
// ═══════════════════════════════════════════════════════════════════

function QualityMetric({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-medium">{value}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// ── Collapsible NeuronWriter Section ──

interface NeuronSectionProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accentColor: string;
  isExpanded: boolean;
  onToggle: () => void;
  count: number;
  children: React.ReactNode;
}

function NeuronSection({ title, subtitle, icon, isExpanded, onToggle, count, children }: NeuronSectionProps) {
  return (
    <div className="bg-card/50 border border-border rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <div className="text-left">
            <h4 className="text-sm font-semibold text-foreground">{title}</h4>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full font-medium">{count}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Term Grid (for basic/extended/entity terms) ──

interface NeuronWriterTermDataForGrid {
  term: string;
  weight: number;
  recommended: number;
}

interface TermGridProps {
  terms: NeuronWriterTermDataForGrid[];
  content: string;
  filter: 'all' | 'missing' | 'underused' | 'optimal';
}

function TermGrid({ terms, content, filter }: TermGridProps) {
  if (!terms || terms.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-4">No terms in this category.</p>;
  }

  const filteredTerms = terms.filter(t => {
    const termLower = t.term.toLowerCase();
    const regex = new RegExp(termLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const count = (content.match(regex) || []).length;
    const recommended = t.recommended || 1;
    const status = count === 0 ? 'missing' : count < recommended ? 'underused' : 'optimal';
    return filter === 'all' || status === filter;
  });

  if (filteredTerms.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-4">No terms match the current filter.</p>;
  }

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[1fr_60px_60px_80px_120px] gap-2 px-3 py-1 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
        <span>Term</span>
        <span className="text-center">Weight</span>
        <span className="text-center">Found</span>
        <span className="text-center">Target</span>
        <span className="text-right">Status</span>
      </div>
      {filteredTerms.map((term, i) => {
        const termLower = term.term.toLowerCase();
        const regex = new RegExp(termLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const count = (content.match(regex) || []).length;
        const recommended = term.recommended || 1;
        const status = count === 0 ? 'missing' : count < recommended ? 'underused' : count <= recommended * 1.5 ? 'optimal' : 'overused';

        return (
          <div key={i} className={cn(
            "grid grid-cols-[1fr_60px_60px_80px_120px] gap-2 items-center px-3 py-2 rounded-lg text-sm transition-colors",
            status === 'optimal' ? "bg-green-500/5 hover:bg-green-500/10" :
            status === 'underused' ? "bg-yellow-500/5 hover:bg-yellow-500/10" :
            status === 'missing' ? "bg-red-500/5 hover:bg-red-500/10" :
            "bg-blue-500/5 hover:bg-blue-500/10"
          )}>
            <span className={cn("font-medium truncate", status === 'optimal' ? "text-green-400" : status === 'missing' ? "text-red-400" : status === 'underused' ? "text-yellow-400" : "text-blue-400")}>
              {term.term}
            </span>
            <span className="text-center text-muted-foreground text-xs">{term.weight}</span>
            <span className={cn("text-center font-bold text-xs", count > 0 ? "text-foreground" : "text-red-400")}>
              {count}
            </span>
            <span className="text-center text-muted-foreground text-xs">{recommended}×</span>
            <div className="flex items-center justify-end gap-1.5">
              <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all",
                  status === 'optimal' ? "bg-green-500" :
                  status === 'underused' ? "bg-yellow-500" :
                  status === 'missing' ? "bg-red-500" : "bg-blue-500"
                )} style={{ width: `${Math.min(100, (count / Math.max(1, recommended)) * 100)}%` }} />
              </div>
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider whitespace-nowrap",
                status === 'optimal' ? "bg-green-500/20 text-green-400" :
                status === 'underused' ? "bg-yellow-500/20 text-yellow-400" :
                status === 'missing' ? "bg-red-500/20 text-red-400" :
                "bg-blue-500/20 text-blue-400"
              )}>
                {status}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Heading Suggestion List ──

interface NeuronWriterHeadingDataForList {
  text: string;
  level: string;
  source?: string;
  relevanceScore?: number;
}

function HeadingList({ headings }: { headings: NeuronWriterHeadingDataForList[] }) {
  if (!headings || headings.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-4">No heading suggestions.</p>;
  }

  return (
    <div className="space-y-2">
      {headings.map((h, i) => (
        <div key={i} className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors">
          <span className={cn(
            "flex-shrink-0 px-2 py-0.5 rounded font-mono text-xs font-bold uppercase",
            h.level === 'h1' ? "bg-amber-500/20 text-amber-400" :
            h.level === 'h2' ? "bg-emerald-500/20 text-emerald-400" :
            "bg-cyan-500/20 text-cyan-400"
          )}>
            {h.level}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{h.text}</p>
            {h.source && (
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{h.source}</p>
            )}
          </div>
          {h.relevanceScore !== undefined && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="h-1.5 w-12 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    h.relevanceScore >= 80 ? "bg-green-500" :
                    h.relevanceScore >= 50 ? "bg-yellow-500" :
                    "bg-red-500"
                  )}
                  style={{ width: `${h.relevanceScore}%` }}
                />
              </div>
              <span className={cn(
                "text-[10px] font-semibold tabular-nums",
                h.relevanceScore >= 80 ? "text-green-400" :
                h.relevanceScore >= 50 ? "text-yellow-400" :
                "text-red-400"
              )}>
                {h.relevanceScore}%
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════

export default ContentViewerPanel;
