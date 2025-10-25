import { createApp } from 'vue'
import { createPinia } from 'pinia'
import browser from 'webextension-polyfill'
import { nanoid } from 'nanoid'
import ASoulPet from '@/components/ASoulPet.vue'
import HistorySidebar from '@/components/HistorySidebar.vue'
import ResponseModal from '@/components/ResponseModal.vue'
import CustomInputModal from '@/components/CustomInputModal.vue'
import InlineResponse from '@/components/InlineResponse.vue'
import { requestAI, getContext } from '@/utils/message'
import { useHistoryStore } from '@/stores/history'
import { getCaretPosition, getInputContext, insertTextAtCursor } from '@/utils/completion'
import { t, loadLanguage } from '@/utils/i18n'
import { handlePageActive, detectPlatform } from '@/utils/tracking'
import { getRecommendation, shouldShowRecommendation } from '@/utils/recommendations'
import type { HistoryRecord } from '@/types'
import type { AIProvider, AIModel } from '@/types/provider'
import type { CrossTabContext } from '@/types/knowledge'
import '@/assets/main.css'

// TypeScript declaration: chrome API
declare const chrome: any

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_end',
  async main() {
    console.log('lifefi content script loaded')
    
    // Load language settings
    await loadLanguage()
    console.log('[Content] Language loaded')
    
    // Prevent duplicate initialization
    if (document.getElementById('lifefi-assistant-root')) {
      console.warn('lifefi already initialized, skipping setup')
      return
    }
    
    try {
      initWriteBox()
      console.log('lifefi initialization completed')
    } catch (error) {
      console.error('lifefi initialization failed:', error)
    }
  },
})

