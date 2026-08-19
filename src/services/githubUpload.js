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

  // 1. Get authenticated user's access token
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('You must be signed in as an admin to upload images.')
  }

  // 2. Convert file to base64
  const base64Data = await fileToBase64(file)

  // 3. Post to backend endpoint
  const response = await fetch('/api/upload-image', {
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

  if (!response.ok) {
    let errorMessage = `Upload failed with status ${response.status}`
    try {
      const errorJson = await response.json()
      if (errorJson.error) errorMessage = errorJson.error
    } catch {
      // ignore json parse error
    }
    throw new Error(errorMessage)
  }

  const result = await response.json()
  return result
}
