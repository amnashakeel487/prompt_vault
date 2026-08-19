# ⚡ PromptVault — Ready-to-Run AI Prompt Library & Dynamic Generator

<div align="center">

[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg?style=for-the-badge)](LICENSE)

<p align="center">
  <b>A modern, full-stack prompt engineering library and variable injection engine built for creators, marketers, and developers.</b>
</p>

[**🌐 Explore Live Application**](https://prompt-vault.vercel.app) · [**✨ Report an Issue**](https://github.com/amnashakeel487/prompt_vault/issues) · [**💬 Contact Team**](https://prompt-vault.vercel.app/contact)

</div>

---

## 📖 Overview

**PromptVault** is a production-grade AI prompt library web application that solves the friction of generic AI prompting. Instead of copy-pasting raw text and manually finding placeholders, PromptVault scans prompt bodies in real-time, extracts all `{{Variable}}` tokens, automatically renders dynamic interactive form fields, and swaps in user values instantly with one-click copy and live token count estimation.

Powered by a **Supabase PostgreSQL** backend, **Vercel Serverless Functions**, and a **Tailwind CSS + Framer Motion** dark glassmorphic design system, PromptVault is 100% responsive and production-ready.

---

## ✨ Key Features

- ⚡ **Dynamic Variable Engine**: Automatically detects `{{Variable}}` tags in prompt text and dynamically constructs form inputs without manual coding.
- 🎯 **Real-time Live Preview**: View prompt substitutions in real-time with syntax highlighting and token count estimation.
- 🎨 **Dark Glassmorphism Interface**: Styled with custom violet/cyan glow aesthetics, responsive typography, and an interactive typewriter terminal.
- 🗄️ **Supabase Cloud Backend**: Connected to real PostgreSQL tables (`prompts`, `categories`, `subcategories`, `contact_messages`) with secure Row Level Security (RLS).
- 📊 **Real-time Metric Tracking**: Atomic database RPC functions (`increment_views`, `increment_copies`) for live impression and copy tracking.
- 🔐 **Comprehensive Admin Dashboard**:
  - **Prompts Library**: Full CRUD operations with rich metadata, tag taxonomies, and live/draft toggles.
  - **Taxonomy Manager**: Manage categories, auto-generated slugs, and subcategory tags.
  - **Contact Inbox**: Read, reply via email, mark as read, and delete visitor inquiries.
  - **Vault Analytics**: View conversion rates, top performing prompts, and impressions.
  - **Profile & Security**: Update admin credentials and manage sessions.
- ☁️ **Vercel Serverless Functions**:
  - `/api/upload-image`: Server-side GitHub REST API integration for secure image uploads without exposing client tokens.
  - `/api/sitemap`: Dynamic XML sitemap generated on-the-fly from live Supabase records for search engine indexing.
- 📱 **100% Mobile Responsive**: Audited and optimized across 375px (mobile), 768px (tablet), and desktop displays with 44px+ accessible touch targets.

---

## 🛠️ Tech Stack

### **Frontend**
- **Core**: [React 18](https://react.js.org/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + `@tailwindcss/typography`
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Routing**: [React Router v6](https://reactrouter.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Forms**: [React Hook Form](https://react-hook-form.com/)
- **Markdown**: [React Markdown](https://github.com/remarkjs/react-markdown)

### **Backend & Storage**
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL with RLS & Stored Procedures)
- **Serverless API**: [Vercel Serverless Functions](https://vercel.com/docs/functions) (Node.js)
- **Image Storage**: GitHub Content Storage via Authenticated REST API

---

## 📂 Project Structure

```text
prompt_vault/
├── api/                          # Vercel Serverless Functions
│   ├── sitemap.js                # Dynamic XML sitemap generator
│   └── upload-image.js           # Secure server-side GitHub image upload endpoint
├── public/                       # Static public assets & robots.txt
├── src/
│   ├── components/               # Reusable UI components
│   │   ├── CategoryCard.jsx      # Interactive category card
│   │   ├── CopyButton.jsx        # One-click copy with visual feedback
│   │   ├── EmptyState.jsx        # Empty state display component
│   │   ├── FAQ.jsx               # Expandable accordion FAQ
│   │   ├── Footer.jsx            # Multi-column footer with credits
│   │   ├── HeroTerminal.jsx      # Animated interactive typewriter hero terminal
│   │   ├── HowItWorks.jsx        # 3-step explainer section
│   │   ├── Navbar.jsx            # Smooth-scroll sticky navbar with mobile drawer
│   │   ├── PromptCard.jsx        # Prompt card with views/copies stats
│   │   ├── ProtectedRoute.jsx    # Client-side admin auth guard
│   │   ├── SEO.jsx               # Dynamic OpenGraph and Twitter meta tags
│   │   ├── Skeletons.jsx         # Loading skeleton placeholders
│   │   ├── TrustedBy.jsx         # Client trust bar
│   │   └── VariableForm.jsx      # Dynamic form generator for prompt variables
│   ├── context/
│   │   └── AuthContext.jsx       # Supabase authentication provider
│   ├── data/
│   │   └── mockData.js           # Fallback mock dataset
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAuth.js            # Auth context hook
│   │   ├── useCategories.js      # Categories fetch hook
│   │   ├── usePromptBySlug.js    # Single prompt fetch hook
│   │   ├── usePrompts.js         # Filtered prompts & pagination hook
│   │   └── useSubcategories.js   # Subcategories fetch hook
│   ├── pages/                    # Application route views
│   │   ├── AdminDashboard.jsx    # Full-featured admin management console
│   │   ├── AdminLogin.jsx        # Secure admin login view
│   │   ├── Categories.jsx        # All categories index
│   │   ├── CategoryDetail.jsx    # Category detail & subcategory filter view
│   │   ├── Contact.jsx           # Visitor contact and prompt request form
│   │   ├── Home.jsx              # Landing page
│   │   ├── Latest.jsx            # Chronological prompts with infinite load
│   │   ├── NotFound.jsx          # 404 page
│   │   ├── Popular.jsx           # Top-viewed prompts ranking
│   │   ├── Privacy.jsx           # Privacy policy
│   │   ├── SearchResults.jsx     # Live debounced prompt search
│   │   └── Terms.jsx             # Terms of service
│   ├── services/
│   │   ├── githubUpload.js       # Client caller for image upload API
│   │   ├── promptService.js      # Supabase CRUD service layer
│   │   └── supabaseClient.js     # Supabase client singleton
│   ├── utils/
│   │   └── variableParser.js     # Variable tokenizer, parser, and token estimator
│   ├── App.jsx                   # Router and layout configuration
│   ├── index.css                 # Global Tailwind layers & custom utilities
│   └── main.jsx                  # React DOM root entrypoint
├── supabase/
│   └── schema.sql                # Complete PostgreSQL schema, RLS, and RPC functions
├── .env.example                  # Environment variable configuration template
├── tailwind.config.js            # Design system tokens, keyframes, and themes
├── vercel.json                   # Vercel SPA routing and serverless rewrites
└── vite.config.js                # Vite build configuration
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0 or higher
- **npm** or **yarn** / **pnpm**
- A free [Supabase](https://supabase.com/) account
- A free [Vercel](https://vercel.com/) account

### 2. Clone the Repository
```bash
git clone https://github.com/amnashakeel487/prompt_vault.git
cd prompt_vault
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Copy the `.env.example` template to `.env`:
```bash
cp .env.example .env
```

Fill in your credentials in `.env`:
```env
# Client-side (Vite)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_SITE_URL=http://localhost:5173

# Server-side (Vercel Serverless Functions)
GITHUB_TOKEN=github_pat_your_personal_access_token
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-image-repo-name
GITHUB_BRANCH=main
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SITE_URL=http://localhost:5173
```

### 5. Set Up the Supabase Database
1. Go to your **[Supabase Dashboard](https://app.supabase.com)** → **SQL Editor**.
2. Open [`supabase/schema.sql`](supabase/schema.sql) in this repository.
3. Copy and run the SQL code to create:
   - `categories`, `subcategories`, `prompts`, and `contact_messages` tables
   - Row Level Security (RLS) policies
   - `increment_views` and `increment_copies` stored functions
   - Initial starter categories and sample prompts

### 6. Run Local Development Server
```bash
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## ☁️ Deployment on Vercel

1. Push your code to your GitHub repository.
2. Go to **[Vercel](https://vercel.com)** → **Add New Project** → Import `prompt_vault`.
3. Confirm Build Settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variables in Vercel (**Settings → Environment Variables**):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SITE_URL`
   - `GITHUB_TOKEN` *(server-side)*
   - `GITHUB_OWNER` *(server-side)*
   - `GITHUB_REPO` *(server-side)*
   - `GITHUB_BRANCH` *(server-side)*
   - `SUPABASE_URL` *(server-side)*
   - `SUPABASE_ANON_KEY` *(server-side)*
   - `SITE_URL` *(server-side)*
5. Click **Deploy**.
6. In **Supabase Dashboard → Authentication → URL Configuration**, add your Vercel domain as the **Site URL** and **Redirect URL** (e.g. `https://prompt-vault.vercel.app/**`).

---

## 🔒 Security Architecture

- **Row Level Security (RLS)**: Public visitors can only view published prompts and insert contact messages. All administrative operations (create, update, delete, view contact messages) strictly require an authenticated Supabase session.
- **Serverless Secrets**: Sensitive tokens such as `GITHUB_TOKEN` are kept strictly server-side in Vercel Serverless Functions (`/api/upload-image.js`) and never exposed in client JavaScript bundles.
- **JWT Verification**: Every image upload request validates the caller's Supabase JWT authorization header before dispatching requests to GitHub.

---

## 👨‍💻 Authors & Credits

- **Developer**: **[Amna Shakeel](https://www.linkedin.com/in/amna-shakeel21)**
- **Organization**: **[WeConnect Innovations](https://www.linkedin.com/in/abdullahwale)**

---

## 📄 License

This project is licensed under the **MIT License** — feel free to use, modify, and distribute with attribution.
