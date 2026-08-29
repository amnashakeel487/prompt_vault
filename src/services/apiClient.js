const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function getAuthHeader() {
  const token = localStorage.getItem('pv-user-token') || localStorage.getItem('pv-system-token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiGet(endpoint, params = {}) {
  const url = new URL(`${API_BASE_URL}${endpoint}`)
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      url.searchParams.append(key, params[key])
    }
  })

  const res = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    }
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || `HTTP error! status: ${res.status}`)
  }
  return data
}

export async function apiPost(endpoint, body = {}) {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(body)
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || `HTTP error! status: ${res.status}`)
  }
  return data
}

export async function apiPut(endpoint, body = {}) {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(body)
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || `HTTP error! status: ${res.status}`)
  }
  return data
}

export async function apiDelete(endpoint) {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    }
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || `HTTP error! status: ${res.status}`)
  }
  return data
}
