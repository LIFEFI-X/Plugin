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
          <span class="label">Length</span>
          <span class="value">{{ gameState.snake.length }}</span>
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
    <div class="game-board" ref="gameBoard">
      <!-- 蛇身 -->
      <div
        v-for="(segment, index) in gameState.snake"
        :key="`snake-${index}`"
        :class="['snake-segment', { 'snake-head': index === 0 }]"
        :style="getSegmentStyle(segment)"
      ></div>
      
      <!-- 食物 -->
      <div
        v-if="gameState.food"
        class="food"
        :style="getFoodStyle(gameState.food)"
      ></div>
    </div>

    <!-- 开始界面 -->
    <div v-if="!gameState.isPlaying && !gameState.gameOver" class="game-overlay">
      <div class="start-panel">
        <h2>Snake Game</h2>
        <p class="game-desc">Use WASD keys to control the snake!</p>
        <div class="controls-hint">
          <div class="key-row">
            <kbd>W</kbd>
          </div>
          <div class="key-row">
            <kbd>A</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd>
          </div>
        </div>
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
            <span class="detail-label">Length</span>
            <span class="detail-value">{{ gameState.snake.length }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Accuracy</span>
            <span class="detail-value">{{ performance?.accuracy }}%</span>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { GamePerformance, GameStats } from '@/types/game'
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
}>()

// 游戏配置
const config = {
  cellSize: 20,
  gridWidth: 20,
  gridHeight: 28,
  initialSpeed: 150,
  speedIncrement: 5,
  speedIncrementInterval: 5
}

// 方向枚举
enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

// 位置类型
interface Position {
  x: number
  y: number
}

// 游戏状态
interface SnakeGameState {
  snake: Position[]
  direction: Direction
  nextDirection: Direction
  food: Position | null
  score: number
  highScore: number
  isPlaying: boolean
  isPaused: boolean
  gameOver: boolean
  totalMoves: number
  foodEaten: number
  startTime: number
  endTime?: number
}

const gameState = ref<SnakeGameState>({
  snake: [],
  direction: Direction.RIGHT,
  nextDirection: Direction.RIGHT,
  food: null,
  score: 0,
  highScore: 0,
  isPlaying: false,
  isPaused: false,
  gameOver: false,
  totalMoves: 0,
  foodEaten: 0,
  startTime: 0
})

// 游戏统计
const stats = ref<GameStats | null>(null)

// 游戏表现
const performance = ref<GamePerformance | null>(null)

// 游戏循环定时器
let gameLoopTimer: number | null = null
let currentSpeed = config.initialSpeed

// 游戏区域引用
const gameBoard = ref<HTMLElement | null>(null)

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
  gameState.value.snake = [
    { x: 5, y: 5 },
    { x: 4, y: 5 },
    { x: 3, y: 5 }
  ]
  gameState.value.direction = Direction.RIGHT
  gameState.value.nextDirection = Direction.RIGHT
  gameState.value.score = 0
  gameState.value.gameOver = false
  gameState.value.isPaused = false
  gameState.value.totalMoves = 0
  gameState.value.foodEaten = 0
  currentSpeed = config.initialSpeed
  performance.value = null
  
  // 生成第一个食物
  generateFood()
  
  console.log('[Snake] Init complete')
}

/**
 * 开始游戏
 */
function startGame() {
  gameState.value.isPlaying = true
  gameState.value.startTime = Date.now()
  startGameLoop()
  
  console.log('[Snake] Game started')
}

/**
 * 生成食物
 */
function generateFood() {
  const emptyCells: Position[] = []
  
  // 找出所有空位置
  for (let x = 0; x < config.gridWidth; x++) {
    for (let y = 0; y < config.gridHeight; y++) {
      const isSnake = gameState.value.snake.some(seg => seg.x === x && seg.y === y)
      if (!isSnake) {
        emptyCells.push({ x, y })
      }
    }
  }
  
  // 随机选择一个空位置
  if (emptyCells.length > 0) {
    const randomIndex = Math.floor(Math.random() * emptyCells.length)
    gameState.value.food = emptyCells[randomIndex]
  }
}

