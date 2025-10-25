/**
 * Game utility functions
 */

import browser from 'webextension-polyfill'
import type { 
  GamePerformance, 
  GameRecord, 
  GameStats, 
  ScoreRank,
  GameState 
} from '@/types/game'

// storage key names
const STORAGE_KEYS = {
  HIGH_SCORE: 'GAME_HIGH_SCORE',
  STATS: 'GAME_STATS',
  RECORDS: 'GAME_RECORDS'
}

/**
 * Calculate game performance and points
 */
export function calculatePerformance(gameState: GameState): GamePerformance {
  const { score, correctClicks, totalClicks, startTime, endTime, combo } = gameState
  
  // compute game duration in seconds
  const duration = endTime ? (endTime - startTime) / 1000 : 0
  
  // compute accuracy (0-100)
  const accuracy = totalClicks > 0 ? (correctClicks / totalClicks) * 100 : 0
  
  // compute average speed (tiles per second)
  const avgSpeed = duration > 0 ? score / duration : 0
  
  // maximum combo count
  const maxCombo = combo
  
  // === scoring formula ===
  // base points: in-game score
  let points = score
  
  // accuracy bonus (up to +50%)
  const accuracyBonus = Math.floor(score * (accuracy / 100) * 0.5)
  points += accuracyBonus
  
  // speed bonus (above one tile per second adds bonus, capped at +30%)
  if (avgSpeed > 1) {
    const speedBonus = Math.floor(score * Math.min((avgSpeed - 1) / 10, 0.3))
    points += speedBonus
  }
  
  // combo bonus (begins after 5 combos, capped at +20%)
  if (maxCombo > 5) {
    const comboBonus = Math.floor(score * Math.min((maxCombo - 5) / 50, 0.2))
    points += comboBonus
  }
  
  // duration bonus (beyond 30 seconds, +5 points per additional 10 seconds)
  if (duration > 30) {
    const durationBonus = Math.floor((duration - 30) / 10) * 5
    points += durationBonus
  }
  
  // determine rank
  const rank = getRank(accuracy)
  
  // rank-based bonus
  const rankMultiplier = {
    S: 1.5,
    A: 1.3,
    B: 1.1,
    C: 1.0,
    D: 0.8
  }
  points = Math.floor(points * rankMultiplier[rank])
  
  // craft feedback message
  const message = generateMessage(rank, score, accuracy, maxCombo)
  
  return {
    score,
    rank,
    accuracy: Math.round(accuracy * 100) / 100,
    avgSpeed: Math.round(avgSpeed * 100) / 100,
    maxCombo,
    duration: Math.round(duration * 10) / 10,
    points,
    message
  }
}

/**
 * Determine rank based on accuracy
 */
function getRank(accuracy: number): ScoreRank {
  if (accuracy >= 90) return 'S'
  if (accuracy >= 80) return 'A'
  if (accuracy >= 70) return 'B'
  if (accuracy >= 60) return 'C'
  return 'D'
}

/**
 * Generate feedback message
 */
function generateMessage(rank: ScoreRank, score: number, accuracy: number, combo: number): string {
  const messages = {
    S: [
      '🌟 完美！你是大师级玩家！',
      '🎉 太厉害了！近乎完美的表现！',
      '👑 无可挑剔！你已登峰造极！'
    ],
    A: [
      '🎯 优秀！继续保持这个水平！',
      '✨ 很棒的表现，再接再厉！',
      '💪 实力不俗！距离完美不远了！'
    ],
    B: [
      '👍 不错！还有提升空间！',
      '😊 表现良好，继续加油！',
      '🔥 越来越好了，保持练习！'
    ],
    C: [
      '💡 还需要多多练习哦！',
      '🌱 别灰心，熟能生巧！',
      '⚡ 加把劲，你可以做得更好！'
    ],
    D: [
      '🎮 多多练习，一定会进步的！',
      '🌈 失败乃成功之母，再来！',
      '💫 不要放弃，下次会更好！'
    ]
  }
  
  let msg = messages[rank][Math.floor(Math.random() * messages[rank].length)]
  
  // special achievement prompts
  if (score >= 100) {
    msg += '\n🏆 成就解锁：百分突破！'
  }
  if (accuracy === 100) {
    msg += '\n💯 成就解锁：完美精准！'
  }
  if (combo >= 50) {
    msg += '\n⚡ 成就解锁：连击狂魔！'
  }
  
  return msg
}

/**
 * Persist game record
 */