function initWriteBox() {
  // Detect page language
  const detectLocale = (): 'zh-CN' | 'en' => {
    const lang = document.documentElement.lang || navigator.language
    // Default to English unless the language is explicitly Chinese
    return lang.startsWith('zh') ? 'zh-CN' : 'en'
  }
  // Default language is English
  const currentLocale: 'zh-CN' | 'en' = 'en'
  
  // Localized messages (currently English-only)
  const messages = {
    'zh-CN': {
      processFailed: 'Process failed',
      processComplete: 'Process complete',
      replaceTextFailed: 'Failed to replace text, please try again',
      removedFromHistory: 'Removed from history',
      historyCleared: 'History cleared',
      unknownError: 'Unknown error',
      aiProcessing: 'AI Processing...'
    },
    'en': {
      processFailed: 'Process failed',
      processComplete: 'Process complete',
      replaceTextFailed: 'Failed to replace text, please try again',
      removedFromHistory: 'Removed from history',
      historyCleared: 'History cleared',
      unknownError: 'Unknown error',
      aiProcessing: 'AI Processing...'
    }
  }
  
  const t = (key: string): string => {
    return messages[currentLocale][key as keyof typeof messages['en']] || key
  }

  // Create ASoul pet container
  const asoulPetContainer = document.createElement('div')
  asoulPetContainer.id = 'lifefi-asoul-pet-root'
  document.body.appendChild(asoulPetContainer)

  const sidebarContainer = document.createElement('div')
  sidebarContainer.id = 'lifefi-sidebar-root'
  document.body.appendChild(sidebarContainer)

  const responseModalContainer = document.createElement('div')
  responseModalContainer.id = 'lifefi-response-modal-root'
  document.body.appendChild(responseModalContainer)

  const customInputContainer = document.createElement('div')
  customInputContainer.id = 'lifefi-custom-input-root'
  document.body.appendChild(customInputContainer)

  const inlineResponseContainer = document.createElement('div')
  inlineResponseContainer.id = 'lifefi-inline-response-root'
  document.body.appendChild(inlineResponseContainer)

  // Create Pinia instance
  const pinia = createPinia()
  
  // Selected text used by custom input modal
  let savedCustomInputText = ''

  // Mount ASoul pet
  const asoulPetApp = createApp(ASoulPet)
  asoulPetApp.use(pinia)
  asoulPetApp.mount(asoulPetContainer)
  
  console.log('[ASoulPet] Companion initialized')

  // Mount response modal
  const responseModalApp = createApp(ResponseModal, {
    visible: false,
    content: '',
    loading: false,
    onClose: hideResponseModal
  })
  responseModalApp.use(pinia)
  responseModalApp.mount(responseModalContainer)

  // Mount custom input modal
  let customInputApp = createApp(CustomInputModal, {
    visible: false,
    selectedText: '',
    onSubmit: handleCustomInput,
    onClose: hideCustomInputModal
  })
  customInputApp.use(pinia)
  customInputApp.mount(customInputContainer)

  // Mount sidebar
  const sidebarApp = createApp(HistorySidebar, {
    visible: false,
    records: [],
    onClose: hideSidebar,
    onUndo: handleUndo,
    onClear: handleClearHistory
  })
  sidebarApp.use(pinia)
  sidebarApp.mount(sidebarContainer)

  // Create ghost text hint (Ghost Text)
  let ghostTextElement: HTMLElement | null = null
  let ghostHintElement: HTMLElement | null = null
  
  function createGhostTextElement() {
    const el = document.createElement('div')
    el.id = 'lifefi-ghost-text'
    el.style.cssText = `
      position: absolute;
      z-index: 2147483646;
      pointer-events: none;
      color: #9ca3af;
      opacity: 0.6;
      white-space: pre;
      display: none;
    `
    
    document.body.appendChild(el)
    return el
  }
  
  function createGhostHintElement() {
    const el = document.createElement('div')
    el.id = 'lifefi-ghost-hint'
    el.style.cssText = `
      position: absolute;
      z-index: 2147483647;
      pointer-events: none;
      background: #667eea;
      color: white;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 500;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: none;
      white-space: nowrap;
    `
    el.textContent = 'Tab'
    
    document.body.appendChild(el)
    return el
  }
  
  ghostTextElement = createGhostTextElement()
  ghostHintElement = createGhostHintElement()

  const historyStore = useHistoryStore()
  historyStore.loadHistory()
  historyStore.loadSettings()

  let currentSelection: Selection | null = null
  let currentRange: Range | null = null
  let currentInputElement: HTMLInputElement | HTMLTextAreaElement | null = null
  let currentInputSelection: { start: number; end: number; text: string } | null = null
  let currentEditableElement: HTMLElement | null = null
  let currentSuggestion = ''
  let completionVisible = false
  let currentInlineResponseInstance: any = null

  document.addEventListener('mouseup', handleTextSelection, true)
  document.addEventListener('keydown', handleKeyDown, true)
  
  document.addEventListener('contextmenu', handleContextMenu, true)
  
  document.addEventListener('focusin', handleFocusIn, true)
  document.addEventListener('focusout', handleFocusOut, true)
  document.addEventListener('input', handleInput, true)
  document.addEventListener('keydown', handleCompletionKeydown, true)
  
  window.addEventListener('resize', handleWindowResize)
  window.addEventListener('scroll', handleWindowScroll, true)
  
  console.log('✅ lifefi autocomplete feature started')
  console.log('📝 Supported features:')
  console.log('  - Selected text refinement (simplify / expand / translate)')
  console.log('  - Custom AI prompts (image upload supported)')
  console.log('  - Smart input suggestions')
  console.log('  - View history (Ctrl+Shift+H)')
  console.log(`💡 Current language: ${currentLocale}`)

  function handleTextSelection(event: MouseEvent) {
    const target = event.target as HTMLElement
    const isPetElement = target && (
      target.classList?.contains('asoul-pet-image') ||
      target.classList?.contains('asoul-pet-container') ||
      target.classList?.contains('message-bubble') ||
      target.classList?.contains('bait-image') ||
      target.closest('.asoul-pet-container')
    )
    
    console.log('[Selection] 📍 mouseup event target:', {
      className: target.className,
      tagName: target.tagName,
      isPet: target.classList?.contains('asoul-pet-image'),
      isPetElement,
      closest: target.closest('.asoul-pet-container') ? 'has .asoul-pet-container parent' : 'no pet parent'
    })
    
    if (isPetElement) {
      console.log('[Selection] ⏭️ Skipping pet selection event (no propagation block)')
      return
    }
    
    console.log('[Selection] ✅ Non-pet element, continuing text selection processing')
    
    setTimeout(() => {
      let selectedText = ''
      let rect: DOMRect | null = null
      
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        const start = target.selectionStart
        const end = target.selectionEnd
        
        console.log('[Selection] Input field diagnostics:', { start, end, tag: target.tagName })
        
        if (start !== null && end !== null && start !== end) {
          selectedText = target.value.substring(start, end).trim()
          console.log('[Selection] Input field text length:', selectedText.length)
          
          if (selectedText.length > 0 && selectedText.length <= 1000) {
            const inputRect = target.getBoundingClientRect()
            rect = inputRect
            
            currentInputElement = target
            currentInputSelection = {
              start: start,
              end: end,
              text: selectedText
            }
            currentSelection = window.getSelection()
            currentRange = null
            
            const toolbarWidth = 300
            const toolbarHeight = 50
            const margin = 10
            
            let x = rect.left + (rect.width / 2) - (toolbarWidth / 2)
            let y = rect.top - toolbarHeight - margin
            
            const viewportWidth = window.innerWidth
            const viewportHeight = window.innerHeight
            
            if (x < margin) {
              x = margin
            } else if (x + toolbarWidth > viewportWidth - margin) {
              x = viewportWidth - toolbarWidth - margin
            }
            
            if (y < margin) {
              y = rect.bottom + margin
            }
            
            if (y + toolbarHeight > viewportHeight - margin) {
              y = viewportHeight - toolbarHeight - margin
            }
            
            console.log('[Selection] ✅ Input field selection:', selectedText.substring(0, 20), { 
              x, y, 
              rect: { top: rect.top, bottom: rect.bottom, left: rect.left },
              viewport: { width: viewportWidth, height: viewportHeight }
            })
            return
          }
        }
      }
      
      const selection = window.getSelection()
      console.log('[Selection] Plain text check:', { hasSelection: !!selection, isCollapsed: selection?.isCollapsed })
      
      if (!selection || selection.isCollapsed) {
        console.log('[Selection] ❌ No selection or selection cleared')
        return
      }

      selectedText = selection.toString().trim()
      console.log('[Selection] Plain text length:', selectedText.length)
      
      if (selectedText.length === 0 || selectedText.length > 1000) {
        console.log('[Selection] ❌ Text length outside allowed range')
        return
      }

      currentSelection = selection
      currentRange = selection.getRangeAt(0).cloneRange()

      console.log('[Selection] ✅ Plain text selection:', selectedText.substring(0, 20))
    }, 10)
  }

  function handleKeyDown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'H') {
      event.preventDefault()
      toggleSidebar()
    }
  }

  let contextMenuVisible = false
  let contextMenuElement: HTMLElement | null = null
  
  function handleContextMenu(event: MouseEvent) {
    console.log('[ContextMenu] 📍 contextmenu event triggered')
    
    const selection = window.getSelection()
    if (!selection || selection.toString().trim().length === 0) {
      console.log('[ContextMenu] ⏭️ No selected text, skipping')
      removeContextMenu()
      return
    }
    
    const selectedText = selection.toString().trim()
    console.log('[ContextMenu] ✅ Selection detected, length:', selectedText.length)
    
    if (selectedText.length > 1000) {
      console.log('[ContextMenu] ⚠️ Text exceeds 1000 characters, skipping')
      return
    }
    
    event.preventDefault()
    console.log('[ContextMenu] 🚫 Default context menu prevented')
    
    removeContextMenu()
    
    const menu = document.createElement('div')
    menu.className = 'lifefi-context-menu'
    menu.style.cssText = `
      position: fixed;
      left: ${event.clientX}px;
      top: ${event.clientY}px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 8px 0;
      z-index: 2147483647;
      min-width: 180px;
      font-family: system-ui, -apple-system, sans-serif;
    `
    
    const createMenuItem = (text: string, emoji: string, handler: () => void) => {
      const item = document.createElement('div')
      item.className = 'lifefi-context-menu-item'
      item.textContent = `${emoji} ${text}`
      item.style.cssText = `
        padding: 10px 16px;
        cursor: pointer;
        font-size: 14px;
        color: #333;
        transition: background 0.2s;
      `
      
      item.addEventListener('mouseenter', () => {
        item.style.background = '#f5f5f5'
      })
      
      item.addEventListener('mouseleave', () => {
        item.style.background = 'transparent'
      })
      
      item.addEventListener('click', handler)
      return item
    }

  const addToContextItem = createMenuItem('Add to Context', '📎', async () => {
    await handleCollectSelection(selectedText)
    window.postMessage({
      type: 'LIFEFI_PET_MESSAGE',
      message: 'Got it! Added to context'
    }, '*')
    removeContextMenu()
  })

  const translateItem = createMenuItem('Translate', '🌐', async () => {
    console.log('[ContextMenu] 🌐 Translate clicked, text length:', selectedText.length)
    window.postMessage({
      type: 'LIFEFI_PET_AI_REQUEST',
      action: 'translate',
      text: selectedText
    }, '*')
    console.log('[ContextMenu] ✅ Translate message dispatched')
    removeContextMenu()
  })

  const chatItem = createMenuItem('Chat with LifeFi', '💬', async () => {
    console.log('[ContextMenu] 💬 AI chat clicked, text length:', selectedText.length)
    window.postMessage({
      type: 'LIFEFI_PET_AI_REQUEST',
      action: 'chat',
      text: selectedText
    }, '*')
    console.log('[ContextMenu] ✅ AI chat message dispatched')
    removeContextMenu()
  })

    menu.appendChild(addToContextItem)
    menu.appendChild(translateItem)
    menu.appendChild(chatItem)
    document.body.appendChild(menu)
    contextMenuElement = menu
    contextMenuVisible = true
    
    const closeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        removeContextMenu()
        document.removeEventListener('mousedown', closeMenu)
      }
    }
    
    setTimeout(() => {
      document.addEventListener('mousedown', closeMenu)
    }, 100)
  }
  
  function removeContextMenu() {
    if (contextMenuElement && contextMenuElement.parentNode) {
      contextMenuElement.parentNode.removeChild(contextMenuElement)
      contextMenuElement = null
      contextMenuVisible = false
    }
  }


  function toggleSidebar() {
    const sidebar = sidebarContainer.querySelector('.history-sidebar') as HTMLElement
    if (sidebar) {
      const isVisible = sidebar.style.display !== 'none'
      sidebar.style.display = isVisible ? 'none' : 'block'
    }
  }

  function hideSidebar() {
    const sidebar = sidebarContainer.querySelector('.history-sidebar') as HTMLElement
    if (sidebar) {
      sidebar.style.display = 'none'
    }
  }


  function replaceText(range: Range, newText: string) {
    try {
      range.deleteContents()

      const textNode = document.createTextNode(newText)
      range.insertNode(textNode)

      window.getSelection()?.removeAllRanges()
    } catch (error) {
      console.error('Failed to replace text:', error)
      showNotification(t('replaceTextFailed'), 'error')
    }
  }

  function replaceTextInInput(
    element: HTMLInputElement | HTMLTextAreaElement,
    selection: { start: number; end: number; text: string },
    newText: string
  ) {
    try {
      const value = element.value
      
      hideCompletion()
      
      element.value = value.substring(0, selection.start) + newText + value.substring(selection.end)
      
      const newCursorPos = selection.start + newText.length
      element.selectionStart = newCursorPos
      element.selectionEnd = newCursorPos
      
      element.dispatchEvent(new Event('input', { bubbles: true }))
      element.dispatchEvent(new Event('change', { bubbles: true }))
      
      element.focus()
      
      console.log('[TextReplace] ✅ Input field text replaced, cursor at:', newCursorPos)
    } catch (error) {
      console.error('[TextReplace] Input field replacement failed:', error)
      showNotification(t('replaceTextFailed'), 'error')
    }
  }

  async function handleUndo(id: string) {
    const record = historyStore.records.find(r => r.id === id)
    if (!record) return

    await historyStore.removeRecord(id)
    showNotification(t('removedFromHistory'), 'info')
  }

  async function handleClearHistory() {
    if (confirm('Are you sure you want to clear all history records?')) {
      await historyStore.clearHistory()
      showNotification(t('historyCleared'), 'info')
    }
  }

  function showLoadingIndicator() {
    const loader = document.createElement('div')
    loader.id = 'lifefi-loader'
    loader.innerHTML = `
      <div style="
        position: fixed !important;
        top: 20px !important;
        right: 20px !important;
        background: white !important;
        padding: 12px 20px !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        z-index: 2147483647 !important;
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="
          width: 16px;
          height: 16px;
          border: 2px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        "></div>
        <span style="font-size: 14px; color: #1f2937;">${t('aiProcessing')}</span>
      </div>
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `
    document.body.appendChild(loader)
  }

  function hideLoadingIndicator() {
    const loader = document.getElementById('lifefi-loader')
    if (loader) loader.remove()
  }

  function showResponseModal(content: string) {
    hideCompletion()
    const modal = responseModalContainer.querySelector('.lifefi-response-modal-backdrop') as HTMLElement
    if (modal) {
      modal.style.display = 'flex'
    }
    responseModalApp._instance?.proxy?.$forceUpdate()
  }

  function hideResponseModal() {
    const modal = responseModalContainer.querySelector('.lifefi-response-modal-backdrop') as HTMLElement
    if (modal) {
      modal.style.display = 'none'
    }
  }

  function showCustomInputModal(selectedText: string) {
    console.log('[CustomInput] Showing input modal, selection length:', selectedText.length)
    
    hideCompletion()
    
    customInputApp.unmount()
    customInputApp = createApp(CustomInputModal, {
      visible: true,
      selectedText: selectedText,
      onSubmit: handleCustomInput,
      onClose: hideCustomInputModal
    })
    customInputApp.use(pinia)
    customInputApp.mount(customInputContainer)
    
    console.log('[CustomInput] ✅ Remounted, selection:', selectedText.substring(0, 30))
  }

  function hideCustomInputModal() {
    const modal = customInputContainer.querySelector('.lifefi-custom-input-backdrop') as HTMLElement
    if (modal) {
      modal.style.display = 'none'
    }
  }

  async function handleCustomInput(data: { prompt: string }) {
    console.log('[CustomInput] Received submission:', {
      promptLength: data.prompt.length
    })
    
    // Clear autocomplete hint (Tab helper)
    hideCompletion()
    
    // Using saved selection
    const selectedText = savedCustomInputText
    
    console.log('[CustomInput] Using saved selection:', selectedText.substring(0, 50), 'as context input')

    // Display response modal and show loading state
    const modalBackdrop = document.createElement('div')
    modalBackdrop.className = 'lifefi-response-modal-backdrop'
    modalBackdrop.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; background: rgba(0,0,0,0.5) !important; z-index: 2147483646 !important; display: flex !important; align-items: center !important; justify-content: center !important;'
    document.body.appendChild(modalBackdrop)

    const modalApp = createApp(ResponseModal, {
      visible: true,
      content: '',
      loading: true,
      onClose: () => {
        modalApp.unmount()
        if (modalBackdrop.parentNode) {
          modalBackdrop.parentNode.removeChild(modalBackdrop)
        }
      }
    })
    modalApp.use(pinia)
    modalApp.mount(modalBackdrop)

    try {
      // Send custom AI request (selected text as context)
      const response = await requestAI({
        type: 'custom',
        text: selectedText,
        customPrompt: data.prompt
      })

      if (!response.success || !response.result) {
        const errorMsg = response.error || 'Unknown error'
        
        // Highlight extension-context-invalid errors
        if (errorMsg.includes('refresh')) {
          showNotification('⚠️ ' + errorMsg, 'error', 5000)
        } else {
          showNotification(`${t('processFailed')}: ${errorMsg}`, 'error')
        }
        
        modalApp.unmount()
        if (modalBackdrop.parentNode) {
          modalBackdrop.parentNode.removeChild(modalBackdrop)
        }
        return
      }

      modalApp.unmount()
      const newModalApp = createApp(ResponseModal, {
        visible: true,
        content: response.result,
        loading: false,
        onClose: () => {
          newModalApp.unmount()
          if (modalBackdrop.parentNode) {
            modalBackdrop.parentNode.removeChild(modalBackdrop)
          }
        }
      })
      newModalApp.use(pinia)
      newModalApp.mount(modalBackdrop)

      await historyStore.addRecord({
        originalText: selectedText,
        newText: response.result,
        type: 'custom',
        context: data.prompt,
        url: window.location.href,
        pageTitle: document.title
      })

      showNotification(t('processComplete'), 'success')
    } catch (error) {
      showNotification(`${t('processFailed')}: ${error instanceof Error ? error.message : t('unknownError')}`, 'error')
      modalApp.unmount()
      if (modalBackdrop.parentNode) {
        modalBackdrop.parentNode.removeChild(modalBackdrop)
      }
    }
  }

  function showNotification(message: string, type: 'success' | 'error' | 'info', duration: number = 3000) {
    const colors = {
      success: { bg: '#ecfdf5', border: '#10b981', text: '#065f46' },
      error: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
      info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' }
    }

    const color = colors[type]
    const notification = document.createElement('div')
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${color.bg};
        border: 1px solid ${color.border};
        color: ${color.text};
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
        word-wrap: break-word;
      ">
        ${message}
      </div>
      <style>
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
    `
    document.body.appendChild(notification)

    setTimeout(() => notification.remove(), duration)
  }


  function handleFocusIn(event: FocusEvent) {
    const target = event.target as HTMLElement
    if (isEditableElement(target)) {
      currentEditableElement = target
    }
  }

  function handleFocusOut(event: FocusEvent) {
    setTimeout(() => {
      if (document.activeElement !== currentEditableElement) {
        hideCompletion()
        console.log('[AutoComplete] Input blurred, clearing tab hint')
      }
    }, 100)
  }

  function isEditableElement(element: HTMLElement): boolean {
    return (
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLInputElement ||
      element.isContentEditable
    )
  }

  async function getProviderConfig() {
    try {
      console.log('[AutoComplete] Fetching configuration via messaging...')
      
      const response = await browser.runtime.sendMessage({
        type: 'GET_CONFIG'
      })
      
      if (!response || !response.success) {
        console.log('[AutoComplete] Configuration not available:', response?.error || 'no response')
        return null
      }
      
      const { providers, selectedModel } = response.data
      
      if (!selectedModel) {
        console.log('[AutoComplete] No model selected; please configure it in extension settings')
        return null
      }
      
      if (!providers || providers.length === 0) {
        console.log('[AutoComplete] Provider configuration not found')
        return null
      }
      
      const { providerId, modelId } = selectedModel
      const provider = providers.find((p: AIProvider) => p.id === providerId)
      
      if (!provider || !provider.enabled) {
        console.log('[AutoComplete] Provider not enabled')
        return null
      }
      
      const model = provider.models.find((m: AIModel) => m.id === modelId)
      if (!model) {
        console.log('[AutoComplete] Model does not exist')
        return null
      }
      
      console.log('[AutoComplete] ✅ Configuration retrieved successfully:', {
        providerId,
        modelId,
        apiUrl: provider.apiUrl,
        apiType: provider.apiType
      })
      
      return {
        apiUrl: provider.apiUrl,
        apiKey: provider.apiKey,
        apiType: provider.apiType,
        modelId: model.id,
        config: model.config
      }
    } catch (error) {
      console.error('[AutoComplete] Failed to obtain configuration:', error)
      return null
    }
  }

  async function generateAICompletion(context: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        const providerConfig = await getProviderConfig()
        
        if (!providerConfig) {
          console.warn('[AutoComplete] AI service not configured. Set up the DeepSeek API in settings first.')
          resolve('')
          return
        }
        
        let accumulated = ''
        let messageListener: ((message: any) => void) | null = null
        
        messageListener = (message: any) => {
          if (message.type === 'COMPLETION_CHUNK') {
            accumulated += message.chunk
            console.log('[AutoComplete] Received AI chunk:', message.chunk, 'total:', accumulated)
          } else if (message.type === 'COMPLETION_COMPLETE') {
            if (messageListener) {
              browser.runtime.onMessage.removeListener(messageListener)
            }
            console.log('[AutoComplete] AI completion complete, total length:', accumulated.length)
            resolve(accumulated)
          } else if (message.type === 'COMPLETION_ERROR') {
            if (messageListener) {
              browser.runtime.onMessage.removeListener(messageListener)
            }
            console.error('[AutoComplete] AI completion failed:', message.error)
            resolve('')
          }
        }
        
        browser.runtime.onMessage.addListener(messageListener)
        
        console.log('[AutoComplete] Sending AI completion request, context length:', context.length)
        browser.runtime.sendMessage({
          type: 'AI_COMPLETION',
          payload: { context, providerConfig }
        }).catch((error: any) => {
          if (messageListener) {
            browser.runtime.onMessage.removeListener(messageListener)
          }
          console.error('[AutoComplete] Failed to send request:', error)
          resolve('')
        })
        
        setTimeout(() => {
          if (messageListener) {
            browser.runtime.onMessage.removeListener(messageListener)
          }
          if (!accumulated) {
            console.warn('[AutoComplete] AI request timed out (15 seconds)')
            resolve('')
          } else {
            console.log('[AutoComplete] Timed out but partial results present:', accumulated)
            resolve(accumulated)
          }
        }, 15000)
        
      } catch (error) {
        console.error('[AutoComplete] AI completion encountered an exception:', error)
        resolve('')
      }
    })
  }

  let inputDebounceTimer: NodeJS.Timeout | null = null

  async function handleInput(event: Event) {
    const target = event.target as HTMLElement
    
    console.log('[AutoComplete] Input event fired', {
      tagName: target.tagName,
      isEditable: isEditableElement(target),
      value: (target as any).value || target.textContent?.substring(0, 50)
    })
    
    if (!isEditableElement(target)) {
      hideCompletion()
      return
    }

    currentEditableElement = target

    if (inputDebounceTimer) {
      clearTimeout(inputDebounceTimer)
    }

    inputDebounceTimer = setTimeout(async () => {
      const context = getInputContext(target)
      
      console.log('[AutoComplete] Fetched context:', context, 'length:', context.length)
      
      if (!context || context.trim().length === 0) {
        console.log('[AutoComplete] Context empty, skipping AI request')
        hideCompletion()
        return
      }
      
      try {
        const suggestion = await generateAICompletion(context)
        
        console.log('[AutoComplete] AI returned suggestion:', suggestion)
        
        if (suggestion && suggestion.trim().length > 0 && currentEditableElement === target) {
          currentSuggestion = suggestion
          const position = getCaretPosition(target)
          console.log('[AutoComplete] Showing completion hint', { suggestion, position })
          showCompletion(suggestion, position)
        } else {
          console.log('[AutoComplete] No valid suggestion or element changed')
          hideCompletion()
        }
      } catch (error) {
        console.error('[AutoComplete] Failed to generate completion:', error)
        hideCompletion()
      }
    }, 500)
  }

  function handleCompletionKeydown(event: KeyboardEvent) {
    if (event.key === 'Tab' && completionVisible && currentSuggestion) {
      event.preventDefault()
      acceptCompletion()
      return
    }

    if (event.key === 'Escape' && completionVisible) {
      event.preventDefault()
      rejectCompletion()
      return
    }

    if (completionVisible && !['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) {
      hideCompletion()
    }
  }

  function showCompletion(suggestion: string, position: { top: number; left: number }) {
    if (!ghostTextElement || !ghostHintElement || !currentEditableElement) return
    
    completionVisible = true
    console.log('[AutoComplete] 🎯 Showing ghost hint text', { suggestion, position })
    
    const inputStyle = window.getComputedStyle(currentEditableElement)
    
    ghostTextElement.style.fontFamily = inputStyle.fontFamily
    ghostTextElement.style.fontSize = inputStyle.fontSize
    ghostTextElement.style.fontWeight = inputStyle.fontWeight
    ghostTextElement.style.lineHeight = inputStyle.lineHeight
    ghostTextElement.style.letterSpacing = inputStyle.letterSpacing
    
    ghostTextElement.textContent = suggestion
    
    ghostTextElement.style.top = `${position.top}px`
    ghostTextElement.style.left = `${position.left}px`
    ghostTextElement.style.display = 'block'
    
    setTimeout(() => {
      const ghostRect = ghostTextElement!.getBoundingClientRect()
      ghostHintElement!.style.top = `${position.top - 2}px`
      ghostHintElement!.style.left = `${position.left + ghostRect.width + 8}px`
      ghostHintElement!.style.display = 'block'
    }, 10)
    
    console.log('[AutoComplete] ✅ Ghost text displayed')
  }

  function hideCompletion() {
    if (!ghostTextElement || !ghostHintElement) return
    
    completionVisible = false
    currentSuggestion = ''
    ghostTextElement.style.display = 'none'
    ghostHintElement.style.display = 'none'
    console.log('[AutoComplete] ❌ Ghost text hidden')
  }

  function acceptCompletion() {
    if (currentEditableElement && currentSuggestion) {
      console.log('[AutoComplete] ✅ Suggestion accepted:', currentSuggestion)
      insertTextAtCursor(currentEditableElement, currentSuggestion)
      hideCompletion()
    }
  }

  function rejectCompletion() {
    console.log('[AutoComplete] ❌ Suggestion dismissed')
    hideCompletion()
  }

  function updateCompletionPosition() {
    if (!completionVisible || !currentEditableElement || !ghostTextElement) return
    
    try {
      const position = getCaretPosition(currentEditableElement)
      if (!position) return
      
      ghostTextElement.style.top = `${position.top}px`
      ghostTextElement.style.left = `${position.left}px`
      
      if (ghostHintElement) {
        const ghostRect = ghostTextElement.getBoundingClientRect()
        ghostHintElement.style.top = `${position.top - 2}px`
        ghostHintElement.style.left = `${position.left + ghostRect.width + 8}px`
      }
    } catch (error) {
      console.error('[AutoComplete] Failed to update position:', error)
    }
  }

  function handleWindowResize() {
    if (completionVisible) {
      updateCompletionPosition()
      console.log('[AutoComplete] 🔄 Window resized, position refreshed')
    }
  }

  function handleWindowScroll() {
    if (completionVisible) {
      updateCompletionPosition()
    }
  }

  
  async function handleCollectSelection(text: string) {
    try {
      console.log('[CrossTab] Collected selected text:', text.substring(0, 50))
      
      const context: CrossTabContext = {
        id: nanoid(),
        text: text.trim(),
        sourceUrl: window.location.href,
        sourceTitle: document.title,
        timestamp: Date.now(),
        enabled: true
      }
      
      const response = await browser.runtime.sendMessage({
        type: 'SAVE_CROSS_TAB_CONTEXT',
        payload: context
      })
      
      if (response && response.success) {
        showCursorStyleHighlight(text)
        console.log('[CrossTab] ✅ Context saved')
      } else {
        console.error('[CrossTab] Save failed:', response?.error)
      }
    } catch (error) {
      console.error('[CrossTab] Collection failed:', error)
    }
  }
  
  function showCursorStyleHighlight(text: string) {
    const selection = window.getSelection()
    if (!selection || !selection.rangeCount) return
    
    try {
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      
      const highlight = document.createElement('div')
      highlight.className = 'lifefi-cursor-highlight'
      highlight.style.position = 'fixed'
      highlight.style.left = `${rect.left}px`
      highlight.style.top = `${rect.top - 40}px`
      highlight.style.zIndex = '2147483645'
      highlight.style.setProperty('z-index', '2147483645', 'important')
      
      highlight.innerHTML = `
        <div style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          gap: 8px;
          animation: fadeInDown 0.3s ease;
        ">
          <span style="font-size: 16px;">✅</span>
          <span>Added to context (${text.length} chars)</span>
        </div>
      `
      
      const style = document.createElement('style')
      style.textContent = `
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeOutUp {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(-10px);
          }
        }
      `
      document.head.appendChild(style)
      document.body.appendChild(highlight)
      
      setTimeout(() => {
        highlight.style.animation = 'fadeOutUp 0.3s ease'
        setTimeout(() => {
          document.body.removeChild(highlight)
          document.head.removeChild(style)
        }, 300)
      }, 2000)
    } catch (error) {
      console.error('[CrossTab] Failed to display highlight:', error)
    }
  }

  
  let trackingTimer: number | null = null
  let recommendationTimer: number | null = null
  
  async function startTracking() {
    const currentUrl = window.location.href
    const platform = detectPlatform(currentUrl)
    
    if (!platform) {
      console.log('[Tracking] Not a target platform, skipping')
      return
    }
    
    console.log('[Tracking] Started tracking:', platform)
    
    if (platform === 'x') {
      await checkRecommendationReward(currentUrl)
    }
    
    await updateTracking()
    
    if (trackingTimer) {
      clearInterval(trackingTimer)
    }
    
    trackingTimer = window.setInterval(async () => {
      await updateTracking()
    }, 1000)
    
    if (platform === 'x') {
      startRecommendationTimer()
    }
  }
  
  async function checkRecommendationReward(url: string) {
    try {
      const { isFromRecommendation, markRecommendationRewarded } = await import('@/utils/recommendations')
      const { updateGPTBalance } = await import('@/utils/reward')
      
      const click = await isFromRecommendation(url)
      
      if (click && !click.rewarded) {
        console.log('[Recommendation] Found unrewarded click:', click)
        
        setTimeout(async () => {
          const balance = await updateGPTBalance(200)
          await markRecommendationRewarded(click.id)
          
          console.log('[Recommendation] Reward granted! New balance:', balance.total)
          
          window.postMessage({
            type: 'LIFEFI_PET_MESSAGE',
            message: 'Great! You earned 200 GPT for checking out the recommendation! 🎉'
          }, '*')
          
          window.postMessage({
            type: 'LIFEFI_PET_REWARD_ANIMATION',
            reward: 200
          }, '*')
          
          const event = new CustomEvent('task-reward-claimed', {
            detail: {
              reward: 200,
              balance: balance.total
            }
          })
          window.dispatchEvent(event)
        }, 2000)
      }
    } catch (error) {
      console.error('[Recommendation] Failed to check reward:', error)
    }
  }
  
  function startRecommendationTimer() {
    if (recommendationTimer) {
      clearInterval(recommendationTimer)
    }
    
    recommendationTimer = window.setInterval(() => {
      if (shouldShowRecommendation()) {
        const recommendation = getRecommendation()
        console.log('[Recommendation] Showing recommendation:', recommendation)
        
        window.postMessage({
          type: 'LIFEFI_PET_RECOMMENDATION',
          recommendation
        }, '*')
      }
    }, 30000)
    
    setTimeout(() => {
      const recommendation = getRecommendation()
      console.log('[Recommendation] First recommendation:', recommendation)
      
      window.postMessage({
        type: 'LIFEFI_PET_RECOMMENDATION',
        recommendation
      }, '*')
    }, 20000)
  }
  
  function stopRecommendationTimer() {
    if (recommendationTimer) {
      clearInterval(recommendationTimer)
      recommendationTimer = null
      console.log('[Recommendation] Stopped recommendation timer')
    }
  }
  
  async function updateTracking() {
    try {
      const currentUrl = window.location.href
      const result = await handlePageActive(currentUrl)
      
      if (result.task && result.task.isActive) {
        console.log('[Tracking] Task active:', {
          platform: result.task.platform,
          duration: result.task.currentDuration,
          nextMilestone: result.nextMilestone
        })
        
        if (result.nextMilestone && !result.rewardClaimed) {
          const countdown = result.nextMilestone.duration - result.task.currentDuration
          
          if (countdown > 0) {
            window.postMessage({
              type: 'LIFEFI_PET_COUNTDOWN',
              platform: result.task.platform,
              countdown: countdown,
              reward: result.nextMilestone.reward
            }, '*')
          }
        }
        
        if (result.rewardClaimed) {
          console.log('[Tracking] Reward claimed!', result.rewardClaimed)
          
          const event = new CustomEvent('task-reward-claimed', {
            detail: {
              reward: result.rewardClaimed.reward,
              balance: result.task.currentDuration
            }
          })
          window.dispatchEvent(event)
          
          window.postMessage({
            type: 'LIFEFI_PET_MESSAGE',
            message: `Congrats! You earned ${result.rewardClaimed.reward} GPT! 🎉`
          }, '*')
          
          window.postMessage({
            type: 'LIFEFI_PET_REWARD_ANIMATION',
            reward: result.rewardClaimed.reward
          }, '*')
        }
      } else {
        window.postMessage({
          type: 'LIFEFI_PET_COUNTDOWN',
          platform: '',
          countdown: 0,
          reward: 0
        }, '*')
      }
    } catch (error) {
      console.error('[Tracking] Update failed:', error)
    }
  }
  
  function stopTracking() {
    if (trackingTimer) {
      clearInterval(trackingTimer)
      trackingTimer = null
      console.log('[Tracking] Stopped tracking')
    }
    stopRecommendationTimer()
  }
  
  function handleVisibilityChange() {
    if (document.hidden) {
      console.log('[Tracking] Page hidden, pausing tracking')
      stopTracking()
    } else {
      console.log('[Tracking] Page visible, resuming tracking')
      startTracking()
    }
  }
  
  document.addEventListener('visibilitychange', handleVisibilityChange)
  
  startTracking()
  
  console.log('[Content] Initialization complete')
  console.log('[Content] Visit tracking started')
}