/**
 * 游戏主循环
 */
function gameLoop() {
  if (!gameState.value.isPlaying || gameState.value.isPaused) return
  
  // 更新方向
  gameState.value.direction = gameState.value.nextDirection
  
  // 计算蛇头新位置
  const head = gameState.value.snake[0]
  let newHead: Position
  
  switch (gameState.value.direction) {
    case Direction.UP:
      newHead = { x: head.x, y: head.y - 1 }
      break
    case Direction.DOWN:
      newHead = { x: head.x, y: head.y + 1 }
      break
    case Direction.LEFT:
      newHead = { x: head.x - 1, y: head.y }
      break
    case Direction.RIGHT:
      newHead = { x: head.x + 1, y: head.y }
      break
    default:
      newHead = { x: head.x, y: head.y }
  }
  
  // 检查碰撞
  if (checkCollision(newHead)) {
    endGame('Hit wall or self')
    return
  }
  
  // 移动蛇
  gameState.value.snake.unshift(newHead)
  gameState.value.totalMoves++
  
  // 检查是否吃到食物
  if (gameState.value.food && newHead.x === gameState.value.food.x && newHead.y === gameState.value.food.y) {
    // 吃到食物
    gameState.value.score += 10
    gameState.value.foodEaten++
    generateFood()
    
    // 速度递增
    if (gameState.value.foodEaten % config.speedIncrementInterval === 0) {
      currentSpeed = Math.max(50, currentSpeed - config.speedIncrement)
      console.log('[Snake] Speed increased, interval:', currentSpeed)
    }
    
    // 桌宠互动
    if (gameState.value.foodEaten % 5 === 0) {
      notifyPet('good', gameState.value.score)
    }
  } else {
    // 没吃到食物，移除尾巴
    gameState.value.snake.pop()
  }
}

/**
 * 检查碰撞
 */
function checkCollision(pos: Position): boolean {
  // 检查墙壁
  if (pos.x < 0 || pos.x >= config.gridWidth || pos.y < 0 || pos.y >= config.gridHeight) {
    return true
  }
  
  // 检查自身
  return gameState.value.snake.some(seg => seg.x === pos.x && seg.y === pos.y)
}

/**
 * 开始游戏循环
 */
function startGameLoop() {
  if (gameLoopTimer) {
    clearInterval(gameLoopTimer)
  }
  
  gameLoopTimer = window.setInterval(() => {
    gameLoop()
  }, currentSpeed)
}

/**
 * 停止游戏循环
 */
function stopGameLoop() {
  if (gameLoopTimer) {
    clearInterval(gameLoopTimer)
    gameLoopTimer = null
  }
}

/**
 * 处理键盘输入
 */
function handleKeyPress(e: KeyboardEvent) {
  if (!gameState.value.isPlaying || gameState.value.isPaused) return
  
  const key = e.key.toLowerCase()
  
  switch (key) {
    case 'w':
      if (gameState.value.direction !== Direction.DOWN) {
        gameState.value.nextDirection = Direction.UP
      }
      break
    case 's':
      if (gameState.value.direction !== Direction.UP) {
        gameState.value.nextDirection = Direction.DOWN
      }
      break
    case 'a':
      if (gameState.value.direction !== Direction.RIGHT) {
        gameState.value.nextDirection = Direction.LEFT
      }
      break
    case 'd':
      if (gameState.value.direction !== Direction.LEFT) {
        gameState.value.nextDirection = Direction.RIGHT
      }
      break
  }
}

/**
 * 结束游戏
 */
