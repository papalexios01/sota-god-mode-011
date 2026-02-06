/*
  # Update RLS policies for anonymous access

  1. Changes
    - Drop existing restrictive policies that require auth.uid()
    - Add new policies that allow anon access for rows where user_id IS NULL
    - Authenticated users still access only their own rows
    - This supports the app's current no-auth mode while being auth-ready

  2. Security
    - Anon users can only access rows with NULL user_id
    - Authenticated users can only access rows matching their user_id
    - No blanket access -- all policies are scoped
*/

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read own posts' AND tablename = 'generated_blog_posts') THEN
    DROP POLICY "Authenticated users can read own posts" ON generated_blog_posts;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert own posts' AND tablename = 'generated_blog_posts') THEN
    DROP POLICY "Authenticated users can insert own posts" ON generated_blog_posts;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update own posts' AND tablename = 'generated_blog_posts') THEN
    DROP POLICY "Authenticated users can update own posts" ON generated_blog_posts;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete own posts' AND tablename = 'generated_blog_posts') THEN
    DROP POLICY "Authenticated users can delete own posts" ON generated_blog_posts;
  END IF;
END $$;

CREATE POLICY "Users can read own posts"
  ON generated_blog_posts FOR SELECT
  TO anon, authenticated
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR
    (auth.uid() IS NULL AND user_id IS NULL)
  );

CREATE POLICY "Users can insert own posts"
  ON generated_blog_posts FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR
    (auth.uid() IS NULL AND user_id IS NULL)
  );

CREATE POLICY "Users can update own posts"
  ON generated_blog_posts FOR UPDATE
  TO anon, authenticated
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR
    (auth.uid() IS NULL AND user_id IS NULL)
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR
    (auth.uid() IS NULL AND user_id IS NULL)
  );

CREATE POLICY "Users can delete own posts"
  ON generated_blog_posts FOR DELETE
  TO anon, authenticated
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR
    (auth.uid() IS NULL AND user_id IS NULL)
  );
