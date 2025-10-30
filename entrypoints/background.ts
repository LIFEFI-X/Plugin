import browser from 'webextension-polyfill'
import type { AIRequest, AIResponse } from '@/types'
import { detectApiType, formatChatRequest, getApiHeaders, parseStreamChunk } from '@/utils/api'
import { getConfig as getFromDb, getEnabledKBs, getEnabledCrossTabContexts } from '@/utils/db'
import { buildCompletionContext, buildCompletionMessages, buildTextProcessMessages } from '@/utils/context'

export default defineBackground(() => {
  console.log('[Background] lifefi background script started', { id: browser.runtime.id })


  initializeOnInstall()


  browser.runtime.onMessage.addListener((message: any, sender: any) => {
    console.log('[Background] Received message:', message.type)
    
    try {
      if (message.type === 'AI_REQUEST') {
        const request: AIRequest = message.payload
        return handleAIRequest(request)
      }
      
     
      if (message.type === 'AI_COMPLETION') {
        handleCompletionStream(message.payload, sender.tab?.id)
        return true // 保持消息通道开放
      }
      
 
      if (message.type === 'GET_CONFIG') {
        console.log('[Background] Received configuration request')
        return handleGetConfig()
      }
      
   
      if (message.type === 'SAVE_CROSS_TAB_CONTEXT') {
        return handleSaveCrossTabContext(message.payload)
      }
      

      if (message.type === 'LIFEFI_GET_CONTEXT') {
        return handleGetContext()
      }
      
      
      if (message.type === 'LIFEFI_PET_AI_CALL') {
        return handlePetAICall(message.payload)
      }
      
      // Unknown message type
      console.warn('[Background] Unknown message type:', message.type)
      return Promise.resolve({ success: false, error: 'Unknown message type' })
    } catch (error) {
      console.error('[Background] Failed to handle message:', error)
      return Promise.resolve({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    }
  })
  
  console.log('[Background] Message listener registered')
})


async function initializeOnInstall() {
  try {
    console.log('[Background] Starting initialization...')
    
    // 1. 初始化默认 DeepSeek 配置
    const { saveConfig } = await import('@/utils/db')
    
    const defaultProvider = {
      id: 'deepseek',
      name: 'DeepSeek',
      apiUrl: 'https://api.deepseek.com/chat/completions',
      apiKey: 'sk-99fe12f7b8154369a90d0596dfb3e0d3',
      apiType: 'deepseek' as const,
      enabled: true,
      models: [{
        id: 'deepseek-chat',
        name: 'deepseek-chat',
        config: {
          maxTokens: 150,
          temperature: 1.5,
          stream: true
        }
      }]
    }
    

    await saveConfig('aiProviders', [defaultProvider])
    await saveConfig('selectedModel', {
      providerId: 'deepseek',
      modelId: 'deepseek-chat'
    })
    
    console.log('[Background] ✅ Default configuration initialized')
    

    await import('@/utils/db')
    
    console.log('[Background] ✅ Database initialized')
    console.log('[Background] ✅ Initialization complete')
    
  } catch (error) {
    console.error('[Background] ❌ Initialization failed:', error)
  }
}


async function handleSaveCrossTabContext(context: any) {
  try {
    const { saveCrossTabContext } = await import('@/utils/db')
    await saveCrossTabContext(context)
    console.log('[Background] ✅ Cross-tab context saved')
    return { success: true }
  } catch (error) {
    console.error('[Background] Failed to save cross-tab context:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}


async function handleGetContext() {
  try {
    console.log('[Background] Fetching knowledge bases and contexts...')
    
    const knowledgeBases = await getEnabledKBs()
    const crossTabContexts = await getEnabledCrossTabContexts()
    
    console.log('[Background] ✅ Knowledge bases:', knowledgeBases.length, ' entries, contexts:', crossTabContexts.length, ' entries')
    
    return {
      success: true,
      context: {
        knowledgeBases,
        crossTabContexts
      }
    }
  } catch (error) {
    console.error('[Background] Failed to fetch context:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}


async function handlePetAICall(payload: any): Promise<any> {
  try {
    const { action, prompt } = payload
    console.log('[Background] 🤖 Handling pet AI request:', action, 'prompt length:', prompt.length)
    

    const configData = await handleGetConfig()
    if (!configData.success) {
      console.error('[Background] ❌ Failed to retrieve configuration:', configData.error)
      return {
        success: false,
        error: configData.error || 'Please configure the AI service in the extension settings'
      }
    }
    
    const { providers, selectedModel, knowledgeBases, crossTabContexts } = configData.data!
    const provider = providers.find((p: any) => p.id === selectedModel.providerId)
    const model = provider?.models.find((m: any) => m.id === selectedModel.modelId)
    
    if (!provider || !model) {
      console.error('[Background] ❌ AI model configuration incomplete')
      return {
        success: false,
        error: 'AI model configuration incomplete'
      }
    }
    
    console.log('[Background] ✅ Using model:', model.id, 'knowledge bases:', knowledgeBases.length, 'contexts:', crossTabContexts.length)

    let contextInfo = ''
    const contextParts = []
    
    if (knowledgeBases && knowledgeBases.length > 0) {
      contextParts.push('\n【knowledgeBases】')
      knowledgeBases.forEach((kb: any, index: number) => {
        contextParts.push(`${index + 1}. ${kb.title}:\n${kb.content}`)
      })
    }
    
    if (crossTabContexts && crossTabContexts.length > 0) {
      contextParts.push('\n【crossTabContexts】')
      crossTabContexts.forEach((ctx: any, index: number) => {
        contextParts.push(`${index + 1}. ${ctx.text}`)
      })
    }
    
    if (contextParts.length > 0) {
      contextInfo = contextParts.join('\n')
    }
    

    const messages = [
      {
        role: 'system',
        content: 'You are LifeFi, a helpful and friendly AI writing assistant. Keep responses concise (under 100 words) and friendly. Use the provided reference information when relevant.'
      },
      {
        role: 'user',
        content: prompt + contextInfo
      }
    ]
    

    const response = await fetch(provider.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`
      },
      body: JSON.stringify({
        model: model.id,
        messages,
        max_tokens: model.config?.maxTokens || 150,
        temperature: model.config?.temperature || 0.7,
        stream: false
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API request failed: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    const result = data.choices?.[0]?.message?.content || data.content?.[0]?.text || ''
    
    console.log('[Background] ✅ AI response length:', result.length)
    
    return {
      success: true,
      result: result.trim()
    }
    
  } catch (error) {
    console.error('[Background] ❌ LifeFi Companion AI request failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}


async function handleGetConfig() {
  try {
    console.log('[Background] Reading configuration from IndexedDB...')
    
    const providers = await getFromDb('aiProviders')
    const selectedModel = await getFromDb('selectedModel')
    const knowledgeBases = await getEnabledKBs()
    const crossTabContexts = await getEnabledCrossTabContexts()
    
    console.log('[Background] Read result:', { 
      providers, 
      selectedModel,
      kbCount: knowledgeBases.length,
      ctxCount: crossTabContexts.length,
      enabledKBs: knowledgeBases.filter((kb: any) => kb.enabled).length,
      kbDetails: knowledgeBases.map((kb: any) => ({ title: kb.title, enabled: kb.enabled }))
    })
    
    if (!providers || !selectedModel) {
      console.log('[Background] AI configuration incomplete')
      return {
        success: false,
        error: 'Please configure the AI service in the extension settings'
      }
    }
    
    console.log('[Background] ✅ Configuration loaded successfully')
    return {
      success: true,
      data: {
        providers,
        selectedModel,
        knowledgeBases,
        crossTabContexts
      }
    }
  } catch (error) {
    console.error('[Background] Failed to load configuration:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}


async function handleAIRequest(request: AIRequest): Promise<AIResponse> {
  try {
    console.log('[Background] Processing text request:', request.type)
    

    const configData = await handleGetConfig()
    if (!configData.success) {
      return {
        success: false,
        error: configData.error
      }
    }
    
    const { providers, selectedModel, knowledgeBases, crossTabContexts } = configData.data!
    const provider = providers.find((p: any) => p.id === selectedModel.providerId)
    const model = provider?.models.find((m: any) => m.id === selectedModel.modelId)
    
    if (!provider || !model) {
      return {
        success: false,
        error: 'AI model configuration incomplete'
      }
    }
    

    const actionType = request.type as 'polish' | 'correct' | 'simplify' | 'expand' | 'translate' | 'custom'

    const messages = buildTextProcessMessages(
      actionType,
      request.text,
      knowledgeBases,
      crossTabContexts,
      request.customPrompt
    )
    
    console.log('[Background] Operation type:', actionType, 'knowledge base count:', knowledgeBases.length, 'cross-tab context count:', crossTabContexts.length, 'messages:', messages.length)
    console.log('[Background] Selected text length:', request.text.length)
    if (actionType === 'custom') {
      console.log('[Background] Custom prompt:', request.customPrompt?.substring(0, 50))
      console.log('[Background] Selected text will be used as context')
    }
    console.log('[Background] Enabled knowledge bases:', knowledgeBases.filter((kb: any) => kb.enabled).map((kb: any) => kb.title))
    

    const bodyParams = formatChatRequest(
      provider.apiType,
      messages,
      model.id,
      {
        maxTokens: model.config.maxTokens || 500,
        temperature: model.config.temperature || 1.5,
        stream: false 
      }
    )
    
    const headers = getApiHeaders(provider.apiType, provider.apiKey)
    
    console.log('[Background] Sending request:', provider.apiUrl)
    console.log('[Background] Request body preview:', {
      model: bodyParams.model,
      messagesCount: bodyParams.messages.length
    })
    
    const response = await fetch(provider.apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyParams)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API request failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const result = data.choices?.[0]?.message?.content || data.content?.[0]?.text || ''
    
    console.log('[Background] ✅ AI response length:', result.length)
    
    return {
      success: true,
      result: result.trim()
    }
  } catch (error) {
    console.error('[Background] AI request failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}


async function handleCompletionStream(payload: any, tabId?: number) {
  try {
    const { context } = payload
    
    console.log('[Background] Starting autocomplete, context length:', context.length)
    
  
    const configData = await handleGetConfig()
    if (!configData.success) {
      sendCompletionError(tabId || 0, configData.error || 'Configuration error')
      return
    }
    
    const { providers, selectedModel, knowledgeBases, crossTabContexts } = configData.data!
    const provider = providers.find((p: any) => p.id === selectedModel.providerId)
    const model = provider?.models.find((m: any) => m.id === selectedModel.modelId)
    
    if (!provider || !model) {
      sendCompletionError(tabId, 'AI model configuration incomplete')
      return
    }
    

    const messages = buildCompletionMessages(
      context,
      knowledgeBases,
      crossTabContexts
    )
    
    console.log('[Background] knowledge bases:', knowledgeBases.length, ' entries(enabled:', knowledgeBases.filter((kb: any) => kb.enabled).length, '), cross-tab contexts:', crossTabContexts.length, ' entries(enabled:', crossTabContexts.filter((ctx: any) => ctx.enabled).length, '）')
    

    const bodyParams = formatChatRequest(
      provider.apiType,
      messages,
      model.id,
      {
        maxTokens: model.config.maxTokens || 150,
        temperature: model.config.temperature || 1.5,
        stream: true 
      }
    )
    
    const headers = getApiHeaders(provider.apiType, provider.apiKey)
    
    console.log('[Background] Sending streaming request:', provider.apiUrl)
    

    const response = await fetch(provider.apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyParams)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    if (!response.body) {
      throw new Error('API response body is empty')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) {
        console.log('[Background] Streaming read complete')
        break
      }

      buffer += decoder.decode(value, { stream: true })

      let lastNewlineIndex
      while ((lastNewlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.substring(0, lastNewlineIndex).trim()
        buffer = buffer.substring(lastNewlineIndex + 1)

        if (line.startsWith('data:')) {
          const jsonStr = line.substring(5).trim()
          if (jsonStr === '[DONE]') {
            console.log('[Background] Received [DONE] signal')
            sendCompletionComplete(tabId)
            return 
          }
          
          if (!jsonStr) continue

          try {
            const data = JSON.parse(jsonStr)
            const chunk = parseStreamChunk(provider.apiType, data)
            if (chunk) {
              sendCompletionChunk(tabId, chunk)
            }
          } catch (e) {
            console.warn('[Background] Failed to parse JSON:', e, 'raw data:', jsonStr.substring(0, 100))
          }
        }
      }
    }
    sendCompletionComplete(tabId)
  } catch (error) {
    console.error('[Background] Failed to process streaming completion:', error)
    sendCompletionError(tabId, error instanceof Error ? error.message : 'Unknown error')
  }
}


function sendCompletionChunk(tabId: number | undefined, chunk: string) {
  if (!tabId) return
  browser.tabs.sendMessage(tabId, {
    type: 'COMPLETION_CHUNK',
    chunk
  }).catch((err: any) => console.error('[Background] Failed to send message:', err))
}


function sendCompletionComplete(tabId: number | undefined) {
  if (!tabId) return
  browser.tabs.sendMessage(tabId, {
    type: 'COMPLETION_COMPLETE'
  }).catch((err: any) => console.error('[Background] Failed to send message:', err))
}


function sendCompletionError(tabId: number | undefined, error: string) {
  if (!tabId) return
  browser.tabs.sendMessage(tabId, {
    type: 'COMPLETION_ERROR',
    error
  }).catch((err: any) => console.error('[Background] Failed to send message:', err))
}

