import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import type { GeneratedContentStore } from '../store';

export interface PersistedBlogPost {
  id: string;
  item_id: string;
  title: string;
  seo_title?: string;
  content: string;
  meta_description: string;
  slug: string;
  primary_keyword: string;
  secondary_keywords: string[];
  word_count: number;
  quality_score: {
    overall: number;
    readability: number;
    seo: number;
    eeat: number;
    uniqueness: number;
    factAccuracy: number;
  };
  internal_links: Array<{ anchorText?: string; anchor?: string; targetUrl: string; context: string }>;
  schema?: unknown;
  serp_analysis?: {
    avgWordCount: number;
    recommendedWordCount: number;
    userIntent: string;
  };
  neuronwriter_query_id?: string;
  generated_at: string;
  model: string;
  created_at?: string;
  updated_at?: string;
}

const TABLE_NAME = 'generated_blog_posts';

export async function ensureTableExists(): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn('[ContentPersistence] Supabase not configured');
    return false;
  }

  try {
    const { error } = await supabase.from(TABLE_NAME).select('id').limit(1);
    
    if (error && error.code === '42P01') {
      console.log('[ContentPersistence] Table does not exist. Please create it in Supabase.');
      return false;
    }
    
    if (error) {
      console.error('[ContentPersistence] Table check error:', error.message);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('[ContentPersistence] Connection error:', err);
    return false;
  }
}

export async function loadAllBlogPosts(): Promise<GeneratedContentStore> {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn('[ContentPersistence] Supabase not configured, skipping load');
    return {};
  }

  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('generated_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        console.log('[ContentPersistence] Table not found. Run the SQL migration to create it.');
        return {};
      }
      console.error('[ContentPersistence] Load error:', error.message);
      return {};
    }

    const store: GeneratedContentStore = {};
    for (const row of (data || [])) {
      store[row.item_id] = {
        id: row.id,
        title: row.title,
        seoTitle: row.seo_title,
        content: row.content,
        metaDescription: row.meta_description,
        slug: row.slug,
        primaryKeyword: row.primary_keyword,
        secondaryKeywords: row.secondary_keywords || [],
        wordCount: row.word_count,
        qualityScore: row.quality_score || {
          overall: 0,
          readability: 0,
          seo: 0,
          eeat: 0,
          uniqueness: 0,
          factAccuracy: 0,
        },
        internalLinks: row.internal_links || [],
        schema: row.schema,
        serpAnalysis: row.serp_analysis,
        neuronWriterQueryId: row.neuronwriter_query_id,
        generatedAt: row.generated_at,
        model: row.model,
      };
    }

    console.log(`[ContentPersistence] Loaded ${Object.keys(store).length} blog posts from Supabase`);
    return store;
  } catch (err) {
    console.error('[ContentPersistence] Load exception:', err);
    return {};
  }
}

export async function saveBlogPost(itemId: string, content: GeneratedContentStore[string]): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn('[ContentPersistence] Supabase not configured, skipping save');
    return false;
  }

  try {
    const row: Partial<PersistedBlogPost> = {
      item_id: itemId,
      id: content.id,
      title: content.title,
      seo_title: content.seoTitle,
      content: content.content,
      meta_description: content.metaDescription,
      slug: content.slug,
      primary_keyword: content.primaryKeyword,
      secondary_keywords: content.secondaryKeywords,
      word_count: content.wordCount,
      quality_score: content.qualityScore,
      internal_links: content.internalLinks,
      schema: content.schema,
      serp_analysis: content.serpAnalysis,
      neuronwriter_query_id: content.neuronWriterQueryId,
      generated_at: content.generatedAt,
      model: content.model,
    };

    const { error } = await supabase
      .from(TABLE_NAME)
      .upsert(row, { onConflict: 'item_id' });

    if (error) {
      if (error.code === '42P01') {
        console.log('[ContentPersistence] Table not found. Please create it in Supabase.');
        return false;
      }
      console.error('[ContentPersistence] Save error:', error.message);
      return false;
    }

    console.log(`[ContentPersistence] Saved blog post: ${content.title}`);
    return true;
  } catch (err) {
    console.error('[ContentPersistence] Save exception:', err);
    return false;
  }
}

export async function deleteBlogPost(itemId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) {
    return false;
  }

  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('item_id', itemId);

    if (error) {
      console.error('[ContentPersistence] Delete error:', error.message);
      return false;
    }

    console.log(`[ContentPersistence] Deleted blog post: ${itemId}`);
    return true;
  } catch (err) {
    console.error('[ContentPersistence] Delete exception:', err);
    return false;
  }
}

export const SQL_CREATE_TABLE = `
-- Run this SQL in your Supabase SQL Editor to create the blog posts table
CREATE TABLE IF NOT EXISTS generated_blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  seo_title TEXT,
  content TEXT NOT NULL,
  meta_description TEXT,
  slug TEXT,
  primary_keyword TEXT NOT NULL,
  secondary_keywords JSONB DEFAULT '[]',
  word_count INTEGER DEFAULT 0,
  quality_score JSONB DEFAULT '{}',
  internal_links JSONB DEFAULT '[]',
  schema JSONB,
  serp_analysis JSONB,
  neuronwriter_query_id TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_blog_posts_item_id ON generated_blog_posts(item_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_keyword ON generated_blog_posts(primary_keyword);
CREATE INDEX IF NOT EXISTS idx_blog_posts_generated_at ON generated_blog_posts(generated_at DESC);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE generated_blog_posts ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow all operations (adjust for your auth requirements)
CREATE POLICY "Allow all operations" ON generated_blog_posts FOR ALL USING (true);
`;
