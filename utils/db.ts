// IndexedDB storage utilities
// Supports storing configuration, knowledge bases, and cross-tab contexts

import type { KnowledgeBase, CrossTabContext } from '@/types/knowledge'

const DB_NAME = 'WriteBoxDB'
const DB_VERSION = 2 // bump version when introducing new object stores
const STORE_CONFIG = 'config'
const STORE_KB = 'kb_items'
const STORE_CROSS_TAB = 'cross_tab_contexts'

interface DBConfig {
  key: string
  value: any
}

// Open the database and ensure required object stores exist
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('[DB] Failed to open database:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      console.log('[DB] Database opened successfully')
      resolve(request.result)
    }

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result
      const oldVersion = event.oldVersion

      console.log('[DB] Upgrading database:', oldVersion, '->', DB_VERSION)

      if (!db.objectStoreNames.contains(STORE_CONFIG)) {
        db.createObjectStore(STORE_CONFIG, { keyPath: 'key' })
        console.log('[DB] Created store:', STORE_CONFIG)
      }

      if (!db.objectStoreNames.contains(STORE_KB)) {
        db.createObjectStore(STORE_KB, { keyPath: 'id' })
        console.log('[DB] Created store:', STORE_KB)
      }

      if (!db.objectStoreNames.contains(STORE_CROSS_TAB)) {
        db.createObjectStore(STORE_CROSS_TAB, { keyPath: 'id' })
        console.log('[DB] Created store:', STORE_CROSS_TAB)
      }
    }
  })
}

// ============ Configuration helpers ============

// Persist configuration
export async function saveConfig(key: string, value: any): Promise<void> {
  try {
    console.log('[DB] Saving config:', key, 'value:', value)
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CONFIG], 'readwrite')
      const objectStore = transaction.objectStore(STORE_CONFIG)

      const data: DBConfig = { key, value }
      const request = objectStore.put(data)

      request.onsuccess = () => {
        console.log('[DB] Config saved:', key)
        resolve()
      }

      request.onerror = () => {
        console.error('[DB] Failed to save config:', key, request.error)
        reject(request.error)
      }

      transaction.oncomplete = () => {
        console.log('[DB] Transaction complete, closing database')
        db.close()
      }

      transaction.onerror = () => {
        console.error('[DB] Transaction error while saving config:', transaction.error)
        reject(transaction.error)
      }
    })
  } catch (error) {
    console.error('[DB] Unexpected error while saving config:', error)
    throw error
  }
}

// Retrieve configuration
export async function getConfig(key: string): Promise<any> {
  try {
    console.log('[DB] Loading config:', key)
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CONFIG], 'readonly')
      const objectStore = transaction.objectStore(STORE_CONFIG)

      const request = objectStore.get(key)

      request.onsuccess = () => {
        const result = request.result
        if (result) {
          console.log('[DB] Config loaded:', key, 'value:', result.value)
          resolve(result.value)
        } else {
          console.log('[DB] Config not found:', key)
          resolve(null)
        }
      }

      request.onerror = () => {
        console.error('[DB] Failed to load config:', key, request.error)
        reject(request.error)
      }

      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[DB] Unexpected error while loading config:', error)
    throw error
  }
}

// Delete configuration
export async function deleteConfig(key: string): Promise<void> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CONFIG], 'readwrite')
      const objectStore = transaction.objectStore(STORE_CONFIG)

      const request = objectStore.delete(key)

      request.onsuccess = () => {
        console.log('[DB] Config deleted:', key)
        resolve()
      }

      request.onerror = () => {
        console.error('[DB] Failed to delete config:', key, request.error)
        reject(request.error)
      }

      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[DB] Unexpected error while deleting config:', error)
    throw error
  }
}

// Retrieve all configurations
export async function getAllConfigs(): Promise<Record<string, any>> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CONFIG], 'readonly')
      const objectStore = transaction.objectStore(STORE_CONFIG)

      const request = objectStore.getAll()

      request.onsuccess = () => {
        const results = request.result as DBConfig[]
        const configMap: Record<string, any> = {}

        results.forEach(item => {
          configMap[item.key] = item.value
        })

        resolve(configMap)
      }

      request.onerror = () => {
        reject(request.error)
      }

      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[DB] Unexpected error while reading configs:', error)
    return {}
  }
}

// Clear all configuration entries
export async function clearAllConfigs(): Promise<void> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CONFIG], 'readwrite')
      const objectStore = transaction.objectStore(STORE_CONFIG)

      const request = objectStore.clear()

      request.onsuccess = () => {
        console.log('[DB] All configs cleared')
        resolve()
      }

      request.onerror = () => {
        reject(request.error)
      }

      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[DB] Unexpected error while clearing configs:', error)
    throw error
  }
}

