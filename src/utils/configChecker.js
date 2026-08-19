/**
 * Utility to check configuration and provide helpful error messages
 */

export function checkGitHubConfig() {
  const requiredEnvVars = [
    'GITHUB_TOKEN',
    'GITHUB_OWNER', 
    'GITHUB_REPO'
  ]
  
  const missing = []
  const configured = []
  
  // Check server-side env vars (these won't be available client-side)
  // We can only check if they exist by making a test request
  
  return {
    isConfigured: missing.length === 0,
    missing,
    configured,
    helpMessage: missing.length > 0 
      ? `Missing GitHub environment variables: ${missing.join(', ')}. Please set these in your .env file or Vercel dashboard.`
      : 'GitHub configuration appears to be set up correctly.'
  }
}

export function getUploadErrorSuggestions(errorMessage) {
  const suggestions = []
  
  if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
    suggestions.push('Check that your GITHUB_TOKEN is valid and has the correct permissions')
    suggestions.push('Make sure the token has "repo" or "contents:write" scope')
    suggestions.push('Verify the token hasn\'t expired')
  }
  
  if (errorMessage.includes('Not Found') || errorMessage.includes('404')) {
    suggestions.push('Verify GITHUB_OWNER and GITHUB_REPO are correct')
    suggestions.push('Make sure the repository exists and is accessible')
  }
  
  if (errorMessage.includes('configuration') || errorMessage.includes('missing')) {
    suggestions.push('Ensure all GitHub environment variables are set in your deployment')
    suggestions.push('For local development, check your .env file')
    suggestions.push('For production, check your Vercel environment variables')
  }
  
  if (errorMessage.includes('Network error')) {
    suggestions.push('Check your internet connection')
    suggestions.push('Try the upload again in a moment')
  }
  
  if (suggestions.length === 0) {
    suggestions.push('Try using Google Drive link or direct URL as an alternative')
    suggestions.push('Contact support if the issue persists')
  }
  
  return suggestions
}