
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  event_type text NOT NULL,
  event_reference_id uuid NULL,
  tone text NOT NULL DEFAULT 'professional',
  platform text NOT NULL DEFAULT 'blog',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz NULL
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to blog_posts"
  ON public.blog_posts FOR ALL TO public
  USING (true) WITH CHECK (true);