async function endGame(reason: string) {
  console.log('[Snake] Game over:', reason)
  
  gameState.value.isPlaying = false
  gameState.value.gameOver = true
  gameState.value.endTime = Date.now()
  stopGameLoop()
  
  // 计算表现和积分
  const duration = (gameState.value.endTime - gameState.value.startTime) / 1000
  const accuracy = gameState.value.totalMoves > 0 
    ? (gameState.value.foodEaten / gameState.value.totalMoves) * 100 * 10 // 调整准确率计算
    : 0
  
  const perf = calculatePerformance({
    score: gameState.value.score,
    speed: 0,
    isPlaying: false,
    isPaused: false,
    blocks: [],
    highScore: gameState.value.highScore,
    gameOver: true,
    combo: gameState.value.snake.length - 3, // 蛇的增长长度作为连击
    totalClicks: gameState.value.totalMoves,
    correctClicks: gameState.value.foodEaten,
    startTime: gameState.value.startTime,
    endTime: gameState.value.endTime
  })
  
  performance.value = perf
  
  console.log('[Snake] Performance:', perf)
  
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
 * 获取蛇段样式
 */
function getSegmentStyle(pos: Position) {
  return {
    left: `${pos.x * config.cellSize}px`,
    top: `${pos.y * config.cellSize}px`,
    width: `${config.cellSize}px`,
    height: `${config.cellSize}px`
  }
}

/**
 * 获取食物样式
 */
function getFoodStyle(pos: Position) {
  return {
    left: `${pos.x * config.cellSize}px`,
    top: `${pos.y * config.cellSize}px`,
    width: `${config.cellSize}px`,
    height: `${config.cellSize}px`
  }
}

/**
 * 通知桌宠
 */
function notifyPet(type: string, score?: number) {
  const messages: Record<string, string[]> = {
    good: ['Great!', 'Keep going!', 'Nice!'],
    newRecord: ['🎉 New Record!', 'Amazing!', 'Incredible!'],
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
  
  // 监听键盘事件
  window.addEventListener('keydown', handleKeyPress)
  
  console.log('[Snake] Game loaded')
})

onUnmounted(() => {
  stopGameLoop()
  window.removeEventListener('keydown', handleKeyPress)
})
</script>

<style scoped>
.game-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
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
  color: #11998e;
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
  background: #1a1a2e;
  background-image: 
    repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 20px, transparent 20px, transparent 40px),
    repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 20px, transparent 20px, transparent 40px);
  margin: 0 auto;
  width: 400px;
  height: 560px;
}

.snake-segment {
  position: absolute;
  background: #38ef7d;
  border-radius: 3px;
  transition: none;
  box-shadow: 0 0 5px rgba(56, 239, 125, 0.5);
}

.snake-head {
  background: #11998e;
  box-shadow: 0 0 10px rgba(17, 153, 142, 0.8);
  border-radius: 4px;
}

.food {
  position: absolute;
  background: #ff6b6b;
  border-radius: 50%;
  animation: pulse 0.5s infinite alternate;
  box-shadow: 0 0 15px rgba(255, 107, 107, 0.8);
}

@keyframes pulse {
  from {
    transform: scale(0.9);
    box-shadow: 0 0 15px rgba(255, 107, 107, 0.8);
  }
  to {
    transform: scale(1.1);
    box-shadow: 0 0 25px rgba(255, 107, 107, 1);
  }
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
  margin: 0 0 16px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.6;
}

.controls-hint {
  margin: 16px 0 24px 0;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
}

.key-row {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin: 6px 0;
}

kbd {
  display: inline-block;
  padding: 8px 16px;
  background: white;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-weight: bold;
  color: #11998e;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-width: 40px;
  text-align: center;
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
  color: #11998e;
}

.btn-start {
  width: 100%;
  padding: 14px;
  border: none;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  font-size: 16px;
  font-weight: bold;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-start:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(17, 153, 142, 0.4);
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
  background: linear-gradient(90deg, rgba(17, 153, 142, 0.1), transparent);
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
  color: #11998e;
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
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(17, 153, 142, 0.4);
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

