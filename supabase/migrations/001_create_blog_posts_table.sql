-- Create table for persisting generated blog posts
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)

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

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_blog_posts_item_id ON generated_blog_posts(item_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_keyword ON generated_blog_posts(primary_keyword);
CREATE INDEX IF NOT EXISTS idx_blog_posts_generated_at ON generated_blog_posts(generated_at DESC);

-- Enable Row Level Security
ALTER TABLE generated_blog_posts ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow all operations (adjust for your auth requirements)
DROP POLICY IF EXISTS "Allow all operations" ON generated_blog_posts;
CREATE POLICY "Allow all operations" ON generated_blog_posts FOR ALL USING (true);