// ============ Knowledge base helpers ============

// Persist knowledge base entry
export async function saveKB(kb: KnowledgeBase): Promise<void> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_KB], 'readwrite')
      const objectStore = transaction.objectStore(STORE_KB)

      const request = objectStore.put(kb)

      request.onsuccess = () => {
        console.log('[DB] Knowledge base saved:', kb.id)
        resolve()
      }

      request.onerror = () => {
        console.error('[DB] Failed to save knowledge base:', request.error)
        reject(request.error)
      }

      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[DB] Unexpected error while saving knowledge base:', error)
    throw error
  }
}

// Retrieve single knowledge base
export async function getKB(id: string): Promise<KnowledgeBase | null> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_KB], 'readonly')
      const objectStore = transaction.objectStore(STORE_KB)

      const request = objectStore.get(id)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        reject(request.error)
      }

      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[DB] Unexpected error while retrieving knowledge base:', error)
    throw error
  }
}

// Retrieve all knowledge bases (sorted by updatedAt, descending)
export async function getAllKBs(): Promise<KnowledgeBase[]> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_KB], 'readonly')
      const objectStore = transaction.objectStore(STORE_KB)

      const request = objectStore.getAll()

      request.onsuccess = () => {
        const results = request.result as KnowledgeBase[]
        results.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
        resolve(results)
      }

      request.onerror = () => {
        reject(request.error)
      }

      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[DB] Unexpected error while retrieving knowledge bases:', error)
    return []
  }
}

// Retrieve enabled knowledge bases (max three entries)
export async function getEnabledKBs(): Promise<KnowledgeBase[]> {
  const all = await getAllKBs()
  return all.filter(kb => kb.enabled).slice(0, 3)
}

// Delete knowledge base entry
export async function deleteKB(id: string): Promise<void> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_KB], 'readwrite')
      const objectStore = transaction.objectStore(STORE_KB)

      const request = objectStore.delete(id)

      request.onsuccess = () => {
        console.log('[DB] Knowledge base deleted:', id)
        resolve()
      }

      request.onerror = () => {
        reject(request.error)
      }

      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[DB] Unexpected error while deleting knowledge base:', error)
    throw error
  }
}

// ============ Cross-tab context helpers ============

// Persist cross-tab context
export async function saveCrossTabContext(context: CrossTabContext): Promise<void> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CROSS_TAB], 'readwrite')
      const objectStore = transaction.objectStore(STORE_CROSS_TAB)

      const request = objectStore.put(context)

      request.onsuccess = () => {
        console.log('[DB] Cross-tab context saved:', context.id)
        resolve()
      }

      request.onerror = () => {
        console.error('[DB] Failed to save cross-tab context:', request.error)
        reject(request.error)
      }

      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[DB] Unexpected error while saving cross-tab context:', error)
    throw error
  }
}

// Retrieve every cross-tab context (sorted by timestamp, descending)
export async function getAllCrossTabContexts(): Promise<CrossTabContext[]> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CROSS_TAB], 'readonly')
      const objectStore = transaction.objectStore(STORE_CROSS_TAB)

      const request = objectStore.getAll()

      request.onsuccess = () => {
        const results = request.result as CrossTabContext[]
        results.sort((a, b) => b.timestamp - a.timestamp)
        resolve(results)
      }

      request.onerror = () => {
        reject(request.error)
      }

      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[DB] Unexpected error while retrieving cross-tab contexts:', error)
    return []
  }
}

// Retrieve enabled cross-tab contexts
export async function getEnabledCrossTabContexts(): Promise<CrossTabContext[]> {
  const all = await getAllCrossTabContexts()
  return all.filter(ctx => ctx.enabled)
}

// Delete cross-tab context
export async function deleteCrossTabContext(id: string): Promise<void> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CROSS_TAB], 'readwrite')
      const objectStore = transaction.objectStore(STORE_CROSS_TAB)

      const request = objectStore.delete(id)

      request.onsuccess = () => {
        console.log('[DB] Cross-tab context deleted:', id)
        resolve()
      }

      request.onerror = () => {
        reject(request.error)
      }

      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[DB] Unexpected error while deleting cross-tab context:', error)
    throw error
  }
}

// Clear all cross-tab contexts
export async function clearAllCrossTabContexts(): Promise<void> {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CROSS_TAB], 'readwrite')
      const objectStore = transaction.objectStore(STORE_CROSS_TAB)

      const request = objectStore.clear()

      request.onsuccess = () => {
        console.log('[DB] Cross-tab contexts cleared')
        resolve()
      }

      request.onerror = () => {
        reject(request.error)
      }

      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[DB] Unexpected error while clearing cross-tab contexts:', error)
    throw error
  }
}
