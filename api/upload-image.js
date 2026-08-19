import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 1. Verify Authorization Header (Supabase Bearer Token)
    const authHeader = req.headers.authorization || req.headers.Authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' })
    }

    const token = authHeader.split(' ')[1]
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: 'Supabase configuration missing on server' })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid Supabase token' })
    }

    // 2. Validate Payload
    const { fileBase64, fileName, mimeType } = req.body || {}
    if (!fileBase64 || !fileName) {
      return res.status(400).json({ error: 'fileBase64 and fileName are required' })
    }

    // Strip data URL prefix if provided (e.g. "data:image/png;base64,...")
    const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '')

    // 3. GitHub Configuration
    const owner = process.env.GITHUB_OWNER || process.env.VITE_GITHUB_OWNER
    const repo = process.env.GITHUB_REPO || process.env.VITE_GITHUB_REPO
    const branch = process.env.GITHUB_BRANCH || process.env.VITE_GITHUB_BRANCH || 'main'
    const githubToken = process.env.GITHUB_TOKEN || process.env.VITE_GITHUB_TOKEN

    if (!owner || !repo || !githubToken) {
      return res.status(500).json({
        error: 'GitHub credentials (GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO) are not configured on server',
      })
    }

    // Generate clean unique filename
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase()
    const uniqueFileName = `${Date.now()}_${sanitizedName}`
    const path = `assets/prompts/${uniqueFileName}`

    // 4. GitHub REST API PUT Request
    const githubApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
    const response = await fetch(githubApiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'PromptVault-App',
      },
      body: JSON.stringify({
        message: `Upload prompt asset: ${uniqueFileName}`,
        content: cleanBase64,
        branch,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GitHub API error:', response.status, errorText)
      return res.status(response.status).json({
        error: `GitHub upload failed: ${response.statusText}`,
        details: errorText,
      })
    }

    // 5. Construct and Return Raw GitHub URL
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
    return res.status(200).json({
      success: true,
      url: rawUrl,
      fileName: uniqueFileName,
      path,
    })
  } catch (err) {
    console.error('Server error uploading to GitHub:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
