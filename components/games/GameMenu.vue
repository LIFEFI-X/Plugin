<template>
  <div class="game-menu-container">
    <!-- If game selected, show game interface -->
    <component 
      v-if="selectedGame" 
      :is="currentGameComponent" 
      @close="closeGame"
      @viewStats="showStatsPanel = true"
    />
    
    <!-- Game selection menu -->
    <div v-else class="menu-content">
      <div class="menu-header">
        <h2>
          <svg class="header-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="7" width="12" height="10" rx="2" stroke="currentColor" stroke-width="2"/>
            <path d="M9 10H9.01M12 10H12.01M15 10H15.01M9 13H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Game Center
        </h2>
        <button @click="$emit('close')" class="btn-close">✕</button>
      </div>

      <!-- Stats overview -->
      <div v-if="stats" class="stats-overview">
        <div class="stat-card">
          <svg class="stat-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
            <circle cx="12" cy="12" r="3" fill="currentColor"/>
            <path d="M12 3V5M12 19V21M3 12H5M19 12H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <div class="stat-info">
            <span class="stat-label">Total Games</span>
            <span class="stat-value">{{ stats.totalGames }}</span>
          </div>
        </div>
        <div class="stat-card">
          <svg class="stat-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L15 9L22 10L17 15L18 22L12 18L6 22L7 15L2 10L9 9L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
          </svg>
          <div class="stat-info">
            <span class="stat-label">Total Points</span>
            <span class="stat-value">{{ stats.totalPoints }}</span>
          </div>
        </div>
        <div class="stat-card">
          <svg class="stat-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 9H4V20H8V9H6Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            <path d="M14 5H10V20H14V5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            <path d="M20 13H16V20H20V13Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            <circle cx="12" cy="2" r="1" fill="currentColor"/>
          </svg>
          <div class="stat-info">
            <span class="stat-label">High Score</span>
            <span class="stat-value">{{ stats.highScore }}</span>
          </div>
        </div>
      </div>

      <!-- Games list -->
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

        <!-- Coming soon -->
        <div class="game-card coming-soon">
          <h3 class="game-title">More Games</h3>
          <p class="game-desc">Coming Soon</p>
          <div class="coming-soon-badge">Coming Soon</div>
        </div>
      </div>

      <!-- Footer actions -->
      <div class="menu-footer">
        <button @click="showStatsPanel = true" class="btn-footer">
          <svg class="footer-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="14" width="4" height="6" rx="1" stroke="currentColor" stroke-width="2"/>
            <rect x="10" y="8" width="4" height="12" rx="1" stroke="currentColor" stroke-width="2"/>
            <rect x="16" y="4" width="4" height="16" rx="1" stroke="currentColor" stroke-width="2"/>
          </svg>
          View Stats
        </button>
        <button @click="showRecords = true" class="btn-footer">
          <svg class="footer-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" stroke-width="2"/>
            <path d="M9 8H15M9 12H15M9 16H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Records
        </button>
      </div>
    </div>

    <!-- Statistics panel -->
    <div v-if="showStatsPanel" class="modal-overlay" @click.self="showStatsPanel = false">
      <div class="stats-panel">
        <div class="panel-header">
          <h3>
            <svg class="panel-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="14" width="4" height="6" rx="1" stroke="currentColor" stroke-width="2"/>
              <rect x="10" y="8" width="4" height="12" rx="1" stroke="currentColor" stroke-width="2"/>
              <rect x="16" y="4" width="4" height="16" rx="1" stroke="currentColor" stroke-width="2"/>
            </svg>
            Game Statistics
          </h3>
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

  
    <div v-if="showRecords" class="modal-overlay" @click.self="showRecords = false">
      <div class="records-panel">
        <div class="panel-header">
          <h3>
            <svg class="panel-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" stroke-width="2"/>
              <path d="M9 8H15M9 12H15M9 16H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Game Records
          </h3>
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

// Define events
const emit = defineEmits<{
  close: []
}>()

// Games list
const games = [
  {
    id: 'dont-tap-white',
    name: "Don't Tap White",
    icon: '',
    description: 'Tap black blocks and avoid white blocks!',
    component: markRaw(DontTapWhite)
  },
  {
    id: 'snake',
    name: 'Snake Game',
    icon: '',
    description: 'Control the snake with WASD keys!',
    component: markRaw(Snake)
  },
  {
    id: 'tetris',
    name: 'Tetris',
    icon: '',
    description: 'Classic block puzzle game with WASD controls!',
    component: markRaw(Tetris)
  }
]

// Current selected game
const selectedGame = ref<string | null>(null)

// Statistics data
const stats = ref<GameStats | null>(null)

