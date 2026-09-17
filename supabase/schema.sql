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

-- 7. FAVORITES TABLE (Public User Favorites)
CREATE TABLE IF NOT EXISTS public.favorites (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt_id TEXT NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, prompt_id)
);

-- 8. TEAM MEMBER REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.team_member_requests (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    requested_category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    message TEXT,
    user_email TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add columns to team_member_requests if they don't exist
DO $$
BEGIN
    -- Add user_email field for easier admin identification
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'team_member_requests' AND column_name = 'user_email'
    ) THEN
        ALTER TABLE public.team_member_requests ADD COLUMN user_email TEXT;
    END IF;
    
    -- Add rejection_reason field for admin feedback
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'team_member_requests' AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE public.team_member_requests ADD COLUMN rejection_reason TEXT;
    END IF;
END $$;

-- Add content_type field to prompts for videos support
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'prompts' AND column_name = 'content_type'
    ) THEN
        ALTER TABLE public.prompts ADD COLUMN content_type TEXT DEFAULT 'prompt' CHECK (content_type IN ('prompt', 'video'));
    END IF;

    -- Add video_url field for video content
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'prompts' AND column_name = 'video_url'
    ) THEN
        ALTER TABLE public.prompts ADD COLUMN video_url TEXT;
    END IF;

    -- Add favorites_count field for easier querying
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'prompts' AND column_name = 'favorites_count'
    ) THEN
        ALTER TABLE public.prompts ADD COLUMN favorites_count INTEGER DEFAULT 0 NOT NULL;
    END IF;
END $$;

