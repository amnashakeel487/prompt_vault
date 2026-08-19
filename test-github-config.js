// Simple test script to check GitHub configuration
// Run with: node test-github-config.js

const requiredEnvVars = [
  'GITHUB_TOKEN',
  'GITHUB_OWNER',
  'GITHUB_REPO',
  'GITHUB_BRANCH'
]

console.log('🔍 Checking GitHub Configuration...\n')

let allConfigured = true

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar]
  const status = value ? '✅' : '❌'
  const display = value ? (envVar === 'GITHUB_TOKEN' ? 'github_pat_***' : value) : 'NOT SET'
  
  console.log(`${status} ${envVar}: ${display}`)
  
  if (!value) {
    allConfigured = false
  }
})

console.log('\n' + '='.repeat(50))

if (allConfigured) {
  console.log('✅ All GitHub environment variables are configured!')
  console.log('\n💡 If uploads still fail, check:')
  console.log('  - Token has not expired')
  console.log('  - Token has "repo" or "contents:write" permissions')
  console.log('  - Repository exists and is accessible')
} else {
  console.log('❌ Missing GitHub environment variables!')
  console.log('\n📝 Next steps:')
  console.log('  1. Create a .env file in the project root')
  console.log('  2. Add the missing variables (see .env.example)')
  console.log('  3. For production, set them in your Vercel dashboard')
  console.log('  4. See GITHUB_SETUP.md for detailed instructions')
}

console.log('\n🔗 Useful links:')
console.log('  - GitHub Tokens: https://github.com/settings/tokens')
console.log('  - Setup Guide: ./GITHUB_SETUP.md')
console.log('  - Vercel Env Vars: https://vercel.com/docs/projects/environment-variables')