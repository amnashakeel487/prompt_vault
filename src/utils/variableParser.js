// Detects {{VariableName}} placeholders inside a prompt body and
// provides helpers to render a fillable form + generate the final prompt.

const VAR_REGEX = /\{\{\s*([a-zA-Z0-9_ ]+?)\s*\}\}/g

/** Returns an ordered list of unique variable names found in the prompt text. */
export function extractVariables(promptText = '') {
  const seen = new Set()
  const out = []
  let match
  const re = new RegExp(VAR_REGEX)
  while ((match = re.exec(promptText)) !== null) {
    const name = match[1].trim()
    if (!seen.has(name)) {
      seen.add(name)
      out.push(name)
    }
  }
  return out
}

/** Splits prompt text into an array of {type:'text'|'var', value} for highlighted rendering. */
export function tokenizePrompt(promptText = '') {
  const tokens = []
  let lastIndex = 0
  let match
  const re = new RegExp(VAR_REGEX)
  while ((match = re.exec(promptText)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: promptText.slice(lastIndex, match.index) })
    }
    tokens.push({ type: 'var', value: match[1].trim() })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < promptText.length) {
    tokens.push({ type: 'text', value: promptText.slice(lastIndex) })
  }
  return tokens
}

/** Replaces {{Variable}} occurrences with supplied values. Falls back to the placeholder if empty. */
export function generatePrompt(promptText = '', values = {}) {
  return promptText.replace(VAR_REGEX, (_, rawName) => {
    const name = rawName.trim()
    const val = values[name]
    return val && val.trim().length > 0 ? val : `{{${name}}}`
  })
}

/** Rough token estimate (chars / 4) used for the "Estimated Tokens" badge. */
export function estimateTokens(text = '') {
  return Math.max(1, Math.round(text.length / 4))
}

/** Rough reading time in minutes. */
export function readingTime(text = '') {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}