-- 7. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_prompts_slug ON public.prompts(slug);
CREATE INDEX IF NOT EXISTS idx_prompts_status ON public.prompts(status);
CREATE INDEX IF NOT EXISTS idx_prompts_category_id ON public.prompts(category_id);
CREATE INDEX IF NOT EXISTS idx_prompts_subcategory_id ON public.prompts(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_prompts_created_at ON public.prompts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompts_views ON public.prompts(views DESC);
CREATE INDEX IF NOT EXISTS idx_prompts_copies ON public.prompts(copies DESC);
CREATE INDEX IF NOT EXISTS idx_prompts_favorites_count ON public.prompts(favorites_count DESC);
CREATE INDEX IF NOT EXISTS idx_prompts_content_type ON public.prompts(content_type);
CREATE INDEX IF NOT EXISTS idx_prompts_featured ON public.prompts(featured) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_prompts_trending ON public.prompts(trending) WHERE trending = TRUE;
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON public.subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_prompt_images_prompt_id ON public.prompt_images(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_images_sort ON public.prompt_images(sort_order);
CREATE INDEX IF NOT EXISTS idx_admin_profiles_role ON public.admin_profiles(role);
CREATE INDEX IF NOT EXISTS idx_admin_profiles_category ON public.admin_profiles(assigned_category_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON public.contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_prompt_id ON public.favorites(prompt_id);
CREATE INDEX IF NOT EXISTS idx_team_requests_status ON public.team_member_requests(status);
CREATE INDEX IF NOT EXISTS idx_team_requests_user ON public.team_member_requests(user_id);

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
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_member_requests ENABLE ROW LEVEL SECURITY;

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
-- G. Favorites RLS Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.favorites;
CREATE POLICY "Users can manage their own favorites"
    ON public.favorites FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can read favorites aggregates" ON public.favorites;
CREATE POLICY "Anyone can read favorites aggregates"
    ON public.favorites FOR SELECT
    TO public
    USING (true);

-- ------------------------------------------------------------------------------
-- H. Team Member Requests RLS Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage their own requests" ON public.team_member_requests;
CREATE POLICY "Users can manage their own requests"
    ON public.team_member_requests
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can manage all requests" ON public.team_member_requests;
CREATE POLICY "Super admins can manage all requests"
    ON public.team_member_requests
    FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

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

-- Update favorites count when favorites are added/removed
CREATE OR REPLACE FUNCTION public.update_favorites_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.prompts
        SET favorites_count = favorites_count + 1
        WHERE id = NEW.prompt_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.prompts
        SET favorites_count = favorites_count - 1
        WHERE id = OLD.prompt_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- Create trigger for favorites count
DROP TRIGGER IF EXISTS favorites_count_trigger ON public.favorites;
CREATE TRIGGER favorites_count_trigger
    AFTER INSERT OR DELETE ON public.favorites
    FOR EACH ROW
    EXECUTE FUNCTION public.update_favorites_count();

-- Function to approve team member request and create admin profile
CREATE OR REPLACE FUNCTION public.approve_team_member_request(
    request_id TEXT,
    assigned_category_id TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    request_row public.team_member_requests%ROWTYPE;
BEGIN
    -- Only super admins can approve requests
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Only super admins can approve team member requests';
    END IF;

    -- Get the request details
    SELECT * INTO request_row
    FROM public.team_member_requests
    WHERE id = request_id AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found or already processed';
    END IF;

    -- Update request status
    UPDATE public.team_member_requests
    SET status = 'approved', updated_at = NOW()
    WHERE id = request_id;

    -- Create admin profile (use assigned_category_id if provided, otherwise use requested)
    INSERT INTO public.admin_profiles (id, role, assigned_category_id, display_name)
    VALUES (
        request_row.user_id,
        'category_admin',
        COALESCE(assigned_category_id, request_row.requested_category_id),
        (SELECT email FROM auth.users WHERE id = request_row.user_id)
    )
    ON CONFLICT (id) DO UPDATE SET
        role = 'category_admin',
        assigned_category_id = COALESCE(assigned_category_id, request_row.requested_category_id);
END;
$$;

-- Grant execution to public / anon and authenticated
GRANT EXECUTE ON FUNCTION public.increment_views(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_copies(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_team_member_request(TEXT, TEXT) TO authenticated;
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
ON CONFLICT (slug) DO UPDATE 
SET name = EXCLUDED.name, icon = EXCLUDED.icon;

INSERT INTO public.subcategories (id, category_id, name, slug) VALUES
('s1', 'c1', 'Ad Copy', 'ad-copy'),
('s2', 'c1', 'Email Campaigns', 'email-campaigns'),
('s3', 'c3', 'Code Review', 'code-review'),
('s4', 'c3', 'Debugging', 'debugging'),
('s5', 'c5', 'Captions', 'captions')
ON CONFLICT (id) DO NOTHING;

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
ON CONFLICT (slug) DO UPDATE 
SET title = EXCLUDED.title, prompt = EXCLUDED.prompt, status = EXCLUDED.status;

-- Also seed prompt_images for starter prompts
INSERT INTO public.prompt_images (id, prompt_id, image_url, source, sort_order, is_featured)
SELECT 'img-p1-1', id, 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=1200&auto=format&fit=crop', 'direct', 0, TRUE FROM public.prompts WHERE slug = 'high-converting-facebook-ad-copy'
UNION ALL
SELECT 'img-p1-2', id, 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop', 'direct', 1, FALSE FROM public.prompts WHERE slug = 'high-converting-facebook-ad-copy'
UNION ALL
SELECT 'img-p2-1', id, 'https://images.unsplash.com/photo-1557200134-90327ee9fafa?q=80&w=1200&auto=format&fit=crop', 'direct', 0, TRUE FROM public.prompts WHERE slug = 'cold-outreach-email-that-gets-replies'
UNION ALL
SELECT 'img-p3-1', id, 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop', 'direct', 0, TRUE FROM public.prompts WHERE slug = 'senior-level-code-review-checklist'
UNION ALL
SELECT 'img-p4-1', id, 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1200&auto=format&fit=crop', 'direct', 0, TRUE FROM public.prompts WHERE slug = 'debug-any-stack-trace'
UNION ALL
SELECT 'img-p5-1', id, 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=1200&auto=format&fit=crop', 'direct', 0, TRUE FROM public.prompts WHERE slug = 'startup-pitch-deck-narrative'
UNION ALL
SELECT 'img-p6-1', id, 'https://images.unsplash.com/photo-1611262588024-d12430b98920?q=80&w=1200&auto=format&fit=crop', 'direct', 0, TRUE FROM public.prompts WHERE slug = 'instagram-caption-generator'
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 12. MARKETPLACE EXTENSIONS - PAID PROMPTS & SELLER SYSTEM
-- ==============================================================================

-- 12A. SELLER PROFILES TABLE - Any registered public user can become a seller
CREATE TABLE IF NOT EXISTS public.seller_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    payout_details JSONB DEFAULT '{}'::JSONB, -- Store bank/mobile wallet details for payouts
    total_earnings DECIMAL(10,2) DEFAULT 0.00 NOT NULL, -- Track total PKR earnings
    stripe_earnings DECIMAL(10,2) DEFAULT 0.00 NOT NULL, -- Earnings from Stripe payments
    jazzcash_earnings DECIMAL(10,2) DEFAULT 0.00 NOT NULL, -- Earnings from JazzCash payments
    easypaisa_earnings DECIMAL(10,2) DEFAULT 0.00 NOT NULL, -- Earnings from Easypaisa payments
    is_active BOOLEAN DEFAULT TRUE NOT NULL, -- Can be disabled by admin if needed
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add marketplace-specific columns to prompts table
DO $$
BEGIN
    -- Add is_paid column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'prompts' AND column_name = 'is_paid'
    ) THEN
        ALTER TABLE public.prompts ADD COLUMN is_paid BOOLEAN DEFAULT FALSE NOT NULL;
    END IF;

    -- Add price column (store in PKR)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'prompts' AND column_name = 'price'
    ) THEN
        ALTER TABLE public.prompts ADD COLUMN price DECIMAL(10,2);
    END IF;

    -- Add seller_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'prompts' AND column_name = 'seller_id'
    ) THEN
        ALTER TABLE public.prompts ADD COLUMN seller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    -- Add sale_status column (separate from existing status column)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'prompts' AND column_name = 'sale_status'
    ) THEN
        ALTER TABLE public.prompts ADD COLUMN sale_status TEXT DEFAULT 'pending_approval' CHECK (sale_status IN ('pending_approval', 'approved', 'rejected'));
    END IF;

    -- Add purchase_count for tracking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'prompts' AND column_name = 'purchase_count'
    ) THEN
        ALTER TABLE public.prompts ADD COLUMN purchase_count INTEGER DEFAULT 0 NOT NULL;
    END IF;
END $$;

-- 12B. PURCHASES TABLE - Track all purchases and payment methods
CREATE TABLE IF NOT EXISTS public.purchases (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt_id TEXT NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('stripe', 'jazzcash', 'easypaisa')),
    gateway_transaction_id TEXT, -- Transaction ID from payment gateway
    amount DECIMAL(10,2) NOT NULL, -- Amount paid
    currency TEXT DEFAULT 'PKR' NOT NULL, -- Currency (PKR for local, USD for Stripe)
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    gateway_response JSONB DEFAULT '{}'::JSONB, -- Store full gateway response for debugging
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(buyer_id, prompt_id) -- One purchase per buyer per prompt
);

