// Context builders
// Combine knowledge bases and cross-tab context to build messages for AI requests

import type { KnowledgeBase, CrossTabContext } from '@/types/knowledge'
import { estimateTokens, truncateToTokenBudget } from './token'

/**
 * Build completion context as plain text (used for token budgeting previews)
 */
export function buildCompletionContext(
  userInput: string,
  knowledgeBases: KnowledgeBase[],
  crossTabContexts: CrossTabContext[],
  maxContextTokens: number = 2000
): string {
  let contextText = ''
  let currentTokens = 0

  // User input is counted first because it will be appended separately
  const userInputTokens = estimateTokens(userInput)
  console.log('[Context] User input tokens:', userInputTokens)

  // 1. Add knowledge base content (in order, up to three items)
  if (knowledgeBases.length > 0) {
    contextText += '## Reference Knowledge Bases\n\n'

    for (const kb of knowledgeBases.slice(0, 3)) {
      const kbTokens = kb.tokens || estimateTokens(kb.content)

      if (currentTokens + kbTokens <= maxContextTokens) {
        contextText += `### ${kb.title}\n${kb.content}\n\n`
        currentTokens += kbTokens
        console.log('[Context] Added knowledge base:', kb.title, kbTokens, 'tokens')
      } else {
        // Truncate knowledge base content if the budget allows
        const remaining = maxContextTokens - currentTokens
        if (remaining > 50) {
          const truncated = truncateToTokenBudget(kb.content, remaining)
          contextText += `### ${kb.title}\n${truncated}\n\n`
          currentTokens = maxContextTokens
          console.log('[Context] Truncated knowledge base:', kb.title, remaining, 'tokens')
        }
        break
      }
    }
  }

  // 2. Add cross-tab context (in reverse chronological order)
  if (crossTabContexts.length > 0 && currentTokens < maxContextTokens) {
    contextText += '## Reference Context\n\n'

    for (const ctx of crossTabContexts) {
      const ctxTokens = estimateTokens(ctx.text)

      if (currentTokens + ctxTokens <= maxContextTokens) {
        contextText += `- Source: ${ctx.sourceTitle || ctx.sourceUrl}\n  ${ctx.text}\n\n`
        currentTokens += ctxTokens
        console.log('[Context] Added cross-tab context:', ctxTokens, 'tokens')
      } else {
        // Truncate cross-tab context if the budget allows
        const remaining = maxContextTokens - currentTokens
        if (remaining > 30) {
          const truncated = truncateToTokenBudget(ctx.text, remaining)
          contextText += `- Source: ${ctx.sourceTitle || ctx.sourceUrl}\n  ${truncated}\n\n`
          currentTokens = maxContextTokens
          console.log('[Context] Truncated cross-tab context:', remaining, 'tokens')
        }
        break
      }
    }
  }

  console.log('[Context] Context tokens total:', currentTokens)
  return contextText.trim()
}

/**
 * Build completion messages in Chat Completions format
 * Knowledge bases and cross-tab context are sent as assistant messages
 */
export function buildCompletionMessages(
  userInput: string,
  knowledgeBases: KnowledgeBase[],
  crossTabContexts: CrossTabContext[]
): Array<{ role: string; content: string }> {
  const systemPrompt = `You are an intelligent text completion assistant. Based on the user's current input and reference materials, provide concise and natural completion suggestions.

[IMPORTANT RULES]
1. Output the completion content directly without any explanations, notes, or formatting markers
2. The completion should naturally continue from the user's input, as if the user wrote it themselves
3. Reference materials are for background knowledge only - don't quote or explain them
4. Keep completions within 1-2 sentences
5. Maintain consistent style and terminology with the reference materials
6. Don't output words like "suggestion", "completion", "could be written as", etc.`

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt }
  ]

  // Add knowledge bases as assistant messages (max 3)
  const enabledKBs = knowledgeBases.filter(kb => kb.enabled).slice(0, 3)
  for (const kb of enabledKBs) {
    messages.push({
      role: 'assistant',
      content: `[Knowledge Base: ${kb.title}]\n${kb.content}`
    })
    console.log('[Messages] Added knowledge base message:', kb.title)
  }

  // Add cross-tab contexts as assistant messages
  const enabledCtxs = crossTabContexts.filter(ctx => ctx.enabled)
  for (const ctx of enabledCtxs) {
    messages.push({
      role: 'assistant',
      content: `[Reference: ${ctx.sourceTitle || ctx.sourceUrl}]\n${ctx.text}`
    })
    console.log('[Messages] Added cross-tab context message:', ctx.sourceTitle || ctx.sourceUrl)
  }

  // Add user input
  messages.push({
    role: 'user',
    content: `User's current input:\n${userInput}\n\nProvide a completion suggestion:`
  })

  console.log('[Messages] Total completion messages:', messages.length)
  return messages
}

