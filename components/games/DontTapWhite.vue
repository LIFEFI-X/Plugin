<template>
  <div class="game-container">
    <!-- 游戏顶部状态栏 -->
    <div class="game-header">
      <div class="score-display">
        <div class="score-item">
          <span class="label">Score</span>
          <span class="value">{{ gameState.score }}</span>
        </div>
        <div class="score-item">
          <span class="label">Combo</span>
          <span class="value combo">{{ gameState.combo }}x</span>
        </div>
        <div class="score-item">
          <span class="label">Best</span>
          <span class="value">{{ gameState.highScore }}</span>
        </div>
      </div>
      <div class="game-controls">
        <button v-if="gameState.isPlaying" @click="togglePause" class="btn-control">
          {{ gameState.isPaused ? '▶' : '⏸' }}
        </button>
        <button @click="restartGame" class="btn-control">🔄</button>
        <button @click="closeGame" class="btn-control">✕</button>
      </div>
    </div>

    <!-- 游戏区域 -->
    <div class="game-board" ref="gameBoard" @click="handleBoardClick">
      <template v-for="row in visibleBlocks" :key="`row-${row[0]?.row}`">
        <div
          v-for="block in row"
          :key="block.id"
          :class="['block', {
            'block-black': block.isBlack,
            'block-white': !block.isBlack,
            'block-clicked': block.clicked
          }]"
          :style="getBlockStyle(block)"
          @click.stop="handleBlockClick(block)"
        >
        </div>
      </template>
    </div>

    <!-- 开始界面 -->
    <div v-if="!gameState.isPlaying && !gameState.gameOver" class="game-overlay">
      <div class="start-panel">
        <h2>Don't Tap White</h2>
        <p class="game-desc">Tap black blocks and avoid white blocks!</p>
        <div class="stats-preview" v-if="stats">
          <div class="stat-item">
            <span class="stat-label">Games</span>
            <span class="stat-value">{{ stats.totalGames }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Points</span>
            <span class="stat-value">{{ stats.totalPoints }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Best</span>
            <span class="stat-value">{{ stats.highScore }}</span>
          </div>
        </div>
        <button @click="startGame" class="btn-start">Start Game</button>
      </div>
    </div>

    <!-- 游戏结束界面 -->
    <div v-if="gameState.gameOver" class="game-overlay">
      <div class="game-over-panel">
        <h2 class="game-over-title">Game Over</h2>
        
        <!-- 评级展示 -->
        <div class="rank-display" :style="{ borderColor: rankColor }">
          <div class="rank-badge" :style="{ background: rankColor }">
            {{ performance?.rank }}
          </div>
          <div class="rank-message">{{ performance?.message }}</div>
        </div>

        <!-- 详细数据 -->
        <div class="performance-details">
          <div class="detail-row">
            <span class="detail-label">Score</span>
            <span class="detail-value">{{ performance?.score }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Accuracy</span>
            <span class="detail-value">{{ performance?.accuracy }}%</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Avg Speed</span>
            <span class="detail-value">{{ performance?.avgSpeed }} p/s</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Max Combo</span>
            <span class="detail-value">{{ performance?.maxCombo }}x</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Duration</span>
            <span class="detail-value">{{ formatDuration(performance?.duration || 0) }}</span>
          </div>
          <div class="detail-row highlight">
            <span class="detail-label">Points Earned</span>
            <span class="detail-value points">+{{ performance?.points }}</span>
          </div>
        </div>

        <!-- 按钮 -->
        <div class="game-over-buttons">
          <button @click="restartGame" class="btn-primary">Play Again</button>
          <button @click="viewStats" class="btn-secondary">Stats</button>
          <button @click="closeGame" class="btn-secondary">Close</button>
        </div>
      </div>
    </div>

    <!-- 暂停遮罩 -->
    <div v-if="gameState.isPaused && gameState.isPlaying" class="pause-overlay">
      <div class="pause-text">Paused</div>
      <button @click="togglePause" class="btn-resume">Resume</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { Block, GameState, GameConfig, GamePerformance, GameStats } from '@/types/game'
import { 
  calculatePerformance, 
  saveGameRecord, 
  updateGameStats,
  getGameStats,
  getHighScore,
  getRankColor,
  formatDuration
} from '@/utils/game'

// 定义事件
const emit = defineEmits<{
  close: []
  viewStats: []
}>()

// 游戏配置
const config: GameConfig = {
  initialSpeed: 2,
  speedIncrement: 0.3,
  speedIncrementInterval: 5,
  blockHeight: 150,
  boardWidth: 400,
  boardHeight: 600,
  columns: 4
}

// 游戏状态
const gameState = ref<GameState>({
  score: 0,
  speed: config.initialSpeed,
  isPlaying: false,
  isPaused: false,
  blocks: [],
  highScore: 0,
  gameOver: false,
  combo: 0,
  totalClicks: 0,
  correctClicks: 0,
  startTime: 0
})

// 游戏统计
const stats = ref<GameStats | null>(null)

// 游戏表现
const performance = ref<GamePerformance | null>(null)

// 当前行索引（用于生成新行）
let currentRowIndex = 0

// 动画帧ID
let animationFrameId: number | null = null

// 游戏区域引用
const gameBoard = ref<HTMLElement | null>(null)

// 最大连击记录
let maxCombo = 0

// 计算可见方块（只渲染屏幕内及附近的方块）
const visibleBlocks = computed(() => {
  return gameState.value.blocks.filter(row => {
    if (!row || row.length === 0) return false
    const block = row[0]
    // 渲染从顶部上方到底部下方的所有方块（留出缓冲区）
    return block.y >= -config.blockHeight * 3 && block.y <= config.boardHeight + config.blockHeight * 2
  })
})

// 评级颜色
const rankColor = computed(() => {
  return performance.value ? getRankColor(performance.value.rank) : '#FFD700'
})

/**
 * 初始化游戏
 */
async function initGame() {
  // 加载最高分和统计
  gameState.value.highScore = await getHighScore()
  stats.value = await getGameStats()
  
  // 重置状态
  gameState.value.score = 0
  gameState.value.speed = config.initialSpeed
  gameState.value.blocks = []
  gameState.value.gameOver = false
  gameState.value.isPaused = false
  gameState.value.combo = 0
  gameState.value.totalClicks = 0
  gameState.value.correctClicks = 0
  currentRowIndex = 0
  maxCombo = 0
  performance.value = null
  
  // 生成初始方块（填满屏幕）
  const rowsNeeded = Math.ceil(config.boardHeight / config.blockHeight) + 2
  for (let i = 0; i < rowsNeeded; i++) {
    const row: Block[] = []
    const blackCol = Math.floor(Math.random() * config.columns)
    
    // 从屏幕外上方开始生成，这样游戏开始时就可以滚动
    const startY = -config.blockHeight * 2
    
    for (let col = 0; col < config.columns; col++) {
      row.push({
        id: `${currentRowIndex}-${col}`,
        row: currentRowIndex,
        col: col,
        isBlack: col === blackCol,
        y: startY + i * config.blockHeight,
        clicked: false
      })
    }
    
    gameState.value.blocks.push(row)
    currentRowIndex++
  }
  
  console.log('[Game] Init complete, generated', gameState.value.blocks.length, 'rows')
  console.log('[Game] First row Y:', gameState.value.blocks[0]?.[0]?.y)
}

/**
 * 开始游戏
 */
function startGame() {
  gameState.value.isPlaying = true
  gameState.value.startTime = Date.now()
  startGameLoop()
  
  console.log('[Game] Game started')
}

/**
 * 生成一行方块（在顶部）
 */
function generateRow() {
  const row: Block[] = []
  const blackCol = Math.floor(Math.random() * config.columns)
  
  // 新行在屏幕顶部上方
  const initialY = -config.blockHeight
  
  for (let col = 0; col < config.columns; col++) {
    row.push({
      id: `${currentRowIndex}-${col}`,
      row: currentRowIndex,
      col: col,
      isBlack: col === blackCol,
      y: initialY,
      clicked: false
    })
  }
  
  gameState.value.blocks.unshift(row)
  currentRowIndex++
}

/**
 * 游戏主循环
 */
function gameLoop() {
  if (!gameState.value.isPlaying || gameState.value.isPaused) return
  
  // 更新所有方块位置（向下移动）
  gameState.value.blocks.forEach(row => {
    row.forEach(block => {
      block.y += gameState.value.speed
    })
  })
  
  // 检查底部方块（最后一行）
  const bottomRow = gameState.value.blocks[gameState.value.blocks.length - 1]
  if (bottomRow && bottomRow[0].y >= config.boardHeight) {
    // 检查是否有黑块未点击
    const unclickedBlack = bottomRow.find(b => b.isBlack && !b.clicked)
    if (unclickedBlack) {
      endGame('Black block slipped away')
      return
    }
    // 移除底部行
    gameState.value.blocks.pop()
  }
  
  // 顶部生成新行（当最上面的行完全进入屏幕时生成新行）
  const topRow = gameState.value.blocks[0]
  if (!topRow || topRow[0].y >= 0) {
    generateRow()
  }
  
  // 清理过远的方块（保持合理数量）
  if (gameState.value.blocks.length > 25) {
    gameState.value.blocks.splice(20)
  }
  
  // 继续循环
  animationFrameId = requestAnimationFrame(gameLoop)
}

/**
 * 开始游戏循环
 */
function startGameLoop() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  animationFrameId = requestAnimationFrame(gameLoop)
}

/**
 * 停止游戏循环
 */
function stopGameLoop() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

/**
 * 处理方块点击
 */
function handleBlockClick(block: Block) {
  if (!gameState.value.isPlaying || gameState.value.isPaused || block.clicked) return
  
  gameState.value.totalClicks++
  
  if (block.isBlack) {
    // ✅ 点击黑块 - 正确
    block.clicked = true
    gameState.value.score++
    gameState.value.correctClicks++
    gameState.value.combo++
    
    // 更新最大连击
    if (gameState.value.combo > maxCombo) {
      maxCombo = gameState.value.combo
    }
    
    // 难度递增
    if (gameState.value.score % config.speedIncrementInterval === 0) {
      gameState.value.speed += config.speedIncrement
      console.log('[Game] Speed increased to:', gameState.value.speed)
    }
    
    // 桌宠互动
    if (gameState.value.score % 10 === 0) {
      notifyPet('good', gameState.value.score)
    }
    
  } else {
    // ❌ 点击白块 - 游戏结束
    endGame('Tapped white block')
    notifyPet('bad')
  }
}

/**
 * 处理游戏区域点击（点到空白处）
 */
function handleBoardClick(e: MouseEvent) {
  // 如果点击的不是方块，也算点错
  if (gameState.value.isPlaying && !gameState.value.isPaused) {
    const target = e.target as HTMLElement
    if (target.classList.contains('game-board')) {
      gameState.value.totalClicks++
      endGame('Tapped empty area')
      notifyPet('bad')
    }
  }
}

/**
 * 结束游戏
 */
async function endGame(reason: string) {
  console.log('[Game] Game over:', reason)
  
  gameState.value.isPlaying = false
  gameState.value.gameOver = true
  gameState.value.endTime = Date.now()
  stopGameLoop()
  
  // 计算表现和积分
  const perf = calculatePerformance({
    ...gameState.value,
    combo: maxCombo  // 使用最大连击数
  })
  performance.value = perf
  
  console.log('[Game] Performance:', perf)
  
  // 保存记录和更新统计
  await saveGameRecord(perf)
  await updateGameStats(perf)
  
  // 更新最高分
  if (gameState.value.score > gameState.value.highScore) {
    gameState.value.highScore = gameState.value.score
    notifyPet('newRecord', gameState.value.score)
  } else {
    notifyPet('gameOver', gameState.value.score)
  }
  
  // 刷新统计
  stats.value = await getGameStats()
}

/**
 * 重新开始游戏
 */
async function restartGame() {
  stopGameLoop()
  await initGame()
  startGame()
}

/**
 * 切换暂停
 */
function togglePause() {
  if (!gameState.value.isPlaying) return
  
  gameState.value.isPaused = !gameState.value.isPaused
  
  if (gameState.value.isPaused) {
    stopGameLoop()
  } else {
    startGameLoop()
  }
}

/**
 * 关闭游戏
 */
function closeGame() {
  stopGameLoop()
  emit('close')
}

/**
 * 查看统计
 */
function viewStats() {
  emit('viewStats')
}

/**
 * 获取方块样式
 */
function getBlockStyle(block: Block) {
  const colWidth = config.boardWidth / config.columns
  return {
    position: 'absolute',
    top: `${block.y}px`,
    left: `${block.col * colWidth}px`,
    width: `${colWidth - 2}px`,
    height: `${config.blockHeight}px`
  }
}

/**
 * 通知桌宠
 */
function notifyPet(type: string, score?: number) {
  const messages = {
    good: ['Awesome!', 'Keep going!', 'Amazing!'],
    newRecord: ['🎉 New Record!', 'Record broken!', 'Incredible!'],
    gameOver: ['Try again!', 'So close!', 'Keep practicing!'],
    bad: ['Oops~', 'Don\'t give up!']
  }
  
  const msgArray = messages[type] || []
  const message = msgArray[Math.floor(Math.random() * msgArray.length)]
  
  window.postMessage({
    type: 'LIFEFI_PET_MESSAGE',
    message: score ? `${message} (Score: ${score})` : message
  }, '*')
}

// 生命周期
onMounted(async () => {
  await initGame()
  console.log('[Game] Don\'t Tap White loaded')
})

onUnmounted(() => {
  stopGameLoop()
})

// 监听游戏状态变化
watch(() => gameState.value.combo, (newCombo) => {
  // 连击重置
  if (newCombo === 0 && gameState.value.isPlaying) {
    // 连击中断
  }
})
</script>

<style scoped>
.game-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overflow: hidden;
}

/* ========== 顶部状态栏 ========== */
.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.score-display {
  display: flex;
  gap: 20px;
}

.score-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.score-item .label {
  font-size: 11px;
  color: #666;
  margin-bottom: 4px;
}

.score-item .value {
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.score-item .value.combo {
  color: #ff6b9d;
}

.game-controls {
  display: flex;
  gap: 8px;
}

.btn-control {
  width: 36px;
  height: 36px;
  border: none;
  background: #f3f4f6;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-control:hover {
  background: #e5e7eb;
  transform: scale(1.05);
}

/* ========== 游戏区域 ========== */
.game-board {
  position: relative;
  flex: 1;
  background: #fff;
  overflow: hidden;
  cursor: pointer;
}

.block {
  position: absolute;
  cursor: pointer;
  transition: opacity 0.1s;
  border: 1px solid #e5e7eb;
  box-sizing: border-box;
}

.block-black {
  background: #000;
}

.block-white {
  background: #fff;
}

.block-clicked {
  opacity: 0.3;
  pointer-events: none;
}

.block:hover {
  opacity: 0.9;
}

/* ========== 遮罩层 ========== */
.game-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ========== 开始界面 ========== */
.start-panel {
  background: white;
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  max-width: 350px;
  animation: slideUp 0.3s ease-out;
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

.start-panel h2 {
  margin: 0 0 12px 0;
  font-size: 28px;
  font-weight: bold;
  color: #333;
}

.game-desc {
  margin: 0 0 24px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.6;
}

.stats-preview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: bold;
  color: #667eea;
}

.btn-start {
  width: 100%;
  padding: 14px;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 16px;
  font-weight: bold;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-start:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* ========== 游戏结束界面 ========== */
.game-over-panel {
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 400px;
  animation: slideUp 0.3s ease-out;
}

.game-over-title {
  margin: 0 0 20px 0;
  font-size: 24px;
  font-weight: bold;
  color: #333;
  text-align: center;
}

.rank-display {
  margin-bottom: 24px;
  padding: 20px;
  border: 3px solid;
  border-radius: 12px;
  text-align: center;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7));
}

.rank-badge {
  display: inline-block;
  width: 60px;
  height: 60px;
  line-height: 60px;
  font-size: 32px;
  font-weight: bold;
  color: white;
  border-radius: 50%;
  margin-bottom: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.rank-message {
  font-size: 14px;
  color: #333;
  line-height: 1.6;
  white-space: pre-line;
}

.performance-details {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #e5e7eb;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row.highlight {
  background: linear-gradient(90deg, rgba(102, 126, 234, 0.1), transparent);
  margin: 8px -16px -16px -16px;
  padding: 12px 16px;
  border-radius: 0 0 12px 12px;
  border-bottom: none;
}

.detail-label {
  font-size: 13px;
  color: #666;
}

.detail-value {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.detail-value.points {
  font-size: 18px;
  color: #667eea;
  font-weight: bold;
}

.game-over-buttons {
  display: flex;
  gap: 12px;
}

.btn-primary,
.btn-secondary {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #f3f4f6;
  color: #666;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

/* ========== 暂停界面 ========== */
.pause-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  z-index: 100;
}

.pause-text {
  font-size: 32px;
  font-weight: bold;
  color: white;
}

.btn-resume {
  padding: 12px 32px;
  border: none;
  background: white;
  color: #333;
  font-size: 16px;
  font-weight: bold;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-resume:hover {
  transform: scale(1.05);
}
</style>

