/**
 * God Mode 2.0 - Content Preview Modal
 * 
 * View, copy, and manually publish generated content from history.
 * Essential for reviewing content that didn't meet quality threshold.
 */

import { useState } from 'react';
import { X, Copy, ExternalLink, FileText, CheckCircle2, AlertTriangle, Send, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useOptimizerStore } from '@/lib/store';
import type { GodModeHistoryItem } from '@/lib/sota/GodModeTypes';

interface GodModeContentPreviewProps {
  item: GodModeHistoryItem;
  onClose: () => void;
}

export function GodModeContentPreview({ item, onClose }: GodModeContentPreviewProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [showHtml, setShowHtml] = useState(false);
  const { config } = useOptimizerStore();

  const content = item.generatedContent;

  const handleCopyContent = async () => {
    if (!content?.content) return;
    
    try {
      await navigator.clipboard.writeText(content.content);
      toast.success('HTML content copied to clipboard!');
    } catch {
      toast.error('Failed to copy content');
    }
  };

  const handleCopyTitle = async () => {
    if (!content?.title) return;
    
    try {
      await navigator.clipboard.writeText(content.title);
      toast.success('Title copied!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleManualPublish = async () => {
    if (!content?.content || !content?.title) {
      toast.error('No content to publish');
      return;
    }

    if (!config.wpUrl || !config.wpUsername || !config.wpAppPassword) {
      toast.error('WordPress credentials not configured. Go to Setup tab.');
      return;
    }

    setIsPublishing(true);

    try {
      const response = await fetch(
        'https://ousxeycrhvuwaejhpqgv.supabase.co/functions/v1/wordpress-publish',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wpUrl: config.wpUrl,
            wpUsername: config.wpUsername,
            wpPassword: config.wpAppPassword,
            title: content.title,
            content: content.content,
            status: 'draft', // Always draft for manual publish
            seoTitle: content.seoTitle,
            metaDescription: content.metaDescription,
            slug: content.slug,
          }),
        }
      );

      const result = await response.json();

      if (result.success && result.postUrl) {
        toast.success('Published to WordPress as draft!', {
          action: {
            label: 'View',
            onClick: () => window.open(result.postUrl, '_blank'),
          },
        });
        onClose();
      } else {
        throw new Error(result.error || 'Publishing failed');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Publishing failed');
    } finally {
      setIsPublishing(false);
    }
  };

  const getActionBadge = () => {
    switch (item.action) {
      case 'published':
        return <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Published
        </span>;
      case 'generated':
        return <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-full flex items-center gap-1">
          <FileText className="w-3 h-3" /> Generated
        </span>;
      case 'skipped':
        return <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded-full flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Below Threshold
        </span>;
      default:
        return null;
    }
  };

  if (!content) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Content Available</h3>
          <p className="text-muted-foreground mb-4">
            This history item doesn't have stored content. This may happen for older entries 
            or items that encountered errors during generation.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
              <Eye className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Content Preview</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {getActionBadge()}
                {item.qualityScore && (
                  <span className={cn(
                    "px-2 py-0.5 text-xs rounded-full",
                    item.qualityScore >= 85 ? "bg-green-500/20 text-green-400" :
                    item.qualityScore >= 70 ? "bg-yellow-500/20 text-yellow-400" :
                    "bg-red-500/20 text-red-400"
                  )}>
                    Score: {item.qualityScore}%
                  </span>
                )}
                {item.wordCount && (
                  <span className="text-xs">{item.wordCount.toLocaleString()} words</span>
                )}
              </div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Meta Info Bar */}
        <div className="p-4 border-b border-border bg-muted/20 space-y-3">
          {/* Title */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <span className="text-xs text-muted-foreground block mb-1">Title</span>
              <p className="font-semibold text-foreground">{content.title}</p>
            </div>
            <button
              onClick={handleCopyTitle}
              className="p-2 text-muted-foreground hover:text-primary rounded-lg hover:bg-muted transition-colors"
              title="Copy title"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>

          {/* SEO Title & Meta */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-muted-foreground block mb-1">SEO Title</span>
              <p className="text-sm text-foreground truncate">{content.seoTitle || '—'}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block mb-1">Meta Description</span>
              <p className="text-sm text-foreground truncate">{content.metaDescription || '—'}</p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Toggle Buttons */}
          <div className="flex items-center gap-2 p-3 border-b border-border">
            <button
              onClick={() => setShowHtml(false)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg transition-colors",
                !showHtml ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Preview
            </button>
            <button
              onClick={() => setShowHtml(true)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg transition-colors",
                showHtml ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              HTML Source
            </button>
          </div>

          {/* Content Display */}
          <div className="flex-1 overflow-y-auto p-4">
            {showHtml ? (
              <pre className="text-sm text-foreground whitespace-pre-wrap font-mono bg-muted/30 p-4 rounded-lg overflow-x-auto">
                {content.content}
              </pre>
            ) : (
              <div
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: content.content }}
              />
            )}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30">
          <div className="text-xs text-muted-foreground">
            Generated: {new Date(item.timestamp).toLocaleString()}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyContent}
              className="px-4 py-2 bg-muted text-foreground rounded-lg font-medium flex items-center gap-2 hover:bg-muted/80 transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy HTML
            </button>

            {item.wordPressUrl ? (
              <a
                href={item.wordPressUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg font-medium flex items-center gap-2 hover:bg-green-500/30 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View on WordPress
              </a>
            ) : (
              <button
                onClick={handleManualPublish}
                disabled={isPublishing}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPublishing ? (
                  <>Publishing...</>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Publish to WordPress (Draft)
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
