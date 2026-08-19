-- ==============================================================================
-- PROMPTVAULT SUPABASE SCHEMA (Role-Based Admin + Multi-Image + Approvals)
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
    status TEXT DEFAULT 'published' NOT NULL CHECK (status IN ('published', 'draft', 'pending', 'rejected', 'archived')),
    rejection_reason TEXT,
    seo_title TEXT,
    seo_description TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Safely add columns / update constraint if table already exists
DO $$
BEGIN
    -- Add rejection_reason if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'prompts' AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE public.prompts ADD COLUMN rejection_reason TEXT;
    END IF;

    -- Update status check constraint to include pending and rejected
    ALTER TABLE public.prompts DROP CONSTRAINT IF EXISTS prompts_status_check;
    ALTER TABLE public.prompts ADD CONSTRAINT prompts_status_check 
        CHECK (status IN ('published', 'draft', 'pending', 'rejected', 'archived'));
END $$;

-- 4. PROMPT IMAGES TABLE (Multi-image support: GitHub + Google Drive + Direct)
CREATE TABLE IF NOT EXISTS public.prompt_images (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    prompt_id TEXT NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('github', 'google_drive', 'direct')),
    sort_order INTEGER DEFAULT 0 NOT NULL,
    is_featured BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. ADMIN PROFILES TABLE (Role-Based Access: super_admin vs category_admin)
CREATE TABLE IF NOT EXISTS public.admin_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'category_admin')),
    assigned_category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. CONTACT MESSAGES TABLE (Inbox)
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. PERFORMANCE INDEXES
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
CREATE INDEX IF NOT EXISTS idx_prompt_images_prompt_id ON public.prompt_images(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_images_sort ON public.prompt_images(sort_order);
CREATE INDEX IF NOT EXISTS idx_admin_profiles_role ON public.admin_profiles(role);
CREATE INDEX IF NOT EXISTS idx_admin_profiles_category ON public.admin_profiles(assigned_category_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON public.contact_messages(created_at DESC);

-- ==============================================================================
-- 8. HELPER SECURITY FUNCTIONS FOR RLS
-- ==============================================================================

-- Check if current authenticated user is super_admin (or bootstrap fallback)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- If no admin_profiles exist in the system yet, allow authenticated user to act as super_admin
    IF NOT EXISTS (SELECT 1 FROM public.admin_profiles) THEN
        RETURN TRUE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.admin_profiles
        WHERE id = auth.uid() AND role = 'super_admin'
    );
END;
$$;

-- Get the category_id assigned to current admin (null for super_admin)
CREATE OR REPLACE FUNCTION public.get_admin_assigned_category()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    cat_id TEXT;
BEGIN
    SELECT assigned_category_id INTO cat_id
    FROM public.admin_profiles
    WHERE id = auth.uid();
    RETURN cat_id;
END;
$$;

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- A. Categories RLS Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories"
    ON public.categories FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Super admins have full CRUD on categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated admins have full CRUD on categories" ON public.categories;
CREATE POLICY "Super admins have full CRUD on categories"
    ON public.categories FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- B. Subcategories RLS Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view subcategories" ON public.subcategories;
CREATE POLICY "Public can view subcategories"
    ON public.subcategories FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Super admins have full CRUD on subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Authenticated admins have full CRUD on subcategories" ON public.subcategories;
CREATE POLICY "Super admins have full CRUD on subcategories"
    ON public.subcategories FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- C. Prompts RLS Policies (Category-Scoped Access & Approval Workflow)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view published prompts" ON public.prompts;
DROP POLICY IF EXISTS "Authenticated admins have full insert on prompts" ON public.prompts;
DROP POLICY IF EXISTS "Authenticated admins have full update on prompts" ON public.prompts;
DROP POLICY IF EXISTS "Authenticated admins have full delete on prompts" ON public.prompts;
DROP POLICY IF EXISTS "Super admin full access on prompts" ON public.prompts;
DROP POLICY IF EXISTS "Category admin select scoped prompts" ON public.prompts;
DROP POLICY IF EXISTS "Category admin insert scoped prompts" ON public.prompts;
DROP POLICY IF EXISTS "Category admin update scoped prompts" ON public.prompts;
DROP POLICY IF EXISTS "Category admin delete scoped prompts" ON public.prompts;

-- 1. Public & anon: strictly view 'published' prompts
CREATE POLICY "Public can view published prompts"
    ON public.prompts FOR SELECT
    USING (status = 'published');

-- 2. Super admin: unrestricted access
CREATE POLICY "Super admin full access on prompts"
    ON public.prompts FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- 3. Category admin SELECT: can view prompts in their assigned category
CREATE POLICY "Category admin select scoped prompts"
    ON public.prompts FOR SELECT
    TO authenticated
    USING (
        NOT public.is_super_admin()
        AND category_id = public.get_admin_assigned_category()
    );

-- 4. Category admin INSERT: can only insert into assigned category and MUST force status to 'pending' or 'draft'
CREATE POLICY "Category admin insert scoped prompts"
    ON public.prompts FOR INSERT
    TO authenticated
    WITH CHECK (
        NOT public.is_super_admin()
        AND category_id = public.get_admin_assigned_category()
        AND status IN ('pending', 'draft')
    );

-- 5. Category admin UPDATE: can update prompts in assigned category, but cannot set status to 'published'
CREATE POLICY "Category admin update scoped prompts"
    ON public.prompts FOR UPDATE
    TO authenticated
    USING (
        NOT public.is_super_admin()
        AND category_id = public.get_admin_assigned_category()
    )
    WITH CHECK (
        NOT public.is_super_admin()
        AND category_id = public.get_admin_assigned_category()
        AND status IN ('pending', 'draft')
    );

-- 6. Category admin DELETE: can delete only unapproved (pending/draft/rejected) prompts in assigned category
CREATE POLICY "Category admin delete scoped prompts"
    ON public.prompts FOR DELETE
    TO authenticated
    USING (
        NOT public.is_super_admin()
        AND category_id = public.get_admin_assigned_category()
        AND status IN ('pending', 'rejected', 'draft')
    );

-- ------------------------------------------------------------------------------
-- D. Prompt Images RLS Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view prompt images" ON public.prompt_images;
CREATE POLICY "Public can view prompt images"
    ON public.prompt_images FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.prompts
            WHERE prompts.id = prompt_images.prompt_id
            AND prompts.status = 'published'
        )
    );

