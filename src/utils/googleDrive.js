/**
 * Utilities for parsing and converting Google Drive image links to direct embeddable URLs.
 */

/**
 * Extracts Google Drive File ID from various link formats:
 * - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID
 * - https://drive.google.com/uc?export=view&id=FILE_ID
 * - https://drive.google.com/thumbnail?id=FILE_ID
 * - Plain File ID
 */
export function extractGoogleDriveId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') return null
  const input = urlOrId.trim()

  // 1. Check for /file/d/ID/
  const fileDMatch = input.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (fileDMatch && fileDMatch[1]) {
    return fileDMatch[1]
  }

  // 2. Check for id=ID query param
  const idParamMatch = input.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (idParamMatch && idParamMatch[1]) {
    return idParamMatch[1]
  }

  // 3. Check for drive.google.com/d/ID
  const shortDMatch = input.match(/drive\.google\.com\/d\/([a-zA-Z0-9_-]+)/)
  if (shortDMatch && shortDMatch[1]) {
    return shortDMatch[1]
  }

  // 4. If it looks like a raw Google Drive ID (25-45 alphanumeric characters with underscores/dashes)
  if (/^[a-zA-Z0-9_-]{25,45}$/.test(input)) {
    return input
  }

  return null
}

/**
 * Converts a Google Drive link to a direct high-speed Google Usercontent CDN image URL.
 * Falls back to original string if not a Google Drive URL.
 */
export function formatGoogleDriveImageUrl(url) {
  if (!url || typeof url !== 'string') return ''
  const fileId = extractGoogleDriveId(url)
  if (fileId) {
    // lh3.googleusercontent.com is Google's direct image CDN with automatic caching
    return `https://lh3.googleusercontent.com/d/${fileId}`
  }
  return url.trim()
}

/**
 * Detects the source of an image URL.
 * Returns: 'google_drive' | 'github' | 'direct'
 */
export function detectImageSource(url) {
  if (!url || typeof url !== 'string') return 'direct'
  const trimmed = url.toLowerCase().trim()
  if (trimmed.includes('drive.google.com') || trimmed.includes('googleusercontent.com/d/')) {
    return 'google_drive'
  }
  if (trimmed.includes('raw.githubusercontent.com') || trimmed.includes('github.com')) {
    return 'github'
  }
  return 'direct'
}
