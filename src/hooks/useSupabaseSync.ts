import { useEffect, useState, useCallback } from 'react';
import { useOptimizerStore, type ContentItem, type GeneratedContentStore } from '@/lib/store';
import { loadAllBlogPosts, saveBlogPost, deleteBlogPost, ensureTableExists } from '@/lib/supabase/contentPersistence';
import { isSupabaseConfigured } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useSupabaseSync() {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);

  const { 
    generatedContentsStore, 
    setGeneratedContent,
    contentItems,
    addContentItemWithId,
  } = useOptimizerStore();

  const loadFromSupabase = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      console.log('[SupabaseSync] Supabase not configured, skipping load');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const tableExists = await ensureTableExists();
      if (!tableExists) {
        setError('Blog posts table not found. Please run the SQL migration in Supabase.');
        setTableMissing(true);
        setIsConnected(false);
        setIsLoading(false);
        return;
      }
      setTableMissing(false);

      const loadedContent = await loadAllBlogPosts();
      const loadedCount = Object.keys(loadedContent).length;

      if (loadedCount > 0) {
        for (const [itemId, content] of Object.entries(loadedContent)) {
          setGeneratedContent(itemId, content);

          const existingItem = contentItems.find(item => item.id === itemId);
          if (!existingItem) {
            addContentItemWithId({
              id: itemId,
              title: content.title,
              type: 'single',
              status: 'completed',
              primaryKeyword: content.primaryKeyword,
              content: content.content,
              wordCount: content.wordCount,
              createdAt: new Date(content.generatedAt),
              updatedAt: new Date(content.generatedAt),
              generatedContentId: content.id,
            });
          }
        }

        toast.success(`Loaded ${loadedCount} blog posts from database`);
      }

      setIsConnected(true);
      setLastSyncTime(new Date());
      console.log(`[SupabaseSync] Successfully loaded ${loadedCount} blog posts`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setIsConnected(false);
      console.error('[SupabaseSync] Load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [setGeneratedContent, contentItems, addContentItemWithId]);

  const saveToSupabase = useCallback(async (itemId: string, contentOverride?: GeneratedContentStore[string]) => {
    if (!isSupabaseConfigured()) {
      return false;
    }

    // Use contentOverride if provided (for immediate save after generation)
    // Otherwise fall back to store lookup
    const content = contentOverride || generatedContentsStore[itemId];
    if (!content) {
      console.warn('[SupabaseSync] No content found for item:', itemId);
      return false;
    }

    try {
      const success = await saveBlogPost(itemId, content);
      if (success) {
        setLastSyncTime(new Date());
        setTableMissing(false);
      } else {
        setTableMissing(true);
      }
      return success;
    } catch (err) {
      console.error('[SupabaseSync] Save error:', err);
      setTableMissing(true);
      return false;
    }
  }, [generatedContentsStore]);

  const deleteFromSupabase = useCallback(async (itemId: string) => {
    if (!isSupabaseConfigured()) {
      return false;
    }

    try {
      return await deleteBlogPost(itemId);
    } catch (err) {
      console.error('[SupabaseSync] Delete error:', err);
      return false;
    }
  }, []);

  const syncAllToSupabase = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      return;
    }

    setIsLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const [itemId, content] of Object.entries(generatedContentsStore)) {
      try {
        const success = await saveBlogPost(itemId, content);
        if (success) successCount++;
        else errorCount++;
      } catch {
        errorCount++;
      }
    }

    setIsLoading(false);
    setLastSyncTime(new Date());

    if (successCount > 0) {
      toast.success(`Synced ${successCount} blog posts to database`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to sync ${errorCount} blog posts`);
    }
  }, [generatedContentsStore]);

  useEffect(() => {
    loadFromSupabase();
  }, []);

  return {
    isLoading,
    isConnected,
    lastSyncTime,
    error,
    tableMissing,
    loadFromSupabase,
    saveToSupabase,
    deleteFromSupabase,
    syncAllToSupabase,
  };
}
