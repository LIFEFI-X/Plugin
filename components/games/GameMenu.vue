<template>
  <div class="game-menu-container">
    <!-- 如果选择了游戏，显示游戏界面 -->
    <component 
      v-if="selectedGame" 
      :is="currentGameComponent" 
      @close="closeGame"
      @viewStats="showStatsPanel = true"
    />
    
    <!-- 游戏选择菜单 -->
    <div v-else class="menu-content">
      <div class="menu-header">
        <h2>🎮 Game Center</h2>
        <button @click="$emit('close')" class="btn-close">✕</button>
      </div>

      <!-- 统计概览 -->
      <div v-if="stats" class="stats-overview">
        <div class="stat-card">
          <div class="stat-icon">🎯</div>
          <div class="stat-info">
            <span class="stat-label">Total Games</span>
            <span class="stat-value">{{ stats.totalGames }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⭐</div>
          <div class="stat-info">
            <span class="stat-label">Total Points</span>
            <span class="stat-value">{{ stats.totalPoints }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏆</div>
          <div class="stat-info">
            <span class="stat-label">High Score</span>
            <span class="stat-value">{{ stats.highScore }}</span>
          </div>
        </div>
      </div>

      <!-- 游戏列表 -->
      <div class="games-grid">
        <div 
          v-for="game in games" 
          :key="game.id"
          class="game-card"
          @click="selectGame(game.id)"
        >
          <div class="game-icon">{{ game.icon }}</div>
          <h3 class="game-title">{{ game.name }}</h3>
          <p class="game-desc">{{ game.description }}</p>
          <div class="game-stats" v-if="game.id === 'dont-tap-white' && stats">
            <span>Best: {{ stats.highScore }}</span>
            <span>·</span>
            <span>{{ stats.totalGames }} games</span>
          </div>
          <button class="btn-play">Start Game</button>
        </div>

        <!-- 即将推出 -->
        <div class="game-card coming-soon">
          <div class="game-icon">🎲</div>
          <h3 class="game-title">More Games</h3>
          <p class="game-desc">Coming Soon</p>
          <div class="coming-soon-badge">Coming Soon</div>
        </div>
      </div>

      <!-- 底部操作 -->
      <div class="menu-footer">
        <button @click="showStatsPanel = true" class="btn-footer">
          📊 View Stats
        </button>
        <button @click="showRecords = true" class="btn-footer">
          📜 Records
        </button>
      </div>
    </div>

    <!-- 统计面板 -->
    <div v-if="showStatsPanel" class="modal-overlay" @click.self="showStatsPanel = false">
      <div class="stats-panel">
        <div class="panel-header">
          <h3>📊 Game Statistics</h3>
          <button @click="showStatsPanel = false" class="btn-close">✕</button>
        </div>
        <div class="panel-body" v-if="stats">
          <div class="stats-grid">
            <div class="stats-item">
              <span class="stats-label">Total Games</span>
              <span class="stats-value">{{ stats.totalGames }}</span>
            </div>
            <div class="stats-item">
              <span class="stats-label">Total Points</span>
              <span class="stats-value highlight">{{ stats.totalPoints }}</span>
            </div>
            <div class="stats-item">
              <span class="stats-label">High Score</span>
              <span class="stats-value">{{ stats.highScore }}</span>
            </div>
            <div class="stats-item">
              <span class="stats-label">Average Score</span>
              <span class="stats-value">{{ stats.averageScore }}</span>
            </div>
            <div class="stats-item">
              <span class="stats-label">Best Accuracy</span>
              <span class="stats-value">{{ stats.bestAccuracy.toFixed(1) }}%</span>
            </div>
            <div class="stats-item">
              <span class="stats-label">Total Play Time</span>
              <span class="stats-value">{{ formatPlayTime(stats.totalPlayTime) }}</span>
            </div>
          </div>

          <!-- 评级分布 -->
          <div class="rank-distribution">
            <h4>Rank Distribution</h4>
            <div class="rank-bars">
              <div 
                v-for="(count, rank) in stats.rankDistribution" 
                :key="rank"
                class="rank-bar-item"
              >
                <span class="rank-label" :style="{ color: getRankColor(rank as any) }">
                  {{ rank }}
                </span>
                <div class="rank-bar-wrapper">
                  <div 
                    class="rank-bar"
                    :style="{ 
                      width: getRankPercentage(count) + '%',
                      background: getRankColor(rank as any)
                    }"
                  ></div>
                </div>
                <span class="rank-count">{{ count }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="panel-footer">
          <button @click="confirmClearData" class="btn-danger">Clear Data</button>
        </div>
      </div>
    </div>

    <!-- 游戏记录 -->
    <div v-if="showRecords" class="modal-overlay" @click.self="showRecords = false">
      <div class="records-panel">
        <div class="panel-header">
          <h3>📜 Game Records</h3>
          <button @click="showRecords = false" class="btn-close">✕</button>
        </div>
        <div class="panel-body">
          <div v-if="records.length === 0" class="empty-records">
            <p>No game records yet</p>
            <p class="hint">Go play a game!</p>
          </div>
          <div v-else class="records-list">
            <div 
              v-for="record in records" 
              :key="record.id"
              class="record-item"
            >
              <div class="record-rank" :style="{ background: getRankColor(record.rank) }">
                {{ record.rank }}
              </div>
              <div class="record-info">
                <div class="record-score">Score: {{ record.score }}</div>
                <div class="record-details">
                  Accuracy: {{ record.accuracy.toFixed(1) }}% · 
                  Duration: {{ formatDuration(record.duration) }}
                </div>
              </div>
              <div class="record-points">+{{ record.points }}</div>
              <div class="record-time">{{ formatTime(record.timestamp) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, markRaw } from 'vue'
import DontTapWhite from './DontTapWhite.vue'
import Snake from './Snake.vue'
import Tetris from './Tetris.vue'
import type { GameStats, GameRecord, ScoreRank } from '@/types/game'
import { 
  getGameStats, 
  getGameRecords, 
  getRankColor,
  formatDuration,
  clearGameData
} from '@/utils/game'

// 定义事件
const emit = defineEmits<{
  close: []
}>()

// 游戏列表
const games = [
  {
    id: 'dont-tap-white',
    name: "Don't Tap White",
    icon: '⬛',
    description: 'Tap black blocks and avoid white blocks!',
    component: markRaw(DontTapWhite)
  },
  {
    id: 'snake',
    name: 'Snake Game',
    icon: '🐍',
    description: 'Control the snake with WASD keys!',
    component: markRaw(Snake)
  },
  {
    id: 'tetris',
    name: 'Tetris',
    icon: '🟦',
    description: 'Classic block puzzle game with WASD controls!',
    component: markRaw(Tetris)
  }
]

// 当前选择的游戏
const selectedGame = ref<string | null>(null)

// 统计数据
const stats = ref<GameStats | null>(null)

// 游戏记录
const records = ref<GameRecord[]>([])

// 显示统计面板
const showStatsPanel = ref(false)

// 显示记录
const showRecords = ref(false)

// 当前游戏组件
const currentGameComponent = computed(() => {
  const game = games.find(g => g.id === selectedGame.value)
  return game?.component
})

/**
 * 选择游戏
 */
function selectGame(gameId: string) {
  selectedGame.value = gameId
  console.log('[GameMenu] Selected game:', gameId)
}

/**
 * 关闭游戏
 */
async function closeGame() {
  selectedGame.value = null
  // 重新加载统计
  await loadData()
}

/**
 * 加载数据
 */
async function loadData() {
  stats.value = await getGameStats()
  records.value = await getGameRecords()
  console.log('[GameMenu] Data loaded:', { stats: stats.value, records: records.value.length })
}

/**
 * 获取评级百分比
 */
function getRankPercentage(count: number): number {
  if (!stats.value || stats.value.totalGames === 0) return 0
  return (count / stats.value.totalGames) * 100
}

/**
 * 格式化游戏时间
 */
function formatPlayTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

/**
 * 格式化时间戳
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  // 1小时内
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return minutes === 0 ? 'just now' : `${minutes}m ago`
  }
  
  // 今天
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }
  
  // 昨天
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }
  
  // 其他
  return date.toLocaleDateString('en-US', { 
    month: 'numeric', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * 确认清空数据
 */
async function confirmClearData() {
  if (confirm('Are you sure you want to clear all game data? This cannot be undone!')) {
    await clearGameData()
    await loadData()
    showStatsPanel.value = false
    alert('Game data cleared')
  }
}

// 生命周期
onMounted(async () => {
  await loadData()
  console.log('[GameMenu] Game menu loaded')
})
</script>

<style scoped>
.game-menu-container {
  width: 100%;
  height: 100%;
  min-height: 600px;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
}

/* ========== 菜单内容 ========== */
.menu-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
}

.menu-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.btn-close {
  width: 32px;
  height: 32px;
  border: none;
  background: #f3f4f6;
  border-radius: 50%;
  font-size: 18px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #e5e7eb;
  transform: rotate(90deg);
}

/* ========== 统计概览 ========== */
.stats-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: linear-gradient(135deg, #f5f7ff 0%, #fff 100%);
  border-radius: 10px;
  border: 1px solid #e5e7eb;
}

.stat-icon {
  font-size: 28px;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 11px;
  color: #666;
}

.stat-value {
  font-size: 16px;
  font-weight: bold;
  color: #667eea;
}

/* ========== 游戏列表 ========== */
.games-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 16px;
  flex: 1;
}

.game-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
  display: flex;
  flex-direction: column;
  min-height: 200px;
}

