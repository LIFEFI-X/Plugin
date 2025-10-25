import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { HistoryRecord, UserSettings } from '@/types'

// declare chrome API types
declare const chrome: any

// use the chrome/browser API compatibility layer
const storage = {
  async get(key: string) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        return new Promise((resolve) => {
          chrome.storage.local.get(key, (result: any) => {
            resolve(result)
          })
        })
      }
      return {}
    } catch (error) {
      console.error('Storage get error:', error)
      return {}
    }
  },
  async set(data: Record<string, any>) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        return new Promise<void>((resolve) => {
          chrome.storage.local.set(data, () => {
            resolve()
          })
        })
      }
    } catch (error) {
      console.error('Storage set error:', error)
    }
  }
}

export const useHistoryStore = defineStore('history', () => {
  const records = ref<HistoryRecord[]>([])
  const settings = ref<UserSettings>({
    apiKey: '',
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-3.5-turbo'
  })

  // load history from storage
  async function loadHistory() {
    try {
      const data = await storage.get('history') as any
      if (data.history && Array.isArray(data.history)) {
        records.value = data.history
      } else {
        records.value = []
      }
      console.log('[HistoryStore] Loaded history records:', records.value.length, 'items')
    } catch (error) {
      console.error('Load history error:', error)
      records.value = []
    }
  }

  // load settings from storage
  async function loadSettings() {
    try {
      const data = await storage.get('settings') as any
      if (data.settings) {
        settings.value = data.settings
      }
    } catch (error) {
      console.error('Load settings error:', error)
    }
  }

  // add history record
  async function addRecord(record: Omit<HistoryRecord, 'id' | 'timestamp'>) {
    // defensive check: ensure records.value is an array
    if (!Array.isArray(records.value)) {
      console.warn('[HistoryStore] records.value is not an array. Reinitializing.')
      records.value = []
    }
    
    const newRecord: HistoryRecord = {
      ...record,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    }
    records.value.unshift(newRecord)
    console.log('[HistoryStore] Added history record:', newRecord.type, 'total:', records.value.length, 'items')
    
    // keep only the latest 100 entries
    if (records.value.length > 100) {
      records.value = records.value.slice(0, 100)
    }
    
    await storage.set({ history: records.value })
    return newRecord
  }

  // undo (remove record)
  async function removeRecord(id: string) {
    records.value = records.value.filter(r => r.id !== id)
    await storage.set({ history: records.value })
  }

  // clear history
  async function clearHistory() {
    records.value = []
    await storage.set({ history: [] })
  }

  // save settings
  async function saveSettings(newSettings: UserSettings) {
    settings.value = newSettings
    await storage.set({ settings: newSettings })
  }

  return {
    records,
    settings,
    loadHistory,
    loadSettings,
    addRecord,
    removeRecord,
    clearHistory,
    saveSettings
  }
})