export async function saveGameRecord(performance: GamePerformance): Promise<void> {
  try {
    // fetch existing records
    const result = await browser.storage.sync.get(STORAGE_KEYS.RECORDS)
    const records: GameRecord[] = result[STORAGE_KEYS.RECORDS] || []
    
    // append new record
    const newRecord: GameRecord = {
      id: `game_${Date.now()}`,
      timestamp: Date.now(),
      score: performance.score,
      rank: performance.rank,
      accuracy: performance.accuracy,
      duration: performance.duration,
      points: performance.points
    }
    
    records.unshift(newRecord)
    
    // keep only the latest 50 records
    if (records.length > 50) {
      records.splice(50)
    }
    
    // persist records
    await browser.storage.sync.set({
      [STORAGE_KEYS.RECORDS]: records
    })
    
    console.log('[Game] Game record saved:', newRecord)
  } catch (error) {
    console.error('[Game] Failed to save game record:', error)
  }
}

/**
 * Update game statistics
 */
export async function updateGameStats(performance: GamePerformance): Promise<void> {
  try {
    // fetch existing statistics
    const result = await browser.storage.sync.get([STORAGE_KEYS.STATS, STORAGE_KEYS.HIGH_SCORE])
    const stats: GameStats = result[STORAGE_KEYS.STATS] || {
      totalGames: 0,
      totalPoints: 0,
      highScore: 0,
      bestAccuracy: 0,
      totalPlayTime: 0,
      averageScore: 0,
      rankDistribution: { S: 0, A: 0, B: 0, C: 0, D: 0 }
    }
    
    // update statistics
    stats.totalGames++
    stats.totalPoints += performance.points
    stats.totalPlayTime += performance.duration
    stats.rankDistribution[performance.rank]++
    
    // update high score
    if (performance.score > stats.highScore) {
      stats.highScore = performance.score
      await browser.storage.sync.set({
        [STORAGE_KEYS.HIGH_SCORE]: performance.score
      })
    }
    
    // update best accuracy
    if (performance.accuracy > stats.bestAccuracy) {
      stats.bestAccuracy = performance.accuracy
    }
    
    // compute average score
    stats.averageScore = Math.round(
      (stats.averageScore * (stats.totalGames - 1) + performance.score) / stats.totalGames
    )
    
    // persist statistics
    await browser.storage.sync.set({
      [STORAGE_KEYS.STATS]: stats
    })
    
    console.log('[Game] Statistics updated:', stats)
  } catch (error) {
    console.error('[Game] Failed to update statistics:', error)
  }
}

/**
 * Retrieve game statistics
 */
export async function getGameStats(): Promise<GameStats> {
  try {
    const result = await browser.storage.sync.get(STORAGE_KEYS.STATS)
    return result[STORAGE_KEYS.STATS] || {
      totalGames: 0,
      totalPoints: 0,
      highScore: 0,
      bestAccuracy: 0,
      totalPlayTime: 0,
      averageScore: 0,
      rankDistribution: { S: 0, A: 0, B: 0, C: 0, D: 0 }
    }
  } catch (error) {
    console.error('[Game] Failed to retrieve statistics:', error)
    return {
      totalGames: 0,
      totalPoints: 0,
      highScore: 0,
      bestAccuracy: 0,
      totalPlayTime: 0,
      averageScore: 0,
      rankDistribution: { S: 0, A: 0, B: 0, C: 0, D: 0 }
    }
  }
}

/**
 * Retrieve game records
 */
export async function getGameRecords(): Promise<GameRecord[]> {
  try {
    const result = await browser.storage.sync.get(STORAGE_KEYS.RECORDS)
    return result[STORAGE_KEYS.RECORDS] || []
  } catch (error) {
    console.error('[Game] Failed to retrieve records:', error)
    return []
  }
}

/**
 * Retrieve high score
 */
export async function getHighScore(): Promise<number> {
  try {
    const result = await browser.storage.sync.get(STORAGE_KEYS.HIGH_SCORE)
    return result[STORAGE_KEYS.HIGH_SCORE] || 0
  } catch (error) {
    console.error('[Game] Failed to retrieve high score:', error)
    return 0
  }
}

/**
 * Clear all game data
 */
export async function clearGameData(): Promise<void> {
  try {
    await browser.storage.sync.remove([
      STORAGE_KEYS.HIGH_SCORE,
      STORAGE_KEYS.STATS,
      STORAGE_KEYS.RECORDS
    ])
    console.log('[Game] Game data cleared')
  } catch (error) {
    console.error('[Game] Failed to clear data:', error)
  }
}

/**
 * Retrieve rank colors
 */
export function getRankColor(rank: ScoreRank): string {
  const colors = {
    S: '#FFD700',  // gold
    A: '#FF6B9D',  // pink
    B: '#4ECDC4',  // teal
    C: '#95E1D3',  // light teal
    D: '#A8A8A8'   // gray
  }
  return colors[rank]
}

/**
 * Format game duration
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}秒`
  }
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}分${secs}秒`
}

