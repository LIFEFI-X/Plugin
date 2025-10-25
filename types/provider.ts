// AI provider configuration type definitions

export type ApiType = 'claude' | 'deepseek' | 'openai' | 'openai-completions' | 'default'

export interface AIProvider {
  id: string
  name: string
  apiUrl: string
  apiKey: string
  apiType?: ApiType // auto-detected API type
  enabled: boolean
  icon?: string
  models: AIModel[]
  config: ProviderConfig // provider default configuration
}

export interface AIModel {
  id: string
  name: string
  config: ModelConfig
}

export interface ProviderConfig {
  maxTokens: number
  temperature: number
  stream: boolean
}

export interface ModelConfig extends ProviderConfig {
  // optional model-specific configuration
}

export interface SelectedModel {
  providerId: string
  modelId: string
}

export interface AIRequestParams {
  context: string
  providerId: string
  modelId: string
  onProgress?: (chunk: string) => void
}

export interface AIResponse {
  content: string
  usage?: {
    total_tokens: number
  }
}

