// Placeholder data so the UI is fully browsable before Supabase is connected.
// Shape mirrors the planned `categories`, `subcategories`, and `prompts` tables.

export const categories = [
  { id: 'c1', name: 'Marketing', slug: 'marketing', icon: 'Megaphone', count: 18 },
  { id: 'c2', name: 'Copywriting', slug: 'copywriting', icon: 'PenLine', count: 24 },
  { id: 'c3', name: 'Coding', slug: 'coding', icon: 'Code2', count: 31 },
  { id: 'c4', name: 'Business', slug: 'business', icon: 'Briefcase', count: 15 },
  { id: 'c5', name: 'Social Media', slug: 'social-media', icon: 'Share2', count: 22 },
  { id: 'c6', name: 'Design', slug: 'design', icon: 'Palette', count: 12 },
]

export const subcategories = [
  { id: 's1', categoryId: 'c1', name: 'Ad Copy', slug: 'ad-copy' },
  { id: 's2', categoryId: 'c1', name: 'Email Campaigns', slug: 'email-campaigns' },
  { id: 's3', categoryId: 'c3', name: 'Code Review', slug: 'code-review' },
  { id: 's4', categoryId: 'c3', name: 'Debugging', slug: 'debugging' },
  { id: 's5', categoryId: 'c5', name: 'Captions', slug: 'captions' },
]

