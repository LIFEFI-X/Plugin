// knowledge base and context type definitions

/**
 * Knowledge base
 */
export interface KnowledgeBase {
  id: string                  // unique identifier (nanoid)
  title: string               // title provided by the user
  content: string             // content supporting long text
  enabled: boolean            // toggle state (up to three true)
  createdAt: number           // creation timestamp
  updatedAt: number           // updated timestamp
  tokens?: number             // estimated token count (optional)
}

/**
 * Cross-tab context
 */
export interface CrossTabContext {
  id: string                  // unique identifier
  text: string                // selected text
  sourceUrl: string           // source page URL
  sourceTitle: string         // source page title
  timestamp: number           // collection timestamp
  enabled: boolean            // whether the context is enabled
}

/**
 * AI action types
 */
export type AIAction = 'complete' | 'polish' | 'correct' | 'simplify' | 'expand'

/**
 * Context build result
 */
export interface ContextBuildResult {
  contextText: string         // concatenated context text
  enabledKBs: KnowledgeBase[] // enabled knowledge bases
  enabledContexts: CrossTabContext[] // enabled cross-tab contexts
  totalTokens: number         // total token count
}
