import browser from 'webextension-polyfill'
import type { VisitSession, Task } from '@/types/task'
import { getTasks, updateTaskProgress, claimMilestone } from './reward'

// session storage key
const SESSION_KEY = 'visit_session'

// detect whether the current page belongs to a supported platform
export function detectPlatform(url: string): 'x' | 'youtube' | null {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    
    // detect X (Twitter)
    if (hostname === 'x.com' || hostname === 'www.x.com' || 
        hostname === 'twitter.com' || hostname === 'www.twitter.com') {
      return 'x'
    }
    
    // detect YouTube
    if (hostname === 'youtube.com' || hostname === 'www.youtube.com' ||
        hostname === 'm.youtube.com') {
      return 'youtube'
    }
    
    return null
  } catch (error) {
    console.error('[Tracking] URL parsing failed:', error)
    return null
  }
}

/**
 * Retrieve the current session
 */
export async function getCurrentSession(): Promise<VisitSession | null> {
  try {
    const result = await browser.storage.local.get(SESSION_KEY)
    if (result[SESSION_KEY]) {
      return JSON.parse(result[SESSION_KEY])
    }
    return null
  } catch (error) {
    console.error('[Tracking] Failed to retrieve session:', error)
    return null
  }
}

/**
 * Persist the session
 */
export async function saveSession(session: VisitSession | null): Promise<void> {
  try {
    if (session) {
      await browser.storage.local.set({
        [SESSION_KEY]: JSON.stringify(session)
      })
    } else {
      await browser.storage.local.remove(SESSION_KEY)
    }
  } catch (error) {
    console.error('[Tracking] Failed to save session:', error)
  }
}

/**
 * Start a new session
 */
export async function startSession(platform: 'x' | 'youtube', url: string): Promise<VisitSession> {
  const session: VisitSession = {
    platform,
    startTime: Date.now(),
    lastActiveTime: Date.now(),
    duration: 0,
    url
  }
  
  await saveSession(session)
  console.log('[Tracking] Session started:', platform)
  
  return session
}

/**
 * Update session activity timestamps
 */
export async function updateSessionActivity(): Promise<VisitSession | null> {
  const session = await getCurrentSession()
  if (!session) return null
  
  const now = Date.now()
  const timeSinceLastActive = (now - session.lastActiveTime) / 1000
  
  // treat session as interrupted if inactive for more than 60 seconds
  if (timeSinceLastActive > 60) {
    console.log('[Tracking] Session interrupted (inactive over 60 seconds)')
    return session
  }
  
  // update accumulated duration (seconds)
  session.duration = Math.floor((now - session.startTime) / 1000)
  session.lastActiveTime = now
  
  await saveSession(session)
  
  return session
}

/**
 * End the session
 */
export async function endSession(): Promise<void> {
  await saveSession(null)
  console.log('[Tracking] Session ended')
}

/**
 * Fetch the next unclaimed milestone for a task
 */
export function getNextMilestone(task: Task): { index: number; duration: number; reward: number } | null {
  for (let i = 0; i < task.milestones.length; i++) {
    const milestone = task.milestones[i]
    if (!milestone.claimed) {
      return {
        index: i,
        duration: milestone.duration,
        reward: milestone.reward
      }
    }
  }
  return null
}

/**
 * Check and automatically claim milestone rewards
 */
export async function checkAndClaimMilestones(taskId: string, duration: number): Promise<{
  claimed: boolean
  reward?: number
  milestoneIndex?: number
}> {
  try {
    const tasks = await getTasks()
    const task = tasks.find(t => t.id === taskId)
    
    if (!task) {
      return { claimed: false }
    }
    
    // verify whether any milestones are claimable
    for (let i = 0; i < task.milestones.length; i++) {
      const milestone = task.milestones[i]
      
      // claim when duration met and milestone unclaimed
      if (duration >= milestone.duration && !milestone.claimed) {
        const result = await claimMilestone(taskId, i)
        
        if (result.success) {
          console.log('[Tracking] Auto-claimed milestone reward:', {
            taskId,
            milestoneIndex: i,
            baseReward: milestone.reward,
            actualReward: result.reward,
            balance: result.balance?.total
          })
          
          return {
            claimed: true,
            reward: result.reward,  // ✅ Use actual reward after multiplier
            milestoneIndex: i
          }
        }
      }
    }
    
    return { claimed: false }
  } catch (error) {
    console.error('[Tracking] Failed to verify milestones:', error)
    return { claimed: false }
  }
}

/**
 * Handle page activity events (used by the content script)
 */
export async function handlePageActive(url: string): Promise<{
  session: VisitSession | null
  task: Task | null
  nextMilestone: { index: number; duration: number; reward: number } | null
  rewardClaimed?: { reward: number; milestoneIndex: number }
}> {
  const platform = detectPlatform(url)
  
  if (!platform) {
    // end session when the page is not a supported platform
    await endSession()
    return { session: null, task: null, nextMilestone: null }
  }
  
  // get or initialize a session
  let session = await getCurrentSession()
  
  // start a new session if none exists or platform differs
  if (!session || session.platform !== platform) {
    session = await startSession(platform, url)
  } else {
    // update session activity timestamp
    session = await updateSessionActivity()
  }
  
  if (!session) {
    return { session: null, task: null, nextMilestone: null }
  }
  
  // fetch the corresponding task
  const tasks = await getTasks()
  const taskId = platform === 'x' ? 'task_x' : 'task_youtube'
  const task = tasks.find(t => t.id === taskId)
  
  if (!task) {
    return { session, task: null, nextMilestone: null }
  }
  
  // update task progress
  await updateTaskProgress(taskId, session.duration)
  task.currentDuration = session.duration
  task.isActive = true
  
  // fetch the next milestone
  const nextMilestone = getNextMilestone(task)
  
  // verify and claim rewards
  const claimResult = await checkAndClaimMilestones(taskId, session.duration)
  
  return {
    session,
    task,
    nextMilestone,
    rewardClaimed: claimResult.claimed && claimResult.reward && claimResult.milestoneIndex !== undefined
      ? { reward: claimResult.reward, milestoneIndex: claimResult.milestoneIndex }
      : undefined
  }
}

/**
 * Format time display (seconds -> MM:SS)
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Calculate countdown
 */
export function calculateCountdown(currentDuration: number, targetDuration: number): number {
  const remaining = targetDuration - currentDuration
  return Math.max(0, remaining)
}

