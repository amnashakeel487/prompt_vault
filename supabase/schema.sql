-- ==============================================================================
-- PROMPTVAULT SUPABASE SCHEMA
-- ==============================================================================

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon TEXT DEFAULT 'Sparkles',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. SUBCATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.subcategories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. PROMPTS TABLE
CREATE TABLE IF NOT EXISTS public.prompts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    subcategory_id TEXT REFERENCES public.subcategories(id) ON DELETE SET NULL,
    featured_image TEXT,
    output_image TEXT,
    prompt TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::JSONB,
    tags TEXT[] DEFAULT '{}'::TEXT[],
    author TEXT DEFAULT 'Admin',
    views INTEGER DEFAULT 0 NOT NULL,
    copies INTEGER DEFAULT 0 NOT NULL,
    featured BOOLEAN DEFAULT FALSE NOT NULL,
    popular BOOLEAN DEFAULT FALSE NOT NULL,
    trending BOOLEAN DEFAULT FALSE NOT NULL,
    status TEXT DEFAULT 'draft' NOT NULL CHECK (status IN ('published', 'draft', 'archived')),
    seo_title TEXT,
    seo_description TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. CONTACT MESSAGES TABLE (Inbox)
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_prompts_slug ON public.prompts(slug);
CREATE INDEX IF NOT EXISTS idx_prompts_status ON public.prompts(status);
CREATE INDEX IF NOT EXISTS idx_prompts_category_id ON public.prompts(category_id);
CREATE INDEX IF NOT EXISTS idx_prompts_subcategory_id ON public.prompts(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_prompts_created_at ON public.prompts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompts_views ON public.prompts(views DESC);
CREATE INDEX IF NOT EXISTS idx_prompts_copies ON public.prompts(copies DESC);
CREATE INDEX IF NOT EXISTS idx_prompts_featured ON public.prompts(featured) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_prompts_trending ON public.prompts(trending) WHERE trending = TRUE;
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON public.subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON public.contact_messages(created_at DESC);

-- 6. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Categories RLS Policies
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories"
    ON public.categories FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated admins have full CRUD on categories" ON public.categories;
CREATE POLICY "Authenticated admins have full CRUD on categories"
    ON public.categories FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Subcategories RLS Policies
DROP POLICY IF EXISTS "Public can view subcategories" ON public.subcategories;
CREATE POLICY "Public can view subcategories"
    ON public.subcategories FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated admins have full CRUD on subcategories" ON public.subcategories;
CREATE POLICY "Authenticated admins have full CRUD on subcategories"
    ON public.subcategories FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Prompts RLS Policies
DROP POLICY IF EXISTS "Public can view published prompts" ON public.prompts;
CREATE POLICY "Public can view published prompts"
    ON public.prompts FOR SELECT
    USING (status = 'published' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated admins have full insert on prompts" ON public.prompts;
CREATE POLICY "Authenticated admins have full insert on prompts"
    ON public.prompts FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated admins have full update on prompts" ON public.prompts;
CREATE POLICY "Authenticated admins have full update on prompts"
    ON public.prompts FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated admins have full delete on prompts" ON public.prompts;
CREATE POLICY "Authenticated admins have full delete on prompts"
    ON public.prompts FOR DELETE
    TO authenticated
    USING (true);

-- Contact Messages RLS Policies
DROP POLICY IF EXISTS "Public can insert contact messages" ON public.contact_messages;
CREATE POLICY "Public can insert contact messages"
    ON public.contact_messages FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated admins have full CRUD on contact messages" ON public.contact_messages;
CREATE POLICY "Authenticated admins have full CRUD on contact messages"
    ON public.contact_messages FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 7. RPC STORED PROCEDURES FOR ATOMIC COUNTER INCREMENTS
-- Increment views count
CREATE OR REPLACE FUNCTION public.increment_views(prompt_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.prompts
    SET views = views + 1
    WHERE id = prompt_id;
END;
$$;

-- Increment copies count
CREATE OR REPLACE FUNCTION public.increment_copies(prompt_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.prompts
    SET copies = copies + 1
    WHERE id = prompt_id;
END;
$$;

-- Grant execution to public / anon and authenticated
GRANT EXECUTE ON FUNCTION public.increment_views(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_copies(TEXT) TO anon, authenticated;


-- ==============================================================================
-- INITIAL SEED DATA
-- ==============================================================================

INSERT INTO public.categories (id, name, slug, icon) VALUES
('c1', 'Marketing', 'marketing', 'Megaphone'),
('c2', 'Copywriting', 'copywriting', 'PenLine'),
('c3', 'Coding', 'coding', 'Code2'),
('c4', 'Business', 'business', 'Briefcase'),
('c5', 'Social Media', 'social-media', 'Share2'),
('c6', 'Design', 'design', 'Palette')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, slug = EXCLUDED.slug, icon = EXCLUDED.icon;

INSERT INTO public.subcategories (id, category_id, name, slug) VALUES
('s1', 'c1', 'Ad Copy', 'ad-copy'),
('s2', 'c1', 'Email Campaigns', 'email-campaigns'),
('s3', 'c3', 'Code Review', 'code-review'),
('s4', 'c3', 'Debugging', 'debugging'),
('s5', 'c5', 'Captions', 'captions')
ON CONFLICT (id) DO UPDATE
SET category_id = EXCLUDED.category_id, name = EXCLUDED.name, slug = EXCLUDED.slug;

INSERT INTO public.prompts (
    id, title, slug, category_id, subcategory_id, description,
    featured_image, output_image, prompt, variables, tags, author,
    views, copies, featured, popular, trending, status, seo_title, seo_description,
    created_at, updated_at
) VALUES
(
    'p1',
    'High-Converting Facebook Ad Copy',
    'high-converting-facebook-ad-copy',
    'c1',
    's1',
    'Generate a scroll-stopping Facebook ad tailored to your business, audience, and offer — built around proven direct-response structure.',
    'https://images.unsplash.com/photo-1533750349088-cd871a92f312?q=80&w=1200&auto=format&fit=crop',
    '',
    'Create a Facebook Ad for {{BusinessName}} targeting {{TargetAudience}} in {{City}}.\n\nTone: {{Tone}}\nOffer: {{Offer}}\nPlatform: {{Platform}}\nGoal: {{Goal}}\n\nWrite a scroll-stopping hook, three benefit-driven bullet points, and a clear call to action.',
    '["BusinessName", "TargetAudience", "City", "Tone", "Offer", "Platform", "Goal"]'::jsonb,
    ARRAY['ads', 'facebook', 'marketing'],
    'Admin',
    4821,
    1290,
    true,
    true,
    true,
    'published',
    'Facebook Ad Copy Prompt',
    'Generate high-converting Facebook ad copy in seconds.',
    '2026-06-02 00:00:00+00',
    '2026-07-14 00:00:00+00'
),
(
    'p2',
    'Cold Outreach Email That Gets Replies',
    'cold-outreach-email-that-gets-replies',
    'c1',
    's2',
    'A short, personalized cold email framework designed to earn a reply, not a delete.',
    'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?q=80&w=1200&auto=format&fit=crop',
    '',
    'Write a cold outreach email from {{SenderName}} at {{BusinessName}} to {{TargetAudience}}.\n\nGoal: {{Goal}}\nTone: {{Tone}}\nLanguage: {{Language}}\n\nKeep it under 120 words, one clear ask, no fluff.',
    '["SenderName", "BusinessName", "TargetAudience", "Goal", "Tone", "Language"]'::jsonb,
    ARRAY['email', 'outreach', 'sales'],
    'Admin',
    3110,
    902,
    false,
    true,
    false,
    'published',
    'Cold Email Prompt',
    'Write cold outreach emails that get replies.',
    '2026-05-18 00:00:00+00',
    '2026-06-30 00:00:00+00'
),
(
    'p3',
    'Senior-Level Code Review Checklist',
    'senior-level-code-review-checklist',
    'c3',
    's3',
    'Feed in a diff or file and get a structured, senior-engineer-style review.',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop',
    '',
    'Review the following {{Language}} code for {{Platform}}.\n\nFocus areas: {{Goal}}\n\nFlag bugs, security issues, and readability problems. Suggest concrete fixes, not just criticism.\n\nCode:\n```\n{{Code}}\n```',
    '["Language", "Platform", "Goal", "Code"]'::jsonb,
    ARRAY['coding', 'review', 'engineering'],
    'Admin',
    6720,
    2140,
    true,
    true,
    true,
    'published',
    'Code Review Prompt',
    'Get a senior-level code review from a single prompt.',
    '2026-04-22 00:00:00+00',
    '2026-07-01 00:00:00+00'
),
(
    'p4',
    'Instagram Caption Generator',
    'instagram-caption-generator',
    'c5',
    's5',
    'On-brand Instagram captions with a hook, story beat, and CTA.',
    'https://images.unsplash.com/photo-1611262588024-d12430b98920?q=80&w=1200&auto=format&fit=crop',
    '',
    'Write an Instagram caption for {{BusinessName}} about {{Offer}}.\n\nTone: {{Tone}}\nTarget audience: {{TargetAudience}}\n\nInclude a hook line, a short story beat, and a CTA. Suggest 5 relevant hashtags.',
    '["BusinessName", "Offer", "Tone", "TargetAudience"]'::jsonb,
    ARRAY['instagram', 'social', 'captions'],
    'Admin',
    2210,
    610,
    false,
    false,
    true,
    'published',
    'Instagram Caption Prompt',
    'Generate on-brand Instagram captions instantly.',
    '2026-07-01 00:00:00+00',
    '2026-07-10 00:00:00+00'
),
(
    'p5',
    'Startup Pitch Deck Narrative',
    'startup-pitch-deck-narrative',
    'c4',
    NULL,
    'Turn a rough idea into a structured, investor-ready pitch narrative.',
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1200&auto=format&fit=crop',
    '',
    'Build a pitch narrative for {{BusinessName}}, a company solving {{Goal}} for {{TargetAudience}} in {{Country}}.\n\nInclude: problem, solution, market size, business model, and ask.',
    '["BusinessName", "Goal", "TargetAudience", "Country"]'::jsonb,
    ARRAY['pitch', 'startup', 'business'],
    'Admin',
    1890,
    402,
    false,
    false,
    false,
    'published',
    'Pitch Deck Prompt',
    'Generate an investor-ready pitch narrative.',
    '2026-03-11 00:00:00+00',
    '2026-05-02 00:00:00+00'
),
(
    'p6',
    'Debug Any Stack Trace',
    'debug-any-stack-trace',
    'c3',
    's4',
    'Paste an error and get a root-cause explanation plus a fix.',
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1200&auto=format&fit=crop',
    '',
    'I am encountering the following error in {{Language}} running on {{Platform}}:\n\n```\n{{ErrorTrace}}\n```\n\nExplain what went wrong, the likely root cause, and provide a corrected code snippet.',
    '["Language", "Platform", "ErrorTrace"]'::jsonb,
    ARRAY['debugging', 'errors', 'code'],
    'Admin',
    5120,
    1880,
    true,
    true,
    false,
    'published',
    'Stack Trace Debugger',
    'Debug any error log or stack trace in seconds.',
    '2026-06-15 00:00:00+00',
    '2026-07-20 00:00:00+00'
)
ON CONFLICT (id) DO UPDATE
SET 
    title = EXCLUDED.title,
    slug = EXCLUDED.slug,
    category_id = EXCLUDED.category_id,
    subcategory_id = EXCLUDED.subcategory_id,
    description = EXCLUDED.description,
    featured_image = EXCLUDED.featured_image,
    output_image = EXCLUDED.output_image,
    prompt = EXCLUDED.prompt,
    variables = EXCLUDED.variables,
    tags = EXCLUDED.tags,
    author = EXCLUDED.author,
    views = EXCLUDED.views,
    copies = EXCLUDED.copies,
    featured = EXCLUDED.featured,
    popular = EXCLUDED.popular,
    trending = EXCLUDED.trending,
    status = EXCLUDED.status,
    seo_title = EXCLUDED.seo_title,
    seo_description = EXCLUDED.seo_description,
    updated_at = EXCLUDED.updated_at;
