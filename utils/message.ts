import browser from 'webextension-polyfill'
import type { AIRequest, AIResponse } from '@/types'

// Check whether the extension context is still valid
function isExtensionContextValid(): boolean {
  try {
    // Attempt to access runtime.id; if the context is invalid this throws
    return !!browser.runtime?.id
  } catch (error) {
    return false
  }
}

// Send AI request to the background script
export async function requestAI(request: AIRequest): Promise<AIResponse> {
  try {
    // Verify extension context
    if (!isExtensionContextValid()) {
      console.error('[AI] Extension context invalidated, please refresh the page')
      return {
        success: false,
        error: 'Extension context invalidated. Refresh the page and try again.'
      }
    }

    const response = await browser.runtime.sendMessage({
      type: 'AI_REQUEST',
      payload: request
    })

    return response
  } catch (error) {
    console.error('AI request failed:', error)

    // Special handling for invalidated extension contexts
    if (error instanceof Error && error.message.includes('Extension context invalidated')) {
      return {
        success: false,
        error: 'Extension context invalidated. Refresh the page and try again.'
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Extract page context around the current selection
export function getContext(selection: Selection, maxLength = 500): string {
  if (!selection.rangeCount) return ''

  const range = selection.getRangeAt(0)
  const container = range.commonAncestorContainer
  const parentElement = container.nodeType === Node.TEXT_NODE
    ? container.parentElement
    : (container as Element)

  if (!parentElement) return ''

  // Use the parent element's text content as context
  let context = parentElement.textContent || ''

  // If it's too long, keep the portion around the selected text
  if (context.length > maxLength) {
    const selectedText = selection.toString()
    const selectedIndex = context.indexOf(selectedText)

    if (selectedIndex !== -1) {
      const start = Math.max(0, selectedIndex - maxLength / 2)
      const end = Math.min(context.length, selectedIndex + selectedText.length + maxLength / 2)
      context = context.substring(start, end)
    } else {
      context = context.substring(0, maxLength)
    }
  }

  return context.trim()
}
