import { useEffect } from 'react'

/**
 * Helper to update or create a meta tag.
 */
function setMetaTag(attrName, attrValue, content) {
  if (!content) return
  let tag = document.querySelector(`meta[${attrName}="${attrValue}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attrName, attrValue)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

/**
 * Full-featured SEO Component:
 * Injects Title, Meta Description, Canonical link, OpenGraph tags, Twitter Card tags, and JSON-LD structured data.
 */
export default function SEO({
  title,
  description,
  canonical,
  image,
  type = 'website',
  publishedTime,
  modifiedTime,
  author = 'PromptVault',
  jsonLd,
}) {
  useEffect(() => {
    const defaultSiteName = 'PromptVault'
    const defaultDescription =
      'Browse, customize, and copy production-ready AI prompts. Fill in the variables, generate your copy, and ship faster.'
    const fullTitle = title ? `${title} · ${defaultSiteName}` : `${defaultSiteName} · Curated AI Prompts`
    const metaDesc = description || defaultDescription
    const pageUrl = canonical || (typeof window !== 'undefined' ? window.location.href : '')
    const defaultImage =
      image ||
      'https://images.unsplash.com/photo-1533750349088-cd871a92f312?q=80&w=1200&auto=format&fit=crop'

    // 1. Document Title
    document.title = fullTitle

    // 2. Standard Meta Tags
    setMetaTag('name', 'description', metaDesc)

    // 3. Canonical Link
    if (pageUrl) {
      let link = document.querySelector('link[rel="canonical"]')
      if (!link) {
        link = document.createElement('link')
        link.setAttribute('rel', 'canonical')
        document.head.appendChild(link)
      }
      link.setAttribute('href', pageUrl)
    }

    // 4. OpenGraph Tags
    setMetaTag('property', 'og:site_name', defaultSiteName)
    setMetaTag('property', 'og:type', type)
    setMetaTag('property', 'og:title', fullTitle)
    setMetaTag('property', 'og:description', metaDesc)
    setMetaTag('property', 'og:url', pageUrl)
    setMetaTag('property', 'og:image', defaultImage)

    if (publishedTime) {
      setMetaTag('property', 'article:published_time', publishedTime)
    }
    if (modifiedTime) {
      setMetaTag('property', 'article:modified_time', modifiedTime)
    }
    if (author) {
      setMetaTag('property', 'article:author', author)
    }

    // 5. Twitter Card Tags
    setMetaTag('name', 'twitter:card', 'summary_large_image')
    setMetaTag('name', 'twitter:title', fullTitle)
    setMetaTag('name', 'twitter:description', metaDesc)
    setMetaTag('name', 'twitter:image', defaultImage)

    // 6. JSON-LD Structured Data
    const scriptId = 'pv-json-ld'
    let scriptTag = document.getElementById(scriptId)
    if (!scriptTag) {
      scriptTag = document.createElement('script')
      scriptTag.id = scriptId
      scriptTag.type = 'application/ld+json'
      document.head.appendChild(scriptTag)
    }

    const structuredData =
      jsonLd ||
      (type === 'article'
        ? {
            '@context': 'https://schema.org',
            '@type': 'TechArticle',
            headline: title,
            description: metaDesc,
            image: defaultImage,
            datePublished: publishedTime,
            dateModified: modifiedTime || publishedTime,
            author: {
              '@type': 'Person',
              name: author,
            },
            publisher: {
              '@type': 'Organization',
              name: 'PromptVault',
              logo: {
                '@type': 'ImageObject',
                url: `${typeof window !== 'undefined' ? window.location.origin : ''}/logo.png`,
              },
            },
          }
        : {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'PromptVault',
            url: typeof window !== 'undefined' ? window.location.origin : 'https://promptvault.app',
            description: defaultDescription,
            potentialAction: {
              '@type': 'SearchAction',
              target: `${typeof window !== 'undefined' ? window.location.origin : ''}/search?q={search_term_string}`,
              'query-input': 'required name=search_term_string',
            },
          })

    scriptTag.textContent = JSON.stringify(structuredData)
  }, [title, description, canonical, image, type, publishedTime, modifiedTime, author, jsonLd])

  return null
}
