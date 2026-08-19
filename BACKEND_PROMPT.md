You are a Senior Full Stack Software Engineer. I already have a complete, styled React (Vite + Tailwind +
Framer Motion) frontend for a Prompt Library web app called PromptVault. It is 100% wired to mock data.
Your job is to make it fully production-ready by connecting a real backend WITHOUT changing the existing
visual design, layout, components, class names, or animations.

Attached/provided: the full `prompt-vault/` project folder (React frontend).

=========================
DO NOT CHANGE
=========================
- Any Tailwind tokens in tailwind.config.js (colors, fonts, shadows, keyframes)
- Any component in src/components/ visually — only add logic/props, keep markup and classNames
- Page layout/structure in src/pages/
- The route structure in src/App.jsx

=========================
WHAT TO BUILD
=========================

1. SUPABASE SETUP
- Create the SQL schema for three tables: categories, subcategories, prompts, exactly matching the
  fields already used in src/data/mockData.js (id, title, slug, description, category_id,
  subcategory_id, featured_image, output_image, prompt, variables, tags, views, copies, featured,
  popular, trending, status, seo_title, seo_description, created_at, updated_at for prompts; id, name,
  slug, icon, created_at for categories; id, category_id, name, slug for subcategories).
- Enable Row Level Security on all tables.
  - Public (anon) role: SELECT only where status = 'published'.
  - Authenticated admin role: full CRUD.
- Create a Supabase client in src/services/supabaseClient.js using
  import.meta.env.VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example).
- Replace every import from src/data/mockData.js across src/pages/*.jsx with real Supabase queries
  (via new hooks in src/hooks/, e.g. usePrompts, useCategories, usePromptBySlug), preserving loading
  and empty states using the existing Skeletons.jsx and EmptyState.jsx components.
- Implement view count increments (on prompt detail page load) and copy count increments (on the
  existing CopyButton's onCopied callback) as Supabase RPC calls or updates.

2. SUPABASE AUTH (ADMIN ONLY)
- Wire src/pages/AdminLogin.jsx to supabase.auth.signInWithPassword(). No signup page — only a
  manually created admin user in the Supabase dashboard.
- Add an auth context/hook (src/hooks/useAuth.js) and a protected route wrapper so
  /admin/dashboard redirects to /admin/login when there is no active session.
- Wire the sign-out action and session persistence.

3. GITHUB IMAGE UPLOAD SERVICE (NOT Supabase Storage)
- Create src/services/githubUpload.js that uploads an image file to a GitHub repository using the
  GitHub REST API (PUT /repos/{owner}/{repo}/contents/{path}), base64-encoding the file, saving it
  under /assets/prompts/, and returning the resulting raw GitHub URL
  (https://raw.githubusercontent.com/{owner}/{repo}/{branch}/assets/prompts/{filename}).
- Use import.meta.env.VITE_GITHUB_OWNER, VITE_GITHUB_REPO, VITE_GITHUB_BRANCH, VITE_GITHUB_TOKEN.
- Wire the two "Upload to GitHub repo" dropzones in src/pages/AdminDashboard.jsx's Add Prompt form to
  this service, and store only the returned URL string in the prompts.featured_image /
  prompts.output_image columns in Supabase. Never upload binary images to Supabase.

4. ADD PROMPT / EDIT PROMPT / DELETE / PUBLISH FLOW
- Make the "Add Prompt" form in AdminDashboard.jsx fully functional: on submit, upload any selected
  images via githubUpload.js, then insert a row into the prompts table via Supabase.
- Auto-detect {{Variables}} from the prompt body textarea using the existing
  src/utils/variableParser.js (already built) and store them in the `variables` column as a JSON array.
- Add edit (pre-filled form) and delete (with confirmation) actions to the recent prompts table, and a
  Publish/Unpublish toggle that updates the `status` column.

5. SEO
- Replace src/components/SEO.jsx with a version that also injects OpenGraph/Twitter meta tags and
  JSON-LD structured data (Article/CreativeWork schema) per prompt.
- Generate robots.txt and a dynamic sitemap.xml (list all published prompt slugs + static routes) as a
  Vercel serverless function or a build-time script.
- Add canonical URLs on every page (already scaffolded in SEO.jsx — just populate with the real domain).

6. PERFORMANCE
- Add pagination or infinite scroll to Categories/Latest/Popular/Search results (Supabase range queries).
- Lazy-load route chunks with React.lazy + Suspense.
- Confirm images use loading="lazy" (already present on PromptCard) and add width/height or aspect-ratio
  to prevent layout shift.

7. DEPLOYMENT
- Add a vercel.json with SPA rewrites for React Router.
- Document required environment variables in Vercel project settings (mirror .env.example).
- Provide the exact Vercel deployment steps in the README (connect repo, set env vars, deploy).

=========================
CONSTRAINTS
=========================
- No placeholders, no TODO stubs, no pseudocode — every function must actually work end-to-end.
- Keep all existing file paths and component names unless a task above explicitly requires a new file.
- Match the existing code style (functional components, Tailwind utility classes, no CSS-in-JS).
- Deliver: updated project source, Supabase SQL migration file(s), README with setup + deployment steps.