DROP POLICY IF EXISTS "Super admin full access on prompt images" ON public.prompt_images;
CREATE POLICY "Super admin full access on prompt images"
    ON public.prompt_images FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Category admin access on scoped prompt images" ON public.prompt_images;
CREATE POLICY "Category admin access on scoped prompt images"
    ON public.prompt_images FOR ALL
    TO authenticated
    USING (
        NOT public.is_super_admin()
        AND EXISTS (
            SELECT 1 FROM public.prompts
            WHERE prompts.id = prompt_images.prompt_id
            AND prompts.category_id = public.get_admin_assigned_category()
        )
    )
    WITH CHECK (
        NOT public.is_super_admin()
        AND EXISTS (
            SELECT 1 FROM public.prompts
            WHERE prompts.id = prompt_images.prompt_id
            AND prompts.category_id = public.get_admin_assigned_category()
        )
    );

-- ------------------------------------------------------------------------------
-- E. Admin Profiles RLS Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Super admin full access on admin profiles" ON public.admin_profiles;
CREATE POLICY "Super admin full access on admin profiles"
    ON public.admin_profiles FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Admins can view own profile" ON public.admin_profiles;
CREATE POLICY "Admins can view own profile"
    ON public.admin_profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- ------------------------------------------------------------------------------
-- F. Contact Messages RLS Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can insert contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.contact_messages;
CREATE POLICY "Enable insert for all users"
    ON public.contact_messages FOR INSERT
    TO public
    WITH CHECK (true);

