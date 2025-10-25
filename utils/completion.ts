// Intelligent completion utility functions
// Note: The actual AI completion logic is implemented in content.ts (generateAICompletion)
// This module only provides helper utilities

// Get caret position
export function getCaretPosition(element: HTMLElement): { top: number; left: number } {
  try {
    // Use a specialized approach for input and textarea
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const rect = element.getBoundingClientRect()
      const style = window.getComputedStyle(element)
      
      // Create measurement element
      const measure = document.createElement('span')
      measure.style.cssText = `
        position: absolute;
        visibility: hidden;
        white-space: pre;
        font-family: ${style.fontFamily};
        font-size: ${style.fontSize};
        font-weight: ${style.fontWeight};
        letter-spacing: ${style.letterSpacing};
      `
      
      // Retrieve text before the caret
      const cursorPos = element.selectionStart || 0
      const textBeforeCursor = element.value.substring(0, cursorPos)
      measure.textContent = textBeforeCursor || ' '
      
      document.body.appendChild(measure)
      const textWidth = measure.getBoundingClientRect().width
      document.body.removeChild(measure)
      
      // Calculate padding
      const paddingLeft = parseFloat(style.paddingLeft) || 0
      const paddingTop = parseFloat(style.paddingTop) || 0
      
      const position = {
        top: rect.top + window.scrollY + paddingTop,
        left: rect.left + window.scrollX + paddingLeft + textWidth
      }
      
      console.log('[AutoComplete] Input/Textarea caret position:', position, 'text width:', textWidth)
      return position
    }
    
    // For contenteditable elements, rely on selection
    const selection = window.getSelection()
    if (!selection || !selection.rangeCount) {
      const rect = element.getBoundingClientRect()
      return {
        top: rect.top + window.scrollY + rect.height,
        left: rect.left + window.scrollX
      }
    }

    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    
    const position = {
      top: rect.top + window.scrollY + rect.height + 2,
      left: rect.left + window.scrollX
    }
    
    console.log('[AutoComplete] ContentEditable caret position:', position)
    return position
  } catch (error) {
    console.error('[AutoComplete] Failed to get caret position:', error)
    const rect = element.getBoundingClientRect()
    return {
      top: rect.top + window.scrollY + rect.height,
      left: rect.left + window.scrollX
    }
  }
}

// Get the current input context
export function getInputContext(element: HTMLElement, maxLength = 200): string {
  let text = ''
  
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    text = element.value
    
    // Some input types (email, number, search, etc.) do not support selectionStart
    // If selectionStart is null, fall back to value length as the caret position
    let cursorPos = element.selectionStart
    if (cursorPos === null || cursorPos === undefined) {
      cursorPos = text.length
      console.log('[getInputContext] selectionStart unsupported, using value.length:', cursorPos)
    }
    
    console.log('[getInputContext] Input element:', {
      tagName: element.tagName,
      type: (element as HTMLInputElement).type,
      value: text,
      valueLength: text.length,
      cursorPos,
      selectionStart: element.selectionStart,
      selectionEnd: element.selectionEnd
    })
    
    // Retrieve text before the caret
    text = text.substring(Math.max(0, cursorPos - maxLength), cursorPos)
    console.log('[getInputContext] After slicing:', text, 'length:', text.length)
  } else if (element.isContentEditable) {
    text = element.textContent || ''
    console.log('[getInputContext] ContentEditable:', text, 'length:', text.length)
    // Simplified handling: capture the trailing text
    text = text.substring(Math.max(0, text.length - maxLength))
  }
  
  const trimmedText = text.trim()
  console.log('[getInputContext] Final output:', trimmedText, 'length:', trimmedText.length)
  return trimmedText
}

// Insert text into the element
export function insertTextAtCursor(element: HTMLElement, text: string) {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    try {
      const start = element.selectionStart || element.value.length
      const end = element.selectionEnd || element.value.length
      const value = element.value
      
      // Insert text at the caret position
      element.value = value.substring(0, start) + text + value.substring(end)
      
      // Try to set the caret position (unsupported by some inputs)
      try {
        element.selectionStart = element.selectionEnd = start + text.length
      } catch (e) {
        console.log('[AutoComplete] This input type does not support caret positioning:', element.type)
      }
      
      // Dispatch an input event
      element.dispatchEvent(new Event('input', { bubbles: true }))
      element.dispatchEvent(new Event('change', { bubbles: true }))
      
      console.log('[AutoComplete] ✅ Text inserted:', text)
    } catch (error) {
      console.error('[AutoComplete] Failed to insert text:', error)
    }
  } else if (element.isContentEditable) {
    const selection = window.getSelection()
    if (!selection || !selection.rangeCount) return
    
    const range = selection.getRangeAt(0)
    range.deleteContents()
    range.insertNode(document.createTextNode(text))
    range.collapse(false)
    
    // Dispatch an input event
    element.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

