import { useState, useCallback } from 'react';
import { useOptimizerStore } from '@/lib/store';

interface PublishResult {
  success: boolean;
  postId?: number;
  postUrl?: string;
  error?: string;
}

export function useWordPressPublish() {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const { config } = useOptimizerStore();

  const publish = useCallback(async (
    title: string,
    content: string,
    options?: {
      excerpt?: string;
      status?: 'draft' | 'publish' | 'pending' | 'private';
      slug?: string;
      metaDescription?: string;
      seoTitle?: string;
      sourceUrl?: string;
      existingPostId?: number;
    }
  ): Promise<PublishResult> => {
    setIsPublishing(true);
    setPublishResult(null);

    try {
      if (!config.wpUrl || !config.wpUsername || !config.wpAppPassword) {
        throw new Error('WordPress not configured. Add WordPress URL, username, and application password in Setup.');
      }

      try {
        const parsed = new URL(config.wpUrl.startsWith('http') ? config.wpUrl : `https://${config.wpUrl}`);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          throw new Error('WordPress URL must use HTTP or HTTPS');
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes('HTTP')) throw e;
        throw new Error('Invalid WordPress URL format');
      }

      const safeSlug = options?.slug ? options.slug.replace(/^\/+/, '').split('/').pop() : undefined;

      const body = {
        wpUrl: config.wpUrl,
        username: config.wpUsername,
        appPassword: config.wpAppPassword,
        title,
        content,
        excerpt: options?.excerpt,
        status: options?.status || 'draft',
        slug: safeSlug,
        metaDescription: options?.metaDescription,
        seoTitle: options?.seoTitle,
        sourceUrl: options?.sourceUrl,
        existingPostId: options?.existingPostId,
      };

      const maxAttempts = 2;
      let lastError: Error | null = null;
      let data: Record<string, unknown> | null = null;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const response = await fetch('/api/wordpress-publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(60000),
          });
          data = await response.json();
          break;
        } catch (fetchError) {
          lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
          if (attempt < maxAttempts - 1 && lastError.name !== 'AbortError') {
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }
          if (lastError.name === 'TimeoutError' || lastError.message?.includes('timeout')) {
            throw new Error('WordPress publish timed out after 60 seconds');
          }
          throw lastError;
        }
      }

      if (!data?.success) {
        throw new Error((data?.error as string) || lastError?.message || 'Failed to publish to WordPress');
      }

      const result: PublishResult = {
        success: true,
        postId: data.post?.id,
        postUrl: data.post?.url,
      };

      setPublishResult(result);
      return result;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const result: PublishResult = {
        success: false,
        error: errorMsg,
      };
      setPublishResult(result);
      return result;
    } finally {
      setIsPublishing(false);
    }
  }, [config]);

  const clearResult = useCallback(() => {
    setPublishResult(null);
  }, []);

  return {
    publish,
    isPublishing,
    publishResult,
    clearResult,
    isConfigured: !!(config.wpUrl && config.wpUsername && config.wpAppPassword),
  };
}
