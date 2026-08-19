import { supabase } from './supabaseClient'

/**
 * Converts a File or Blob object into a base64 string.
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = (error) => reject(error)
  })
}

/**
 * Uploads an image file by sending it to the serverless /api/upload-image endpoint
 * with the authenticated admin session token.
 * 
 * @param {File} file - The image file to upload
 * @returns {Promise<{ url: string, fileName: string }>} Result with the raw GitHub image URL
 */
export async function uploadImageToGitHub(file) {
  if (!file) {
    throw new Error('No file provided for upload')
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File size too large. Maximum 5MB allowed.')
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Please upload an image file (PNG, JPG, GIF, etc.)')
  }

  // 1. Get authenticated user's access token
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('You must be signed in as an admin to upload images.')
  }

  // 2. Convert file to base64
  let base64Data
  try {
    base64Data = await fileToBase64(file)
  } catch (err) {
    throw new Error('Failed to process image file')
  }

  // 3. Post to backend endpoint
  let response
  try {
    response = await fetch('/api/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        fileBase64: base64Data,
        fileName: file.name,
        mimeType: file.type,
      }),
    })
  } catch (err) {
    throw new Error('Network error: Could not connect to upload service')
  }

  if (!response.ok) {
    let errorMessage = `Upload failed with status ${response.status}`
    try {
      const errorJson = await response.json()
      if (errorJson.error) {
        errorMessage = errorJson.error
      }
      if (errorJson.details) {
        console.error('Upload error details:', errorJson.details)
      }
    } catch {
      // If we can't parse the JSON error, provide a generic message based on status
      if (response.status === 401) {
        errorMessage = 'Authentication failed. Please sign in again.'
      } else if (response.status === 500) {
        errorMessage = 'Server configuration error. Please check GitHub settings.'
      } else if (response.status === 403) {
        errorMessage = 'Permission denied. Check GitHub token permissions.'
      }
    }
    throw new Error(errorMessage)
  }

  const result = await response.json()
  
  if (!result.url) {
    throw new Error('Upload succeeded but no URL returned')
  }
  
  return result
}
