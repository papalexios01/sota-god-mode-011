import { useEffect, useState, useCallback } from 'react';
import { useOptimizerStore, type GeneratedContentStore } from '@/lib/store';
import { loadAllBlogPosts, saveBlogPost, deleteBlogPost, ensureTableExists } from '@/lib/api/contentPersistence';
import { toast } from 'sonner';

export function useDataSync() {
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

  const loadFromDatabase = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const tableExists = await ensureTableExists();
      if (!tableExists) {
        setError('Database connection failed. The server may not be running.');
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
      console.log(`[DataSync] Successfully loaded ${loadedCount} blog posts`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setIsConnected(false);
      console.error('[DataSync] Load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [setGeneratedContent, contentItems, addContentItemWithId]);

  const saveToDatabase = useCallback(async (itemId: string, contentOverride?: GeneratedContentStore[string]) => {
    const content = contentOverride || generatedContentsStore[itemId];
    if (!content) {
      console.warn('[DataSync] No content found for item:', itemId);
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
      console.error('[DataSync] Save error:', err);
      setTableMissing(true);
      return false;
    }
  }, [generatedContentsStore]);

  const deleteFromDatabase = useCallback(async (itemId: string) => {
    try {
      return await deleteBlogPost(itemId);
    } catch (err) {
      console.error('[DataSync] Delete error:', err);
      return false;
    }
  }, []);

  const syncAllToDatabase = useCallback(async () => {
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
    loadFromDatabase().catch(err => {
      console.error('[DataSync] Initial load failed:', err);
      setIsConnected(false);
      setIsLoading(false);
    });
  }, []);

  return {
    isLoading,
    isConnected,
    lastSyncTime,
    error,
    tableMissing,
    loadFromDatabase,
    saveToDatabase,
    deleteFromDatabase,
    syncAllToDatabase,
    loadFromSupabase: loadFromDatabase,
    saveToSupabase: saveToDatabase,
    deleteFromSupabase: deleteFromDatabase,
    syncAllToSupabase: syncAllToDatabase,
  };
}

export { useDataSync as useSupabaseSync };