// Game records
const records = ref<GameRecord[]>([])

// Show statistics panel
const showStatsPanel = ref(false)

// Show records
const showRecords = ref(false)

// Current game component
const currentGameComponent = computed(() => {
  const game = games.find(g => g.id === selectedGame.value)
  return game?.component
})

/**
 * Select game
 */
function selectGame(gameId: string) {
  selectedGame.value = gameId
  console.log('[GameMenu] Selected game:', gameId)
}

/**
 * Close game
 */
async function closeGame() {
  selectedGame.value = null
  // Reload statistics
  await loadData()
}

/**
 * Load data
 */
async function loadData() {
  stats.value = await getGameStats()
  records.value = await getGameRecords()
  console.log('[GameMenu] Data loaded:', { stats: stats.value, records: records.value.length })
}

/**
 * Get rank percentage
 */
function getRankPercentage(count: number): number {
  if (!stats.value || stats.value.totalGames === 0) return 0
  return (count / stats.value.totalGames) * 100
}

/**
 * Format play time
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
 * Format timestamp
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  // 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return minutes === 0 ? 'just now' : `${minutes}m ago`
  }
  

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }
  

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }
  

  return date.toLocaleDateString('en-US', { 
    month: 'numeric', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}


async function confirmClearData() {
  if (confirm('Are you sure you want to clear all game data? This cannot be undone!')) {
    await clearGameData()
    await loadData()
    showStatsPanel.value = false
    alert('Game data cleared')
  }
}


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
  background: #000000;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
}


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
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.menu-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: white;
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-icon {
  width: 24px;
  height: 24px;
  color: white;
}

.btn-close {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  font-size: 18px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: rotate(90deg);
}


.stats-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
}

.stat-icon {
  width: 28px;
  height: 28px;
  color: white;
  flex-shrink: 0;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: white;
}


.games-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 16px;
  flex: 1;
}

.game-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  min-height: 200px;
  backdrop-filter: blur(20px);
}

.game-card:not(.coming-soon):hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.08);
}

.game-card.coming-soon {
  opacity: 0.4;
  cursor: not-allowed;
  position: relative;
}

.game-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  color: white;
}

.game-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.game-desc {
  margin: 0 0 12px 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.5;
  flex: 1;
}

.game-stats {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 12px;
}

.btn-play {
  width: 100%;
  padding: 10px;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  font-size: 13px;
  font-weight: 500;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-play:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.1);
}

.coming-soon-badge {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 12px;
  margin: 0 auto;
}


.menu-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.02);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-footer {
  flex: 1;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  color: white;
  font-size: 13px;
  font-weight: 500;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.footer-icon {
  width: 16px;
  height: 16px;
  color: white;
}

.btn-footer:hover {
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
}


.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s;
  backdrop-filter: blur(10px);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.stats-panel,
.records-panel {
  background: #000000;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 24px;
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
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: white;
  display: flex;
  align-items: center;
  gap: 10px;
}

.panel-icon {
  width: 20px;
  height: 20px;
  color: white;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.panel-footer {
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
  background: rgba(255, 255, 255, 0.02);
}

.btn-danger {
  padding: 10px 24px;
  border: 1px solid rgba(255, 100, 100, 0.5);
  background: rgba(255, 100, 100, 0.1);
  color: rgba(255, 100, 100, 1);
  font-size: 13px;
  font-weight: 500;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-danger:hover {
  background: rgba(255, 100, 100, 0.2);
  border-color: rgba(255, 100, 100, 0.8);
}


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
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  backdrop-filter: blur(20px);
}

.stats-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 8px;
}

.stats-value {
  font-size: 20px;
  font-weight: 600;
  color: white;
}

.stats-value.highlight {
  color: white;
}

.rank-distribution {
  margin-top: 24px;
}

.rank-distribution h4 {
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 600;
  color: white;
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
  font-weight: 600;
  text-align: center;
}

.rank-bar-wrapper {
  flex: 1;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
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
  color: rgba(255, 255, 255, 0.6);
}

/* ========== 游戏记录 ========== */
.empty-records {
  text-align: center;
  padding: 48px 24px;
  color: rgba(255, 255, 255, 0.5);
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
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  transition: all 0.3s ease;
  backdrop-filter: blur(20px);
}

.record-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.record-rank {
  width: 40px;
  height: 40px;
  line-height: 40px;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  color: white;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
}

.record-info {
  flex: 1;
}

.record-score {
  font-size: 14px;
  font-weight: 600;
  color: white;
  margin-bottom: 4px;
}

.record-details {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.record-points {
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.record-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  min-width: 70px;
  text-align: right;
}
</style>