export const prompts = [
  {
    id: 'p1',
    title: 'High-Converting Facebook Ad Copy',
    slug: 'high-converting-facebook-ad-copy',
    categoryId: 'c1',
    subcategoryId: 's1',
    description:
      'Generate a scroll-stopping Facebook ad tailored to your business, audience, and offer — built around proven direct-response structure.',
    featuredImage: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?q=80&w=1200&auto=format&fit=crop',
    outputImage: '',
    prompt:
      'Create a Facebook Ad for {{BusinessName}} targeting {{TargetAudience}} in {{City}}.\n\nTone: {{Tone}}\nOffer: {{Offer}}\nPlatform: {{Platform}}\nGoal: {{Goal}}\n\nWrite a scroll-stopping hook, three benefit-driven bullet points, and a clear call to action.',
    tags: ['ads', 'facebook', 'marketing'],
    author: 'Admin',
    createdAt: '2026-06-02',
    updatedAt: '2026-07-14',
    views: 4821,
    copies: 1290,
    featured: true,
    popular: true,
    trending: true,
    status: 'published',
    seoTitle: 'Facebook Ad Copy Prompt',
    seoDescription: 'Generate high-converting Facebook ad copy in seconds.',
  },
  {
    id: 'p2',
    title: 'Cold Outreach Email That Gets Replies',
    slug: 'cold-outreach-email-that-gets-replies',
    categoryId: 'c1',
    subcategoryId: 's2',
    description: 'A short, personalized cold email framework designed to earn a reply, not a delete.',
    featuredImage: 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?q=80&w=1200&auto=format&fit=crop',
    outputImage: '',
    prompt:
      'Write a cold outreach email from {{SenderName}} at {{BusinessName}} to {{TargetAudience}}.\n\nGoal: {{Goal}}\nTone: {{Tone}}\nLanguage: {{Language}}\n\nKeep it under 120 words, one clear ask, no fluff.',
    tags: ['email', 'outreach', 'sales'],
    author: 'Admin',
    createdAt: '2026-05-18',
    updatedAt: '2026-06-30',
    views: 3110,
    copies: 902,
    featured: false,
    popular: true,
    trending: false,
    status: 'published',
    seoTitle: 'Cold Email Prompt',
    seoDescription: 'Write cold outreach emails that get replies.',
  },
  {
    id: 'p3',
    title: 'Senior-Level Code Review Checklist',
    slug: 'senior-level-code-review-checklist',
    categoryId: 'c3',
    subcategoryId: 's3',
    description: 'Feed in a diff or file and get a structured, senior-engineer-style review.',
    featuredImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop',
    outputImage: '',
    prompt:
      'Review the following {{Language}} code for {{Platform}}.\n\nFocus areas: {{Goal}}\n\nFlag bugs, security issues, and readability problems. Suggest concrete fixes, not just criticism.\n\nCode:\n```\n{{Code}}\n```',
    tags: ['coding', 'review', 'engineering'],
    author: 'Admin',
    createdAt: '2026-04-22',
    updatedAt: '2026-07-01',
    views: 6720,
    copies: 2140,
    featured: true,
    popular: true,
    trending: true,
    status: 'published',
    seoTitle: 'Code Review Prompt',
    seoDescription: 'Get a senior-level code review from a single prompt.',
  },
  {
    id: 'p4',
    title: 'Instagram Caption Generator',
    slug: 'instagram-caption-generator',
    categoryId: 'c5',
    subcategoryId: 's5',
    description: 'On-brand Instagram captions with a hook, story beat, and CTA.',
    featuredImage: 'https://images.unsplash.com/photo-1611262588024-d12430b98920?q=80&w=1200&auto=format&fit=crop',
    outputImage: '',
    prompt:
      'Write an Instagram caption for {{BusinessName}} about {{Offer}}.\n\nTone: {{Tone}}\nTarget audience: {{TargetAudience}}\n\nInclude a hook line, a short story beat, and a CTA. Suggest 5 relevant hashtags.',
    tags: ['instagram', 'social', 'captions'],
    author: 'Admin',
    createdAt: '2026-07-01',
    updatedAt: '2026-07-10',
    views: 2210,
    copies: 610,
    featured: false,
    popular: false,
    trending: true,
    status: 'published',
    seoTitle: 'Instagram Caption Prompt',
    seoDescription: 'Generate on-brand Instagram captions instantly.',
  },
  {
    id: 'p5',
    title: 'Startup Pitch Deck Narrative',
    slug: 'startup-pitch-deck-narrative',
    categoryId: 'c4',
    subcategoryId: null,
    description: 'Turn a rough idea into a structured, investor-ready pitch narrative.',
    featuredImage: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1200&auto=format&fit=crop',
    outputImage: '',
    prompt:
      'Build a pitch narrative for {{BusinessName}}, a company solving {{Goal}} for {{TargetAudience}} in {{Country}}.\n\nInclude: problem, solution, market size, business model, and ask.',
    tags: ['pitch', 'startup', 'business'],
    author: 'Admin',
    createdAt: '2026-03-11',
    updatedAt: '2026-05-02',
    views: 1890,
    copies: 402,
    featured: false,
    popular: false,
    trending: false,
    status: 'published',
    seoTitle: 'Pitch Deck Prompt',
    seoDescription: 'Generate an investor-ready pitch narrative.',
  },
  {
    id: 'p6',
    title: 'Debug Any Stack Trace',
    slug: 'debug-any-stack-trace',
    categoryId: 'c3',
    subcategoryId: 's4',
    description: 'Paste an error and get a root-cause explanation plus a fix.',
    featuredImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1200&auto=format&fit=crop',
    outputImage: '',
    prompt:
      'Explain and fix the following {{Language}} error on {{Platform}}:\n\n{{Code}}\n\nGive the root cause in one sentence, then a corrected code block.',
    tags: ['debugging', 'coding'],
    author: 'Admin',
    createdAt: '2026-06-20',
    updatedAt: '2026-06-25',
    views: 5430,
    copies: 1780,
    featured: false,
    popular: true,
    trending: false,
    status: 'published',
    seoTitle: 'Debugging Prompt',
    seoDescription: 'Debug any stack trace with a single prompt.',
  },
]

export function getCategoryBySlug(slug) {
  return categories.find((c) => c.slug === slug)
}
export function getSubcategoriesForCategory(categoryId) {
  return subcategories.filter((s) => s.categoryId === categoryId)
}
export function getPromptBySlug(slug) {
  return prompts.find((p) => p.slug === slug)
}
export function getPromptsForCategory(categoryId) {
  return prompts.filter((p) => p.categoryId === categoryId)
}
