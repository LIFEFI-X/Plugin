// Token estimation utility
// Heuristic approach: 1 token ≈ 4 English characters or 1.5 Chinese characters

export function estimateTokens(text: string): number {
  if (!text) return 0
  
  // count Chinese and non-Chinese characters
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const otherChars = text.length - chineseChars
  
  // Chinese: 1.5 characters = 1 token, others: 4 characters = 1 token
  const tokens = Math.ceil(chineseChars / 1.5) + Math.ceil(otherChars / 4)
  
  return tokens
}

export function truncateToTokenBudget(text: string, maxTokens: number): string {
  if (!text) return ''
  
  const currentTokens = estimateTokens(text)
  if (currentTokens <= maxTokens) return text
  
  // truncate proportionally
  const ratio = maxTokens / currentTokens
  const targetLength = Math.floor(text.length * ratio)
  
  return text.substring(0, targetLength) + '...'
}

export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) return `${tokens} tokens`
  return `${(tokens / 1000).toFixed(1)}K tokens`
}

