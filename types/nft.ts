/**
 * NFT data transfer type definitions
 */

/**
 * NFT transfer request payload
 */
export interface NFTTransferData {
  transfer_type: 'single' | 'multiple'
  knowledge_bases: Array<{
    id: string
    title: string
    content: string
    created_at: number
    tokens: number
    metadata?: {
      language: string
      category?: string
      tags?: string[]
    }
  }>
  preferences: {
    merge_content: boolean
    language: string
    nft_collection?: string
    default_price?: number
  }
  timestamp: number
  source: string
  version: string
}

/**
 * NFT transfer response payload
 */
export interface NFTTransferResponse {
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
