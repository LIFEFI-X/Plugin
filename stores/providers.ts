// AI provider state management
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AIProvider, AIModel, SelectedModel } from '@/types/provider'
import { detectApiType } from '@/utils/api'

export const useProviderStore = defineStore('providers', () => {
  // state
  const providers = ref<AIProvider[]>([])
  const selectedModel = ref<SelectedModel | null>(null)
  
  // default provider configuration
  const getDefaultProviders = (): AIProvider[] => [
    {
      id: 'demo-provider',
      name: 'Demo Provider',
      apiUrl: '',
      apiKey: '',
      enabled: false,
      models: [],
      config: {
        maxTokens: 150,
        temperature: 0.7,
        stream: true
      }
    }
  ]
  
  // computed property: enabled providers
  const enabledProviders = computed(() => {
    return providers.value.filter(p => p.enabled)
  })
  
  // computed property: currently selected provider and model
  const currentProvider = computed(() => {
    if (!selectedModel.value) return null
    return providers.value.find(p => p.id === selectedModel.value!.providerId)
  })
  
  const currentModel = computed(() => {
    if (!selectedModel.value || !currentProvider.value) return null
    return currentProvider.value.models.find(m => m.id === selectedModel.value!.modelId)
  })
  
  // method: initialize
  const initialize = async () => {
    try {
      // restore data from browser.storage.local
      const result = await browser.storage.local.get(['aiProviders', 'selectedModel'])
      
      if (result.aiProviders && result.aiProviders.length > 0) {
        providers.value = result.aiProviders
        console.log('[ProviderStore] Restored provider configuration:', providers.value)
      } else {
        // use default configuration
        providers.value = getDefaultProviders()
        await saveProviders()
      }
      
      if (result.selectedModel) {
        selectedModel.value = result.selectedModel
        console.log('[ProviderStore] Restored selected model:', selectedModel.value)
      }
    } catch (error) {
      console.error('[ProviderStore] Initialization failed:', error)
      providers.value = getDefaultProviders()
    }
  }
  
  // method: persist provider list
  const saveProviders = async () => {
    try {
      await browser.storage.local.set({ aiProviders: providers.value })
      console.log('[ProviderStore] Provider list saved')
    } catch (error) {
      console.error('[ProviderStore] Failed to save providers:', error)
    }
  }
  
  // method: add provider
  const addProvider = async (provider: AIProvider) => {
    // auto-detect API type
    provider.apiType = detectApiType(provider.apiUrl)
    
    providers.value.push(provider)
    await saveProviders()
    console.log('[ProviderStore] Added provider:', provider)
  }
  
  // method: update provider
  const updateProvider = async (providerId: string, updates: Partial<AIProvider>) => {
    const provider = providers.value.find(p => p.id === providerId)
    if (!provider) return false
    
    Object.assign(provider, updates)
    
    // re-detect type when apiUrl changes
    if (updates.apiUrl) {
      provider.apiType = detectApiType(updates.apiUrl)
    }
    
    await saveProviders()
    console.log('[ProviderStore] Updated provider:', provider)
    return true
  }
  
  // method: remove provider
  const removeProvider = async (providerId: string) => {
    const index = providers.value.findIndex(p => p.id === providerId)
    if (index === -1) return false
    
    // clear selection if the removed provider was selected
    if (selectedModel.value?.providerId === providerId) {
      await clearSelectedModel()
    }
    
    providers.value.splice(index, 1)
    await saveProviders()
    console.log('[ProviderStore] Removed provider:', providerId)
    return true
  }
  
  // method: toggle provider enabled state
  const toggleProviderEnabled = async (providerId: string) => {
    const provider = providers.value.find(p => p.id === providerId)
    if (!provider) return false
    
    provider.enabled = !provider.enabled
    await saveProviders()
    console.log('[ProviderStore] Toggled provider state:', providerId, provider.enabled)
    return true
  }
  
  // method: add model
  const addModel = async (providerId: string, model: AIModel) => {
    const provider = providers.value.find(p => p.id === providerId)
    if (!provider) return false
    
    // check whether it already exists
    const exists = provider.models.find(m => m.id === model.id)
    if (exists) return false
    
    provider.models.push(model)
    await saveProviders()
    console.log('[ProviderStore] Added model:', providerId, model)
    return true
  }
  
  // method: remove model
  const removeModel = async (providerId: string, modelId: string) => {
    const provider = providers.value.find(p => p.id === providerId)
    if (!provider) return false
    
    const index = provider.models.findIndex(m => m.id === modelId)
    if (index === -1) return false
    
    // clear selection if the removed model was selected
    if (selectedModel.value?.providerId === providerId && 
        selectedModel.value?.modelId === modelId) {
      await clearSelectedModel()
    }
    
    provider.models.splice(index, 1)
    
    // disable provider when no models remain
    if (provider.models.length === 0) {
      provider.enabled = false
    }
    
    await saveProviders()
    console.log('[ProviderStore] Removed model:', providerId, modelId)
    return true
  }
  
  // method: select model
  const setSelectedModel = async (providerId: string, modelId: string) => {
    selectedModel.value = { providerId, modelId }
    
    try {
      await browser.storage.local.set({ selectedModel: selectedModel.value })
      console.log('[ProviderStore] Selected model:', selectedModel.value)
    } catch (error) {
      console.error('[ProviderStore] Failed to persist selected model:', error)
    }
  }
  
  // method: clear selected model
  const clearSelectedModel = async () => {
    selectedModel.value = null
    
    try {
      await browser.storage.local.remove('selectedModel')
      console.log('[ProviderStore] Cleared selected model')
    } catch (error) {
      console.error('[ProviderStore] Failed to clear selected model:', error)
    }
  }
  
  // method: retrieve provider and model configuration (for AI requests)
  const getProviderConfig = (providerId: string, modelId: string) => {
    const provider = providers.value.find(p => p.id === providerId)
    if (!provider) return null
    
    const model = provider.models.find(m => m.id === modelId)
    if (!model) return null
    
    return {
      apiUrl: provider.apiUrl,
      apiKey: provider.apiKey,
      apiType: provider.apiType || detectApiType(provider.apiUrl),
      modelId: model.id,
      config: model.config
    }
  }
  
  return {
    // state
    providers,
    selectedModel,
    
    // computed properties
    enabledProviders,
    currentProvider,
    currentModel,
    
    // methods
    initialize,
    addProvider,
    updateProvider,
    removeProvider,
    toggleProviderEnabled,
    addModel,
    removeModel,
    setSelectedModel,
    clearSelectedModel,
    getProviderConfig
  }
})

