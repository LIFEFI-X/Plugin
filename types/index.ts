// history record types
export interface HistoryRecord {
  id: string
  timestamp: number
  originalText: string
  newText: string
  type: 'simplify' | 'expand' | 'translate' | 'custom'
  context?: string // associated context
  url: string
  pageTitle: string
}

// highlight marker types
export interface Highlight {
  id: string
  text: string
  range: {
    startOffset: number
    endOffset: number
    startContainer: string // node path
    endContainer: string
  }
  timestamp: number
}

// AI request types
export interface AIRequest {
  type: 'simplify' | 'expand' | 'translate' | 'custom'
  text: string
  context?: string
  customPrompt?: string
}

// AI response types
export interface AIResponse {
  success: boolean
  result?: string
  error?: string
}

// user configuration type
export interface UserSettings {
  apiKey: string
  apiEndpoint: string
  model: string
}
