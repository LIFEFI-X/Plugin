// X (Twitter) recommendation system
import browser from 'webextension-polyfill'

export interface XRecommendation {
  id: string
  type: 'account' | 'post'
  title: string
  description: string
  url: string
  author?: string
  timestamp?: number
  avatar?: string
}

// Recommended X accounts and posts
const RECOMMENDED_ACCOUNTS = [
  {
    id: 'solana',
    username: '@solana',
    name: 'Solana',
    url: 'https://x.com/solana',
    description: 'Fast, decentralized blockchain. Build for growth.',
    category: 'blockchain'
  },
  {
    id: 'vitalik',
    username: '@VitalikButerin',
    name: 'Vitalik Buterin',
    url: 'https://x.com/VitalikButerin',
    description: 'Ethereum co-founder. Blockchain researcher.',
    category: 'blockchain'
  },
  {
    id: 'elonmusk',
    username: '@elonmusk',
    name: 'Elon Musk',
    url: 'https://x.com/elonmusk',
    description: 'CEO of Tesla, SpaceX, and X (Twitter)',
    category: 'tech'
  },
  {
    id: 'openai',
    username: '@OpenAI',
    name: 'OpenAI',
    url: 'https://x.com/OpenAI',
    description: 'Creating safe AGI that benefits all of humanity',
    category: 'ai'
  },
  {
    id: 'github',
    username: '@github',
    name: 'GitHub',
    url: 'https://x.com/github',
    description: 'Where the world builds software',
    category: 'dev'
  },
  {
    id: 'vercel',
    username: '@vercel',
    name: 'Vercel',
    url: 'https://x.com/vercel',
    description: 'Develop. Preview. Ship. For the best frontend teams',
    category: 'dev'
  },
  {
    id: 'reactjs',
    username: '@reactjs',
    name: 'React',
    url: 'https://x.com/reactjs',
    description: 'The library for web and native user interfaces',
    category: 'dev'
  },
  {
    id: 'vuejs',
    username: '@vuejs',
    name: 'Vue.js',
    url: 'https://x.com/vuejs',
    description: 'The Progressive JavaScript Framework',
    category: 'dev'
  },
  {
    id: 'tailwindcss',
    username: '@tailwindcss',
    name: 'Tailwind CSS',
    url: 'https://x.com/tailwindcss',
    description: 'A utility-first CSS framework',
    category: 'dev'
  },
  {
    id: 'chrome_devs',
    username: '@ChromiumDev',
    name: 'Chrome for Developers',
    url: 'https://x.com/ChromiumDev',
    description: 'News and updates from the Chrome team',
    category: 'dev'
  }
]

// Fetch recommendation
export function getRecommendation(): XRecommendation {
  // Recommend only Solana accounts
  const solanaAccount = RECOMMENDED_ACCOUNTS.find(account => account.id === 'solana')

  if (!solanaAccount) {
    // Fallback to the first entry when none found
    const account = RECOMMENDED_ACCOUNTS[0]
    return {
      id: account.id,
      type: 'account',
      title: account.name,
      description: `${account.username} - ${account.description}`,
      url: account.url,
      author: account.username
    }
  }

  return {
    id: solanaAccount.id,
    type: 'account',
    title: solanaAccount.name,
    description: `${solanaAccount.username} - ${solanaAccount.description}`,
    url: solanaAccount.url,
    author: solanaAccount.username
  }
}

// Fetch multiple recommendations
export function getMultipleRecommendations(count: number = 3): XRecommendation[] {
  const shuffled = [...RECOMMENDED_ACCOUNTS].sort(() => Math.random() - 0.5)
  const picked = shuffled.slice(0, count)

  return picked.map(account => ({
    id: account.id,
    type: 'account',
    title: account.name,
    description: `${account.username} - ${account.description}`,
    url: account.url,
    author: account.username
  }))
}

// Fetch recommendations by category
export function getRecommendationsByCategory(category: string, count: number = 3): XRecommendation[] {
  const filtered = RECOMMENDED_ACCOUNTS.filter(account => account.category === category)
  const limited = filtered.slice(0, count)

  return limited.map(account => ({
    id: account.id,
    type: 'account',
    title: account.name,
    description: `${account.username} - ${account.description}`,
    url: account.url,
    author: account.username
  }))
}

// Determine whether to show a recommendation (every 30 seconds)
const RECOMMENDATION_INTERVAL = 30 // seconds
let lastRecommendationTime = 0

export function shouldShowRecommendation(): boolean {
  const now = Date.now()
  if (now - lastRecommendationTime >= RECOMMENDATION_INTERVAL * 1000) {
    lastRecommendationTime = now
    return true
  }
  return false
}

// Reset recommendation timer
export function resetRecommendationTimer() {
  lastRecommendationTime = 0
}

// Recommendation click tracking
const STORAGE_KEY = 'recommendation_clicks'

export interface RecommendationClick {
  id: string
  url: string
  timestamp: number
  rewarded: boolean
}

// Persist recommendation click records
export async function saveRecommendationClick(id: string, url: string): Promise<void> {
  try {
    const { default: browser } = await import('webextension-polyfill')
    const result = await browser.storage.local.get(STORAGE_KEY)
    const clicks: RecommendationClick[] = result[STORAGE_KEY]
      ? JSON.parse(result[STORAGE_KEY])
      : []

    clicks.push({
      id,
      url,
      timestamp: Date.now(),
      rewarded: false
    })

    // Keep only the most recent 100 entries
    if (clicks.length > 100) {
      clicks.splice(0, clicks.length - 100)
    }

    await browser.storage.local.set({
      [STORAGE_KEY]: JSON.stringify(clicks)
    })

    console.log('[Recommendation] Click saved:', { id, url })
  } catch (error) {
    console.error('[Recommendation] Failed to save click:', error)
  }
}

// Check whether the URL originates from a recommendation
export async function isFromRecommendation(url: string): Promise<RecommendationClick | null> {
  try {
    const { default: browser } = await import('webextension-polyfill')
    const result = await browser.storage.local.get(STORAGE_KEY)
    const clicks: RecommendationClick[] = result[STORAGE_KEY]
      ? JSON.parse(result[STORAGE_KEY])
      : []

    // Check clicks within the last five minutes
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    const recentClick = clicks.find(click =>
      !click.rewarded &&
      click.timestamp > fiveMinutesAgo &&
      url.includes(click.url.split('?')[0]) // ignore query parameters
    )

    return recentClick || null
  } catch (error) {
    console.error('[Recommendation] Failed to check click:', error)
    return null
  }
}

// Mark recommendation as rewarded
export async function markRecommendationRewarded(clickId: string): Promise<void> {
  try {
    const { default: browser } = await import('webextension-polyfill')
    const result = await browser.storage.local.get(STORAGE_KEY)
    const clicks: RecommendationClick[] = result[STORAGE_KEY]
      ? JSON.parse(result[STORAGE_KEY])
      : []

    const click = clicks.find(c => c.id === clickId)
    if (click) {
      click.rewarded = true
      await browser.storage.local.set({
        [STORAGE_KEY]: JSON.stringify(clicks)
      })
      console.log('[Recommendation] Marked as rewarded:', clickId)
    }
  } catch (error) {
    console.error('[Recommendation] Failed to mark as rewarded:', error)
  }
}

// Get recommendation icon category (used to display different icons)
export function getRecommendationIcon(category?: string): string {
  switch (category) {
    case 'blockchain':
      return '🪙'
    case 'ai':
      return '🤖'
    case 'dev':
      return '💻'
    case 'tech':
      return '🚀'
    default:
      return '⭐'
  }
}
