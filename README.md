# PromptVault

A production-ready, full-stack AI Prompt Library built with React (Vite + Tailwind CSS + Framer Motion), powered by Supabase (PostgreSQL, Row Level Security, Admin Auth, and RPC stored procedures) and secured serverless GitHub image uploads.

---

## Features

- **Production-Ready Backend**: Powered by Supabase for categories, subcategories, and prompt storage.
- **Row Level Security (RLS)**: Public read access for published prompts; full authenticated CRUD for admins.
- **Atomic Counters**: PostgreSQL RPC stored procedures for incrementing views and copies reliably.
- **Admin Dashboard & Auth**: Full prompt lifecycle management (Create, Read, Update, Delete, Publish/Draft status toggle) protected by Supabase Auth and route guards.
- **Secure Image Uploads**: Serverless Vercel function (`api/upload-image.js`) that uploads prompt images to a GitHub repository using a server-side `GITHUB_TOKEN` without exposing credentials to the client.
- **Dynamic Variable Detection**: Automatically parses `{{VariableName}}` placeholders from prompt text and builds interactive fill-in forms.
- **SEO & Social Sharing**: Complete OpenGraph, Twitter Cards, canonical tags, JSON-LD Schema (`TechArticle` / `WebSite`), and a dynamic `sitemap.xml` serverless endpoint.
- **High Performance**: Lazy-loaded routes with `React.lazy` + `Suspense`, image aspect ratios to eliminate CLS, and paginated range queries.

---

## 1. Supabase Database & Auth Setup

### Step 1: Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your **Project URL** and **anon public key** under **Project Settings → API**.

### Step 2: Run SQL Schema & Seed Data
1. In the Supabase Dashboard, open the **SQL Editor**.
2. Copy and paste the contents of [`supabase/schema.sql`](./supabase/schema.sql).
3. Click **Run**.
   - This creates the `categories`, `subcategories`, and `prompts` tables.
   - Sets up Row Level Security (RLS) policies.
   - Creates the `increment_views` and `increment_copies` RPC functions.
   - Adds performance indexes.
   - Inserts initial seed categories and prompts.

### Step 3: Create an Admin User
1. In the Supabase Dashboard, go to **Authentication → Users**.
2. Click **Add User → Create user**.
3. Enter your admin email and a secure password, and toggle **Auto Confirm User?** on.
4. Use these credentials to sign in at `/admin/login`.

---

## 2. GitHub Image Repository & Token Setup

Images uploaded through the admin dashboard are stored directly in a GitHub repository as raw assets and served via GitHub CDN.

1. **Create or select a GitHub repository** (e.g., `my-username/prompt-vault-assets` or the current repository).
2. **Generate a GitHub Personal Access Token**:
   - Go to [GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens).
   - Click **Generate new token (classic)**.
   - Note: Give it a description like `PromptVault Asset Uploader` and select the **`repo`** scope (or Fine-grained token with `Contents: Read and write`).
   - Copy the generated token (`ghp_...` or `github_pat_...`).

---

## 3. Environment Variables Setup

Create a `.env` file in the project root based on `.env.example`:

```bash
# Public Client (Vite)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_SITE_URL=http://localhost:5173

# Serverless Functions (local development with Vercel CLI)
GITHUB_TOKEN=github_pat_your_token
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-image-repo
GITHUB_BRANCH=main
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SITE_URL=http://localhost:5173
```

---

## 4. Local Development

### Option A: Standard Vite Dev Server
```bash
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173).

### Option B: Local Vercel Serverless Dev (Tests API endpoints locally)
```bash
npm install -g vercel
vercel dev
```

---

## 5. Deployment to Vercel

### Step 1: Push Code to GitHub
Push your repository to GitHub.

### Step 2: Import Project into Vercel
1. Go to [vercel.com](https://vercel.com) and click **Add New → Project**.
2. Import your GitHub repository.
3. Framework Preset: **Vite** (detected automatically).

### Step 3: Add Environment Variables in Vercel
Under **Project Settings → Environment Variables**, add:

| Name | Value | Target |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `your-supabase-anon-key` | Production, Preview, Development |
| `VITE_SITE_URL` | `https://your-custom-domain.com` (or Vercel URL) | Production, Preview |
| `GITHUB_TOKEN` | `ghp_...` / `github_pat_...` *(Secret)* | Production, Preview, Development |
| `GITHUB_OWNER` | `your-github-username` | Production, Preview, Development |
| `GITHUB_REPO` | `your-image-repo` | Production, Preview, Development |
| `GITHUB_BRANCH` | `main` | Production, Preview, Development |
| `SUPABASE_URL` | `https://your-project.supabase.co` | Production, Preview, Development |
| `SUPABASE_ANON_KEY` | `your-supabase-anon-key` | Production, Preview, Development |
| `SITE_URL` | `https://your-custom-domain.com` | Production, Preview |

### Step 4: Deploy
Click **Deploy**. Your app is live with full SPA routing, dynamic sitemaps, authenticated admin capabilities, and secure serverless image uploads!

---

## Project Structure

```
prompt-vault/
├── api/
│   ├── sitemap.js          # Dynamic XML Sitemap serverless function
│   └── upload-image.js     # Secure GitHub image uploader serverless function
├── public/
│   └── robots.txt          # SEO robots.txt with sitemap reference
├── src/
│   ├── components/         # Reusable UI components (PromptCard, CategoryCard, SEO, etc.)
│   ├── context/
│   │   └── AuthContext.jsx # Admin session context and listener
│   ├── hooks/              # Custom hooks (usePrompts, useCategories, useAuth, etc.)
│   ├── pages/              # App routes (Home, Categories, Details, AdminDashboard, etc.)
│   ├── services/
│   │   ├── githubUpload.js   # Client service for image upload
│   │   ├── promptService.js  # Supabase CRUD and counter operations
│   │   └── supabaseClient.js # Initialized Supabase client
│   └── utils/
│       └── variableParser.js # {{Variable}} extraction & template engine
├── supabase/
│   └── schema.sql          # Complete DB migration, RLS policies, RPCs, seed data
├── tailwind.config.js
├── vercel.json             # SPA rewrites & sitemap routing
└── package.json
```
