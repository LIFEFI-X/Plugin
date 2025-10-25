import type { KnowledgeBase } from '@/types/knowledge'
import { t } from './i18n'
import browser from 'webextension-polyfill'

// API configuration
const API_BASE_URL = 'https://api.lifefi.io/api'

/**
 * NFT transfer response contract
 */
interface NFTTransferResponse {
  code: number
  message: string
  data: {
    transferId: string
    knowledgeCount: number
    totalSize: number
    url: string
  }
  timestamp: number
}

/**
 * Create an NFT transfer payload
 * @param knowledgeBases selected knowledge bases
 * @param language active locale
 * @returns Promise<NFTTransferResponse>
 */
export async function createNFTTransfer(
  knowledgeBases: KnowledgeBase[],
  language: string = 'en'
): Promise<NFTTransferResponse> {
  // Validate selection
  if (!knowledgeBases || knowledgeBases.length === 0) {
    throw new Error(t('nft.min_selection'))
  }

  if (knowledgeBases.length > 5) {
    throw new Error(t('nft.max_selection'))
  }

  // Compose request payload
  const requestData = {
    knowledgeBases: knowledgeBases.map(kb => ({
      id: kb.id,
      title: kb.title,
      content: kb.content,
      created_at: Math.floor(kb.createdAt / 1000), // convert to seconds
      tokens: kb.tokens || 0,
      metadata: {
        language
      }
    })),
    preferences: {
      merge_content: false,
      language
    }
  }

  console.log('[NFT] Creating transfer, knowledge base count:', knowledgeBases.length)

  try {
    const response = await fetch(`${API_BASE_URL}/extension/transfer/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result: NFTTransferResponse = await response.json()

    if (result.code !== 200) {
      throw new Error(result.message || t('nft.transfer_failed'))
    }

    console.log('[NFT] Transfer created successfully:', result.data.transferId)
    return result
  } catch (error) {
    console.error('[NFT] Failed to create transfer:', error)

    // Network level error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error. Please check your internet connection.')
    }

    // Re-throw other errors
    throw error
  }
}

/**
 * Open NFT transfer page
 * @param url page URL
 */
export async function openNFTCreationPage(url: string): Promise<void> {
  try {
    // Use Browser API to open a new tab
    await browser.tabs.create({ url })
    console.log('[NFT] Opened transfer page:', url)
  } catch (error) {
    console.error('[NFT] Failed to open transfer page:', error)
    throw new Error('Failed to open NFT creation page')
  }
}
