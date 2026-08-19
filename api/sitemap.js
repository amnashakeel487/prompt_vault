import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
    const siteUrl = process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://promptvault.app'

    let prompts = []
    let categories = []

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      const [promptsRes, categoriesRes] = await Promise.all([
        supabase
          .from('prompts')
          .select('slug, updated_at, created_at')
          .eq('status', 'published'),
        supabase.from('categories').select('slug, created_at'),
      ])

      prompts = promptsRes.data || []
      categories = categoriesRes.data || []
    }

    const staticRoutes = [
      { path: '', changefreq: 'daily', priority: '1.0' },
      { path: '/categories', changefreq: 'weekly', priority: '0.8' },
      { path: '/latest', changefreq: 'daily', priority: '0.9' },
      { path: '/popular', changefreq: 'daily', priority: '0.9' },
      { path: '/search', changefreq: 'monthly', priority: '0.5' },
      { path: '/privacy', changefreq: 'monthly', priority: '0.3' },
      { path: '/terms', changefreq: 'monthly', priority: '0.3' },
      { path: '/contact', changefreq: 'monthly', priority: '0.4' },
    ]

    const currentDate = new Date().toISOString().split('T')[0]

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`
    sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`

    // Add static routes
    for (const route of staticRoutes) {
      sitemap += `  <url>\n`
      sitemap += `    <loc>${siteUrl}${route.path}</loc>\n`
      sitemap += `    <lastmod>${currentDate}</lastmod>\n`
      sitemap += `    <changefreq>${route.changefreq}</changefreq>\n`
      sitemap += `    <priority>${route.priority}</priority>\n`
      sitemap += `  </url>\n`
    }

    // Add category routes
    for (const cat of categories) {
      const lastMod = cat.created_at ? new Date(cat.created_at).toISOString().split('T')[0] : currentDate
      sitemap += `  <url>\n`
      sitemap += `    <loc>${siteUrl}/category/${encodeURIComponent(cat.slug)}</loc>\n`
      sitemap += `    <lastmod>${lastMod}</lastmod>\n`
      sitemap += `    <changefreq>weekly</changefreq>\n`
      sitemap += `    <priority>0.7</priority>\n`
      sitemap += `  </url>\n`
    }

    // Add prompt routes
    for (const p of prompts) {
      const lastMod = p.updated_at
        ? new Date(p.updated_at).toISOString().split('T')[0]
        : p.created_at
        ? new Date(p.created_at).toISOString().split('T')[0]
        : currentDate
      sitemap += `  <url>\n`
      sitemap += `    <loc>${siteUrl}/prompt/${encodeURIComponent(p.slug)}</loc>\n`
      sitemap += `    <lastmod>${lastMod}</lastmod>\n`
      sitemap += `    <changefreq>weekly</changefreq>\n`
      sitemap += `    <priority>0.8</priority>\n`
      sitemap += `  </url>\n`
    }

    sitemap += `</urlset>`

    res.setHeader('Content-Type', 'application/xml')
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
    return res.status(200).send(sitemap)
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return res.status(500).send('<error>Error generating sitemap</error>')
  }
}