-- 12C. Performance indexes for marketplace
CREATE INDEX IF NOT EXISTS idx_prompts_is_paid ON public.prompts(is_paid) WHERE is_paid = TRUE;
CREATE INDEX IF NOT EXISTS idx_prompts_price ON public.prompts(price) WHERE price IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prompts_seller_id ON public.prompts(seller_id);
CREATE INDEX IF NOT EXISTS idx_prompts_sale_status ON public.prompts(sale_status);
CREATE INDEX IF NOT EXISTS idx_prompts_purchase_count ON public.prompts(purchase_count DESC);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_active ON public.seller_profiles(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_purchases_buyer ON public.purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_purchases_seller ON public.purchases(seller_id);
CREATE INDEX IF NOT EXISTS idx_purchases_prompt ON public.purchases(prompt_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON public.purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_payment_method ON public.purchases(payment_method);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON public.purchases(created_at DESC);

-- ==============================================================================
-- 13. HELPER FUNCTIONS FOR MARKETPLACE
-- ==============================================================================

-- Check if a user has purchased a specific prompt
CREATE OR REPLACE FUNCTION public.has_purchased_prompt(p_user_id UUID, p_prompt_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.purchases
        WHERE buyer_id = p_user_id 
        AND purchases.prompt_id = p_prompt_id 
        AND status = 'completed'
    );
END;
$$;

-- Get prompt content with purchase validation
CREATE OR REPLACE FUNCTION public.get_prompt_content(p_prompt_id TEXT)
RETURNS TABLE(
    id TEXT,
    title TEXT,
    slug TEXT,
    description TEXT,
    category_id TEXT,
    subcategory_id TEXT,
    featured_image TEXT,
    output_image TEXT,
    prompt TEXT,
    variables JSONB,
    tags TEXT[],
    author TEXT,
    views INTEGER,
    copies INTEGER,
    featured BOOLEAN,
    popular BOOLEAN,
    trending BOOLEAN,
    status TEXT,
    is_paid BOOLEAN,
    price DECIMAL,
    seller_id UUID,
    sale_status TEXT,
    purchase_count INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    can_access BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.slug,
        p.description,
        p.category_id,
        p.subcategory_id,
        p.featured_image,
        p.output_image,
        CASE 
            WHEN p.is_paid AND NOT public.has_purchased_prompt(auth.uid(), p.id) AND auth.uid() != p.seller_id
            THEN LEFT(p.prompt, 100) || '...' -- Truncate prompt if not purchased
            ELSE p.prompt
        END as prompt,
        p.variables,
        p.tags,
        p.author,
        p.views,
        p.copies,
        p.featured,
        p.popular,
        p.trending,
        p.status,
        p.is_paid,
        p.price,
        p.seller_id,
        p.sale_status,
        p.purchase_count,
        p.created_at,
        p.updated_at,
        CASE 
            WHEN NOT p.is_paid THEN TRUE -- Free prompts are always accessible
            WHEN auth.uid() = p.seller_id THEN TRUE -- Sellers can always access their own prompts
            WHEN public.has_purchased_prompt(auth.uid(), p.id) THEN TRUE -- Buyers who purchased
            ELSE FALSE
        END as can_access
    FROM public.prompts p
    WHERE p.id = p_prompt_id;
END;
$$;

-- Update purchase count when purchases are completed
CREATE OR REPLACE FUNCTION public.update_purchase_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'completed' THEN
        UPDATE public.prompts
        SET purchase_count = purchase_count + 1
        WHERE id = NEW.prompt_id;
        
        -- Update seller earnings
        UPDATE public.seller_profiles
        SET 
            total_earnings = total_earnings + NEW.amount,
            stripe_earnings = CASE WHEN NEW.payment_method = 'stripe' THEN stripe_earnings + NEW.amount ELSE stripe_earnings END,
            jazzcash_earnings = CASE WHEN NEW.payment_method = 'jazzcash' THEN jazzcash_earnings + NEW.amount ELSE jazzcash_earnings END,
            easypaisa_earnings = CASE WHEN NEW.payment_method = 'easypaisa' THEN easypaisa_earnings + NEW.amount ELSE easypaisa_earnings END,
            updated_at = NOW()
        WHERE id = NEW.seller_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
        UPDATE public.prompts
        SET purchase_count = purchase_count + 1
        WHERE id = NEW.prompt_id;
        
        -- Update seller earnings
        UPDATE public.seller_profiles
        SET 
            total_earnings = total_earnings + NEW.amount,
            stripe_earnings = CASE WHEN NEW.payment_method = 'stripe' THEN stripe_earnings + NEW.amount ELSE stripe_earnings END,
            jazzcash_earnings = CASE WHEN NEW.payment_method = 'jazzcash' THEN jazzcash_earnings + NEW.amount ELSE jazzcash_earnings END,
            easypaisa_earnings = CASE WHEN NEW.payment_method = 'easypaisa' THEN easypaisa_earnings + NEW.amount ELSE easypaisa_earnings END,
            updated_at = NOW()
        WHERE id = NEW.seller_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status != 'completed' THEN
        -- Handle refunds/cancellations
        UPDATE public.prompts
        SET purchase_count = GREATEST(purchase_count - 1, 0)
        WHERE id = NEW.prompt_id;
        
        -- Update seller earnings (subtract)
        UPDATE public.seller_profiles
        SET 
            total_earnings = GREATEST(total_earnings - OLD.amount, 0),
            stripe_earnings = CASE WHEN OLD.payment_method = 'stripe' THEN GREATEST(stripe_earnings - OLD.amount, 0) ELSE stripe_earnings END,
            jazzcash_earnings = CASE WHEN OLD.payment_method = 'jazzcash' THEN GREATEST(jazzcash_earnings - OLD.amount, 0) ELSE jazzcash_earnings END,
            easypaisa_earnings = CASE WHEN OLD.payment_method = 'easypaisa' THEN GREATEST(easypaisa_earnings - OLD.amount, 0) ELSE easypaisa_earnings END,
            updated_at = NOW()
        WHERE id = OLD.seller_id;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Create trigger for purchase count updates
DROP TRIGGER IF EXISTS purchase_count_trigger ON public.purchases;
CREATE TRIGGER purchase_count_trigger
    AFTER INSERT OR UPDATE ON public.purchases
    FOR EACH ROW
    EXECUTE FUNCTION public.update_purchase_count();

-- ==============================================================================
-- 14. MARKETPLACE RLS POLICIES
-- ==============================================================================

ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- A. Seller Profiles RLS Policies
-- ------------------------------------------------------------------------------

-- Users can view and manage their own seller profile
DROP POLICY IF EXISTS "Users can manage their own seller profile" ON public.seller_profiles;
CREATE POLICY "Users can manage their own seller profile"
    ON public.seller_profiles FOR ALL
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Public can view basic seller info (for seller attribution)
DROP POLICY IF EXISTS "Public can view seller profiles" ON public.seller_profiles;
CREATE POLICY "Public can view seller profiles"
    ON public.seller_profiles FOR SELECT
    USING (is_active = TRUE);

-- Super admins can manage all seller profiles
DROP POLICY IF EXISTS "Super admins can manage seller profiles" ON public.seller_profiles;
CREATE POLICY "Super admins can manage seller profiles"
    ON public.seller_profiles FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- B. Purchases RLS Policies
-- ------------------------------------------------------------------------------

-- Users can view their own purchases (as buyer)
DROP POLICY IF EXISTS "Users can view their own purchases" ON public.purchases;
CREATE POLICY "Users can view their own purchases"
    ON public.purchases FOR SELECT
    TO authenticated
    USING (auth.uid() = buyer_id);

-- Sellers can view purchases of their prompts
DROP POLICY IF EXISTS "Sellers can view their sales" ON public.purchases;
CREATE POLICY "Sellers can view their sales"
    ON public.purchases FOR SELECT
    TO authenticated
    USING (auth.uid() = seller_id);

-- Super admins can view all purchases
DROP POLICY IF EXISTS "Super admins can view all purchases" ON public.purchases;
CREATE POLICY "Super admins can view all purchases"
    ON public.purchases FOR SELECT
    TO authenticated
    USING (public.is_super_admin());

-- Only system (via Edge Functions) can insert/update purchases
DROP POLICY IF EXISTS "System can manage purchases" ON public.purchases;
CREATE POLICY "System can manage purchases"
    ON public.purchases FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- C. Updated Prompts RLS Policies for Marketplace
-- ------------------------------------------------------------------------------

-- Update existing policies to handle paid prompts and seller permissions
DROP POLICY IF EXISTS "Public can view published prompts" ON public.prompts;
CREATE POLICY "Public can view published prompts"
    ON public.prompts FOR SELECT
    USING (
        status = 'published' 
        AND (NOT is_paid OR (is_paid AND sale_status = 'approved'))
    );

-- Sellers can insert their own paid prompts (but cannot self-approve)
DROP POLICY IF EXISTS "Sellers can insert their own prompts" ON public.prompts;
CREATE POLICY "Sellers can insert their own prompts"
    ON public.prompts FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = seller_id 
        AND status IN ('pending', 'draft')
        AND (NOT is_paid OR (is_paid AND sale_status = 'pending_approval'))
        AND EXISTS (SELECT 1 FROM public.seller_profiles WHERE id = auth.uid() AND is_active = TRUE)
    );

-- Sellers can update their own prompts (but cannot self-approve status or sale_status)
DROP POLICY IF EXISTS "Sellers can update their own prompts" ON public.prompts;
CREATE POLICY "Sellers can update their own prompts"
    ON public.prompts FOR UPDATE
    TO authenticated
    USING (auth.uid() = seller_id)
    WITH CHECK (
        auth.uid() = seller_id
        AND status IN ('pending', 'draft')
        AND (NOT is_paid OR (is_paid AND sale_status = 'pending_approval'))
    );

-- Sellers can delete their own unpublished prompts
DROP POLICY IF EXISTS "Sellers can delete their own prompts" ON public.prompts;
CREATE POLICY "Sellers can delete their own prompts"
    ON public.prompts FOR DELETE
    TO authenticated
    USING (
        auth.uid() = seller_id
        AND status IN ('pending', 'draft', 'rejected')
        AND (NOT is_paid OR sale_status IN ('pending_approval', 'rejected'))
    );

-- Grant execution permissions for new functions
GRANT EXECUTE ON FUNCTION public.has_purchased_prompt(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_prompt_content(TEXT) TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

