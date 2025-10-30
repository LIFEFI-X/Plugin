import browser from 'webextension-polyfill'
import type { GPTBalance, RewardRecord, Task } from '@/types/task'

// storage keys
const STORAGE_KEYS = {
  GPT_BALANCE: 'gpt_balance',
  REWARD_RECORDS: 'reward_records',
  TASKS: 'tasks',
  ASOUL_CONFIG: 'ASOUL_CONFIG' // Use ASoulPet config for unified CPoint balance
}

/**
 * Get current pet's CPoint multiplier from ASoulPet config
 */
async function getCurrentPetMultiplier(): Promise<number> {
  try {
    const result = await browser.storage.sync.get(STORAGE_KEYS.ASOUL_CONFIG)
    if (result[STORAGE_KEYS.ASOUL_CONFIG]) {
      const config = JSON.parse(result[STORAGE_KEYS.ASOUL_CONFIG])

      // CPoint Tier Config (must match ASoulPet.vue)
      const GPT_RATES: Record<string, number> = {
        'carol': 1.0,
        'diana': 1.2,
        'bella': 1.2,
        'ava': 1.5,
        'eileen': 1.5,
        'faye': 2.0
      }

      const currentActor = config.currentActor || 'carol'
      const multiplier = GPT_RATES[currentActor] || 1.0

      console.log('[Reward] Current pet multiplier:', { actor: currentActor, multiplier })
      return multiplier
    }
    return 1.0 // default multiplier
  } catch (error) {
    console.error('[Reward] Failed to get pet multiplier:', error)
    return 1.0
  }
}

/**
 * Retrieve CPoint balance from ASoulPet unified config
 */
export async function getGPTBalance(): Promise<GPTBalance> {
  try {
    const result = await browser.storage.sync.get(STORAGE_KEYS.ASOUL_CONFIG)
    if (result[STORAGE_KEYS.ASOUL_CONFIG]) {
      const config = JSON.parse(result[STORAGE_KEYS.ASOUL_CONFIG])
      return {
        total: config.gptBalance || 0,
        lastUpdate: Date.now()
      }
    }
    // default balance
    return {
      total: 0,
      lastUpdate: Date.now()
    }
  } catch (error) {
    console.error('[Reward] Failed to obtain CPoint balance:', error)
    return { total: 0, lastUpdate: Date.now() }
  }
}

/**
 * Update CPoint balance in ASoulPet unified config
 * @param amount - Base amount (will be multiplied by pet multiplier)
 * @param applyMultiplier - Whether to apply pet multiplier (default: true)
 */
export async function updateGPTBalance(amount: number, applyMultiplier: boolean = true): Promise<GPTBalance> {
  try {
    // Get current config
    const result = await browser.storage.sync.get(STORAGE_KEYS.ASOUL_CONFIG)
    let config = result[STORAGE_KEYS.ASOUL_CONFIG]
      ? JSON.parse(result[STORAGE_KEYS.ASOUL_CONFIG])
      : { gptBalance: 0 }

    // Apply pet multiplier to reward
    let finalAmount = amount
    if (applyMultiplier) {
      const multiplier = await getCurrentPetMultiplier()
      finalAmount = Math.floor(amount * multiplier)
      console.log('[Reward] Applying multiplier:', { base: amount, multiplier, final: finalAmount })
    }

    // Update balance
    config.gptBalance = (config.gptBalance || 0) + finalAmount
    config.lastGptUpdate = Date.now()

    // Save back to storage
    await browser.storage.sync.set({
      [STORAGE_KEYS.ASOUL_CONFIG]: JSON.stringify(config)
    })

    console.log('[Reward] CPoint balance updated:', config.gptBalance, `(+${finalAmount})`)

    return {
      total: config.gptBalance,
      lastUpdate: Date.now()
    }
  } catch (error) {
    console.error('[Reward] Failed to update CPoint balance:', error)
    throw error
  }
}

/**
 * Add reward record
 */
export async function addRewardRecord(record: Omit<RewardRecord, 'id' | 'timestamp'>): Promise<RewardRecord> {
  try {
    const newRecord: RewardRecord = {
      ...record,
      id: `reward_${Date.now()}`,
      timestamp: Date.now()
    }
    
    const result = await browser.storage.local.get(STORAGE_KEYS.REWARD_RECORDS)
    const records: RewardRecord[] = result[STORAGE_KEYS.REWARD_RECORDS] 
      ? JSON.parse(result[STORAGE_KEYS.REWARD_RECORDS]) 
      : []
    
    records.push(newRecord)
    
    // keep only the latest 100 records
    if (records.length > 100) {
      records.splice(0, records.length - 100)
    }
    
    await browser.storage.local.set({
      [STORAGE_KEYS.REWARD_RECORDS]: JSON.stringify(records)
    })
    
    console.log('[Reward] Reward record added:', newRecord)
    return newRecord
  } catch (error) {
    console.error('[Reward] Failed to add reward record:', error)
    throw error
  }
}

/**
 * Retrieve reward records
 */
export async function getRewardRecords(): Promise<RewardRecord[]> {
  try {
    const result = await browser.storage.local.get(STORAGE_KEYS.REWARD_RECORDS)
    if (result[STORAGE_KEYS.REWARD_RECORDS]) {
      return JSON.parse(result[STORAGE_KEYS.REWARD_RECORDS])
    }
    return []
  } catch (error) {
    console.error('[Reward] Failed to retrieve reward records:', error)
    return []
  }
}