/**
 * Build text processing messages (polish/correct/simplify/expand/translate/custom)
 * Knowledge bases and cross-tab context are sent as assistant messages
 */
export function buildTextProcessMessages(
  action: 'polish' | 'correct' | 'simplify' | 'expand' | 'translate' | 'custom',
  selectedText: string,
  knowledgeBases: KnowledgeBase[],
  crossTabContexts: CrossTabContext[],
  customPrompt?: string
): Array<{ role: string; content: string }> {
  const actionPrompts = {
    polish: 'Polish the following text to make it more fluent and elegant while keeping the original meaning. Output only the polished text without any explanations, notes, or formatting markers:',
    correct: 'Correct grammar, spelling, and expression errors in the following text. Output only the corrected text without any explanations, notes, or formatting markers:',
    simplify: 'Simplify the following text to make it more concise and clear. Output only the simplified text without any explanations, notes, or formatting markers:',
    expand: 'Expand the following text by adding details and depth to make it more comprehensive. Output only the expanded text without any explanations, notes, or formatting markers:',
    translate: 'Translate the following text to provide a bilingual comparison (Chinese-English). If the text is in Chinese, translate to English and show both. If in English, translate to Chinese and show both. Format as: Original | Translation. Output only the translation without any explanations:',
    custom: '' // custom prompts will directly use customPrompt
  }

  const systemPrompt = `You are a professional text processing assistant. Process the user's text according to the style and context of the reference materials.

[IMPORTANT RULES]
1. Output the processed text directly without any explanations, notes, or prefixes
2. Don't output extra content like "Rewrite notes", "After polishing", "Modification suggestions", etc.
3. Don't use quotes, dashes, or other formatting markers
4. Return only the final text result, keeping style and tone consistent with the reference materials`

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt }
  ]

  // Add knowledge bases as assistant messages (max 3)
  const enabledKBs = knowledgeBases.filter(kb => kb.enabled).slice(0, 3)
  for (const kb of enabledKBs) {
    messages.push({
      role: 'assistant',
      content: `[Knowledge Base: ${kb.title}]\n${kb.content}`
    })
    console.log('[Messages] Added knowledge base message:', kb.title)
  }

  // Add cross-tab contexts as assistant messages
  const enabledCtxs = crossTabContexts.filter(ctx => ctx.enabled)
  for (const ctx of enabledCtxs) {
    messages.push({
      role: 'assistant',
      content: `[Reference: ${ctx.sourceTitle || ctx.sourceUrl}]\n${ctx.text}`
    })
    console.log('[Messages] Added cross-tab context message:', ctx.sourceTitle || ctx.sourceUrl)
  }

  // Add user request
  if (action === 'custom' && customPrompt) {
    // Custom prompt: use user's prompt plus selected text as context
    messages.push({
      role: 'user',
      content: `${customPrompt}\n\n[Context - Selected Text]:\n${selectedText}`
    })
    console.log('[Messages] Added custom message with selected text as context')
  } else {
    messages.push({
      role: 'user',
      content: `${actionPrompts[action]}\n\n${selectedText}`
    })
  }

  console.log('[Messages] Total text processing messages:', messages.length)
  return messages
}