DROP POLICY IF EXISTS "Super admins have full CRUD on contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Enable select for authenticated only" ON public.contact_messages;
CREATE POLICY "Authenticated admins have access to contact messages"
    ON public.contact_messages FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 10. RPC STORED PROCEDURES FOR ATOMIC COUNTER INCREMENTS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_views(prompt_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.prompts
    SET views = views + 1
    WHERE id = prompt_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_copies(prompt_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;


-- ==============================================================================
-- 11. INITIAL SEED DATA
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
    featured_image, output_image, prompt, variables, tags,
    author, views, copies, featured, popular, trending, status,
    seo_title, seo_description
) VALUES
(
    'p1',
    'High-Converting Facebook Ad Copy',
    'high-converting-facebook-ad-copy',
    'c1',
    's1',
    'Generate a scroll-stopping Facebook ad tailored to your business, audience, and offer — built around proven direct-response frameworks.',
    'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop',
    'You are a world-class direct-response copywriter. Write 3 variations of a high-converting Facebook ad for {{BusinessName}}, a business that helps {{TargetAudience}} achieve {{PrimaryBenefit}}. The core offer is {{Offer}}, and the desired call to action is {{CTA}}. Use a {{Tone}} tone. Structure each variation with a scroll-stopping hook, body copy highlighting the main pain point and transformation, and a clear CTA.',
    '["BusinessName", "TargetAudience", "PrimaryBenefit", "Offer", "CTA", "Tone"]'::JSONB,
    ARRAY['ads', 'facebook', 'marketing', 'copywriting'],
    'PromptVault Team',
    4822,
    1290,
    TRUE,
    TRUE,
    TRUE,
    'published',
    'Facebook Ad Copy Generator Prompt | PromptVault',
    'Generate high-converting Facebook ads tailored to your audience and offer.'
),
(
    'p2',
    'Cold Outreach Email That Gets Replies',
    'cold-outreach-email-that-gets-replies',
    'c2',
    's2',
    'A short, personalized cold email framework designed to earn a reply, not a delete.',
    'https://images.unsplash.com/photo-1557200134-90327ee9fafa?q=80&w=1200&auto=format&fit=crop',
    NULL,
    'Write a concise 4-sentence cold outreach email from {{SenderName}} at {{SenderCompany}} to {{ProspectName}}, who is the {{ProspectTitle}} at {{ProspectCompany}}. The goal is to introduce {{ProductOrService}} which solves {{MainPainPoint}}. Include a low-friction call to action asking for {{LowFrictionAsk}}. Tone should be {{Tone}}.',
    '["SenderName", "SenderCompany", "ProspectName", "ProspectTitle", "ProspectCompany", "ProductOrService", "MainPainPoint", "LowFrictionAsk", "Tone"]'::JSONB,
    ARRAY['email', 'sales', 'outreach', 'b2b'],
    'PromptVault Team',
    3410,
    980,
    TRUE,
    TRUE,
    FALSE,
    'published',
    'Cold Outreach Email Prompt | PromptVault',
    'Generate personalized cold emails that get high reply rates.'
),
(
    'p3',
    'Senior-Level Code Review Checklist',
    'senior-level-code-review-checklist',
    'c3',
    's3',
    'Feed in a diff or file and get a structured, senior-engineer-style review.',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop',
    NULL,
    'Act as a Principal Software Engineer reviewing code written in {{Language}}. Analyze the following snippet or diff with a focus on {{FocusArea}} (e.g. security, performance, readability, testability). Code to review:\n\n```{{Language}}\n{{CodeSnippet}}\n```\n\nProvide: 1) Critical issues (if any), 2) Architectural recommendations, 3) Refactored code snippet demonstrating the best-practice fix.',
    '["Language", "FocusArea", "CodeSnippet"]'::JSONB,
    ARRAY['coding', 'review', 'engineering'],
    'PromptVault Team',
    6721,
    2141,
    TRUE,
    TRUE,
    TRUE,
    'published',
    'Senior Code Review Prompt | PromptVault',
    'Get structured, senior-engineer quality code reviews for any language.'
),
(
    'p4',
    'Debug Any Stack Trace',
    'debug-any-stack-trace',
    'c3',
    's4',
    'Paste an error and get a root-cause explanation plus a fix.',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1200&auto=format&fit=crop',
    NULL,
    'Analyze this {{Environment}} error stack trace and explain the root cause in plain English, then provide the exact fix:\n\n```\n{{StackTrace}}\n```\n\nContext about what the app was doing when it crashed:\n{{Context}}\n\nOutput format:\n- Root cause (2-3 sentences)\n- Likely culprit file/line\n- Step-by-step fix\n- Corrected code block',
    '["Environment", "StackTrace", "Context"]'::JSONB,
    ARRAY['debugging', 'errors', 'code'],
    'PromptVault Team',
    5122,
    1882,
    TRUE,
    TRUE,
    FALSE,
    'published',
    'Stack Trace Debugger Prompt | PromptVault',
    'Diagnose errors and get step-by-step fixes for any programming stack trace.'
),
(
    'p5',
    'Startup Pitch Deck Narrative',
    'startup-pitch-deck-narrative',
    'c4',
    NULL,
    'Turn a rough idea into a structured, investor-ready pitch narrative.',
    'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=1200&auto=format&fit=crop',
    NULL,
    'Create a compelling 10-slide pitch deck narrative for {{StartupName}}, which is building {{OneSentenceDescription}} for {{TargetMarket}}. The problem being solved is {{Problem}}, and our unique insight/solution is {{SecretSauce}}. We monetize via {{BusinessModel}}. Tone: {{Tone}}.',
    '["StartupName", "OneSentenceDescription", "TargetMarket", "Problem", "SecretSauce", "BusinessModel", "Tone"]'::JSONB,
    ARRAY['pitch', 'startup', 'business'],
    'PromptVault Team',
    2890,
    710,
    FALSE,
    FALSE,
    FALSE,
    'published',
    'Pitch Deck Narrative Generator | PromptVault',
    'Generate investor-ready pitch deck narratives for early-stage startups.'
),
(
    'p6',
    'Instagram Caption Generator',
    'instagram-caption-generator',
    'c5',
    's5',
    'On-brand Instagram captions with a hook, story beat, and CTA.',
    'https://images.unsplash.com/photo-1611262588024-d12430b98920?q=80&w=1200&auto=format&fit=crop',
    NULL,
    'Write 3 Instagram caption options for a post about {{Topic}} by {{BrandName}}. The image shows {{VisualDescription}}. Include a compelling first-line hook (under 125 chars so it does not get truncated before "more"), engaging body text with emojis, a clear call to action asking followers to {{CTA}}, and 15 relevant hashtags categorized by broad, niche, and community tags.',
    '["Topic", "BrandName", "VisualDescription", "CTA"]'::JSONB,
    ARRAY['instagram', 'social', 'captions'],
    'PromptVault Team',
    2211,
    610,
    FALSE,
    FALSE,
    TRUE,
    'published',
    'Instagram Caption Generator Prompt | PromptVault',
    'Generate engaging, on-brand Instagram captions with hooks and hashtags.'
)
ON CONFLICT (id) DO UPDATE 
SET title = EXCLUDED.title, slug = EXCLUDED.slug, prompt = EXCLUDED.prompt, status = EXCLUDED.status;

-- Also seed prompt_images for starter prompts
INSERT INTO public.prompt_images (id, prompt_id, image_url, source, sort_order, is_featured)
VALUES
('img-p1-1', 'p1', 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=1200&auto=format&fit=crop', 'direct', 0, TRUE),
('img-p1-2', 'p1', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop', 'direct', 1, FALSE),
('img-p2-1', 'p2', 'https://images.unsplash.com/photo-1557200134-90327ee9fafa?q=80&w=1200&auto=format&fit=crop', 'direct', 0, TRUE),
('img-p3-1', 'p3', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop', 'direct', 0, TRUE),
('img-p4-1', 'p4', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1200&auto=format&fit=crop', 'direct', 0, TRUE),
('img-p5-1', 'p5', 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=1200&auto=format&fit=crop', 'direct', 0, TRUE),
('img-p6-1', 'p6', 'https://images.unsplash.com/photo-1611262588024-d12430b98920?q=80&w=1200&auto=format&fit=crop', 'direct', 0, TRUE)
ON CONFLICT (id) DO NOTHING;