/**
 * Persist task list
 */
export async function saveTasks(tasks: Task[]): Promise<void> {
  try {
    await browser.storage.local.set({
      [STORAGE_KEYS.TASKS]: JSON.stringify(tasks)
    })
    console.log('[Reward] Task list saved')
  } catch (error) {
    console.error('[Reward] Failed to save task list:', error)
    throw error
  }
}

/**
 * Retrieve task list
 */
export async function getTasks(): Promise<Task[]> {
  try {
    const result = await browser.storage.local.get(STORAGE_KEYS.TASKS)
    if (result[STORAGE_KEYS.TASKS]) {
      return JSON.parse(result[STORAGE_KEYS.TASKS])
    }
    // return default tasks
    return getDefaultTasks()
  } catch (error) {
    console.error('[Reward] Failed to retrieve task list:', error)
    return getDefaultTasks()
  }
}

/**
 * Retrieve default task configuration
 */
export function getDefaultTasks(): Task[] {
  return [
    {
      id: 'task_x',
      type: 'visit',
      platform: 'x',
      title: 'Visit X (Twitter)',
      description: 'Earn CPoint by spending time on X',
      milestones: [
        { duration: 20, reward: 50, claimed: false }, // 20 seconds -> 50 CPoint (quick test)
        { duration: 2 * 60, reward: 100, claimed: false }, // 2 minutes -> 100 CPoint
        { duration: 10 * 60, reward: 700, claimed: false } // 10 minutes -> 700 CPoint
      ],
      currentDuration: 0,
      isActive: false
    },
    {
      id: 'task_youtube',
      type: 'watch',
      platform: 'youtube',
      title: 'Watch YouTube',
      description: 'Earn CPoint by watching videos',
      milestones: [
        { duration: 1 * 60, reward: 100, claimed: false }, // 1 minute -> 100 CPoint
        { duration: 5 * 60, reward: 500, claimed: false } // 5 minutes -> 500 CPoint
      ],
      currentDuration: 0,
      isActive: false
    }
  ]
}

/**
 * Update task progress
 */
export async function updateTaskProgress(taskId: string, duration: number): Promise<Task | null> {
  try {
    const tasks = await getTasks()
    const task = tasks.find(t => t.id === taskId)
    
    if (!task) {
      console.warn('[Reward] Task does not exist:', taskId)
      return null
    }
    
    task.currentDuration = duration
    task.lastUpdateTime = Date.now()
    
    await saveTasks(tasks)
    return task
  } catch (error) {
    console.error('[Reward] Failed to update task progress:', error)
    return null
  }
}

/**
 * Claim milestone reward
 */
export async function claimMilestone(taskId: string, milestoneIndex: number): Promise<{ success: boolean; reward?: number; balance?: GPTBalance }> {
  try {
    console.log('[Reward] claimMilestone called:', { taskId, milestoneIndex })

    const tasks = await getTasks()
    const task = tasks.find(t => t.id === taskId)

    if (!task) {
      console.error('[Reward] Task not found:', taskId)
      return { success: false }
    }

    const milestone = task.milestones[milestoneIndex]
    if (!milestone || milestone.claimed) {
      console.error('[Reward] Milestone invalid or already claimed:', { milestone, claimed: milestone?.claimed })
      return { success: false }
    }

    // verify duration requirement
    if (task.currentDuration < milestone.duration) {
      console.error('[Reward] Duration requirement not met:', { current: task.currentDuration, required: milestone.duration })
      return { success: false }
    }

    console.log('[Reward] Claiming milestone:', { baseReward: milestone.reward })

    // mark as claimed
    milestone.claimed = true
    await saveTasks(tasks)

    // update CPoint balance with multiplier
    console.log('[Reward] Calling updateGPTBalance with amount:', milestone.reward)
    const balance = await updateGPTBalance(milestone.reward, true)
    console.log('[Reward] Balance after update:', balance)

    // add reward record
    await addRewardRecord({
      taskId: task.id,
      platform: task.platform,
      milestone: milestoneIndex,
      reward: milestone.reward
    })

    console.log('[Reward] Milestone reward claimed successfully:', {
      taskId,
      milestoneIndex,
      baseReward: milestone.reward,
      newBalance: balance.total
    })

    return {
      success: true,
      reward: milestone.reward,
      balance
    }
  } catch (error) {
    console.error('[Reward] Failed to claim milestone reward:', error)
    return { success: false }
  }
}

/**
 * Reset task (for a new visit session)
 */
export async function resetTask(taskId: string): Promise<void> {
  try {
    const tasks = await getTasks()
    const task = tasks.find(t => t.id === taskId)
    
    if (!task) return
    
    task.currentDuration = 0
    task.isActive = false
    task.startTime = undefined
    task.lastUpdateTime = undefined
    
    // reset milestones
    task.milestones.forEach(m => {
      m.claimed = false
    })
    
    await saveTasks(tasks)
    console.log('[Reward] Task reset:', taskId)
  } catch (error) {
    console.error('[Reward] Failed to reset task:', error)
  }
}
