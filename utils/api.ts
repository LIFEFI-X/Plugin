// API utilities - unified handling for Chat Completions style endpoints
import type { ApiType } from '@/types/provider'

/**
 * Detect API type from the provided base URL
 */
export const detectApiType = (url: string): ApiType => {
  if (!url) return 'openai-completions'

  const normalizedUrl = url.toLowerCase().trim()
  console.log('[API] Normalized URL:', normalizedUrl)

  // Claude: /v1/messages
  if (normalizedUrl.endsWith('/v1/messages')) {
    console.log('[API] Detected Claude API')
    return 'claude'
  }

  // DeepSeek / OpenAI: /chat/completions
  if (normalizedUrl.endsWith('/chat/completions')) {
    console.log('[API] Detected Chat Completions API')
    return 'deepseek'
  }

  // OpenAI: /v1/chat/completions
  if (normalizedUrl.endsWith('/v1/chat/completions')) {
    console.log('[API] Detected OpenAI Chat Completions API')
    return 'openai-completions'
  }

  console.log('[API] Using default Chat Completions format')
  return 'openai-completions'
}

/**
 * Format Chat Completions request payload
 */
export const formatChatRequest = (
  apiType: ApiType,
  messages: Array<{ role: string; content: string }>,
  modelId: string,
  config: {
    maxTokens: number
    temperature: number
    stream: boolean
  }
) => {
  console.log(`[API] Formatting ${apiType} chat request, messages length:`, messages.length)

  switch (apiType) {
    case 'claude': {
      // Claude API: system message is a dedicated field
      const systemMessage = messages.find(m => m.role === 'system')
      const userMessages = messages.filter(m => m.role !== 'system')

      return {
        model: modelId,
        system: systemMessage?.content || '',
        messages: userMessages,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        stream: config.stream
      }
    }

    case 'deepseek':
    case 'openai-completions':
    default:
      // DeepSeek / OpenAI: shared Chat Completions payload format
      return {
        model: modelId,
        messages,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        stream: config.stream
      }
  }
}

/**
 * Build request headers for the target API
 * Mirrors the logic in chat.ts#getApiHeaders
 */
export const getApiHeaders = (apiType: ApiType, apiKey: string): Record<string, string> => {
  const baseHeaders = {
    'Content-Type': 'application/json'
  }

  if (apiType === 'claude') {
    // Claude requires dedicated headers
    return {
      ...baseHeaders,
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    }
  }

  // OpenAI / DeepSeek / default format
  return {
    ...baseHeaders,
    Authorization: `Bearer ${apiKey}`
  }
}

/**
 * Parse stream chunk text from Chat Completions style responses
 */
export const parseStreamChunk = (apiType: ApiType, data: any): string => {
  try {
    if (apiType === 'claude') {
      // Claude: { type: "content_block_delta", delta: { text: "..." } }
      if (data.type === 'content_block_delta') {
        return data.delta?.text || ''
      }
      if (data.type === 'content_block_start') {
        return data.content_block?.text || ''
      }
      return ''
    }

    // DeepSeek / OpenAI Chat Completions: { choices: [{ delta: { content: "..." } }] }
    return data.choices?.[0]?.delta?.content || ''
  } catch (error) {
    console.error('[API] Failed to parse stream chunk:', error)
    return ''
  }
}
