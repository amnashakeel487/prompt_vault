# GitHub Image Upload Setup Guide

If you're getting GitHub upload errors when adding images in the admin dashboard, follow these steps to configure the GitHub integration:

## 1. Create a GitHub Personal Access Token

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Set the following:
   - **Name**: `PromptVault Image Upload`
   - **Expiration**: Choose your preferred expiration
   - **Scopes**: Check `repo` (or `contents:write` for fine-grained tokens)
4. Click "Generate token" and **copy the token immediately**

## 2. Create/Configure a GitHub Repository for Images

1. Create a new public repository (e.g., `promptvault-images`)
2. Note down:
   - Your GitHub username/organization name (GITHUB_OWNER)
   - Repository name (GITHUB_REPO)
   - Branch name (usually `main` or `master`)

## 3. Set Environment Variables

### For Local Development (.env file):
```env
GITHUB_TOKEN=github_pat_your_token_here
GITHUB_OWNER=your-username
GITHUB_REPO=promptvault-images
GITHUB_BRANCH=main
```

### For Production (Vercel Dashboard):
1. Go to your Vercel project → Settings → Environment Variables
2. Add these variables:
   - `GITHUB_TOKEN`: Your personal access token
   - `GITHUB_OWNER`: Your GitHub username
   - `GITHUB_REPO`: Your repository name
   - `GITHUB_BRANCH`: `main` (or your default branch)

## 4. Verify Setup

1. Redeploy your application (for production changes)
2. Try uploading an image in the admin dashboard
3. Check your GitHub repository - uploaded images should appear in `assets/prompts/`

## Troubleshooting

### "Unauthorized" Error
- Check that your GitHub token is valid and hasn't expired
- Verify the token has `repo` or `contents:write` permissions
- Make sure the token is correctly set in your environment variables

### "Not Found" Error
- Verify GITHUB_OWNER and GITHUB_REPO are correct
- Make sure the repository exists and is accessible with your token

### "Configuration Missing" Error
- Check that all environment variables are set in your deployment platform
- For Vercel, make sure you've set server-side environment variables (without VITE_ prefix)

## Alternative Solutions

If GitHub setup is complex, you can use these alternatives:
1. **Google Drive**: Share images publicly and use the share link
2. **Direct URLs**: Use images hosted elsewhere (Unsplash, etc.)
3. **CDN Services**: Use services like Cloudinary or AWS S3

## File Structure

Uploaded images will be stored in your GitHub repo as:
```
your-repo/
├── assets/
│   └── prompts/
│       ├── 1703123456789_image1.jpg
│       ├── 1703123456790_image2.png
│       └── ...
```

The images will be accessible via:
`https://raw.githubusercontent.com/OWNER/REPO/BRANCH/assets/prompts/filename.jpg`