.game-card:not(.coming-soon):hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.2);
  border-color: #667eea;
}

.game-card.coming-soon {
  opacity: 0.6;
  cursor: not-allowed;
  position: relative;
}

.game-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.game-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.game-desc {
  margin: 0 0 12px 0;
  font-size: 12px;
  color: #666;
  line-height: 1.5;
  flex: 1;
}

.game-stats {
  font-size: 11px;
  color: #999;
  margin-bottom: 12px;
}

.btn-play {
  width: 100%;
  padding: 10px;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-play:hover {
  transform: scale(1.02);
}

.coming-soon-badge {
  padding: 6px 12px;
  background: #fbbf24;
  color: white;
  font-size: 11px;
  font-weight: bold;
  border-radius: 12px;
  margin: 0 auto;
}

/* ========== 底部操作 ========== */
.menu-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  background: white;
  border-top: 1px solid #e5e7eb;
}

.btn-footer {
  flex: 1;
  padding: 12px;
  border: 1px solid #d1d5db;
  background: white;
  color: #666;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-footer:hover {
  border-color: #667eea;
  color: #667eea;
  background: #f5f7ff;
}

/* ========== 模态框 ========== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.stats-panel,
.records-panel {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.panel-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  text-align: center;
}

.btn-danger {
  padding: 10px 24px;
  border: 1px solid #dc2626;
  background: white;
  color: #dc2626;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-danger:hover {
  background: #dc2626;
  color: white;
}

/* ========== 统计详情 ========== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stats-item {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 10px;
}

.stats-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.stats-value {
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.stats-value.highlight {
  color: #667eea;
}

.rank-distribution {
  margin-top: 24px;
}

.rank-distribution h4 {
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.rank-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rank-bar-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rank-label {
  width: 24px;
  font-size: 14px;
  font-weight: bold;
  text-align: center;
}

.rank-bar-wrapper {
  flex: 1;
  height: 24px;
  background: #f3f4f6;
  border-radius: 12px;
  overflow: hidden;
}

.rank-bar {
  height: 100%;
  border-radius: 12px;
  transition: width 0.3s;
}

.rank-count {
  width: 30px;
  text-align: right;
  font-size: 12px;
  color: #666;
}

/* ========== 游戏记录 ========== */
.empty-records {
  text-align: center;
  padding: 48px 24px;
  color: #9ca3af;
}

.empty-records p {
  margin: 0 0 8px 0;
}

.empty-records .hint {
  font-size: 12px;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 10px;
  transition: all 0.2s;
}

.record-item:hover {
  background: #f3f4f6;
}

.record-rank {
  width: 40px;
  height: 40px;
  line-height: 40px;
  text-align: center;
  font-size: 18px;
  font-weight: bold;
  color: white;
  border-radius: 8px;
}

.record-info {
  flex: 1;
}

.record-score {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.record-details {
  font-size: 11px;
  color: #666;
}

.record-points {
  font-size: 16px;
  font-weight: bold;
  color: #667eea;
}

.record-time {
  font-size: 11px;
  color: #999;
  min-width: 70px;
  text-align: right;
}
</style>

