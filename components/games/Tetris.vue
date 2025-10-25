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
          <span class="label">Lines</span>
          <span class="value">{{ gameState.lines }}</span>
        </div>
        <div class="score-item">
          <span class="label">Level</span>
          <span class="value">{{ gameState.level }}</span>
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

    <!-- 游戏主体 -->
    <div class="game-body">
      <!-- 游戏区域 -->
      <div class="game-board" ref="gameBoard">
        <!-- 背景网格 -->
        <div
          v-for="(row, y) in config.rows"
          :key="`row-${y}`"
          class="grid-row"
        >
          <div
            v-for="(col, x) in config.cols"
            :key="`cell-${y}-${x}`"
            :class="['grid-cell', getCellClass(x, y)]"
            :style="getCellStyle(x, y)"
          ></div>
        </div>
      </div>

      <!-- 侧边栏 -->
      <div class="game-sidebar">
        <!-- 下一个方块 -->
        <div class="next-piece-panel">
          <h3>Next</h3>
          <div class="next-piece-preview">
            <div
              v-for="(row, y) in 4"
              :key="`next-row-${y}`"
              class="preview-row"
            >
              <div
                v-for="(col, x) in 4"
                :key="`next-cell-${y}-${x}`"
                :class="['preview-cell', { 'filled': isNextPieceCell(x, y) }]"
                :style="getNextPieceCellStyle(x, y)"
              ></div>
            </div>
          </div>
        </div>

        <!-- 操作提示 -->
        <div class="controls-hint">
          <h3>Controls</h3>
          <div class="hint-item">
            <kbd>W</kbd>
            <span>Rotate</span>
          </div>
          <div class="hint-item">
            <kbd>A</kbd>
            <span>Left</span>
          </div>
          <div class="hint-item">
            <kbd>S</kbd>
            <span>Soft Drop</span>
          </div>
          <div class="hint-item">
            <kbd>D</kbd>
            <span>Right</span>
          </div>
          <div class="hint-item">
            <kbd>Space</kbd>
            <span>Hard Drop</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 开始界面 -->
    <div v-if="!gameState.isPlaying && !gameState.gameOver" class="game-overlay">
      <div class="start-panel">
        <h2>Tetris</h2>
        <p class="game-desc">Use WASD keys to play!</p>
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
            <span class="detail-label">Lines</span>
            <span class="detail-value">{{ gameState.lines }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Level</span>
            <span class="detail-value">{{ gameState.level }}</span>
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
  rows: 20,
  cols: 10,
  cellSize: 25,
  initialSpeed: 1000,
  speedDecrement: 50,
  maxSpeed: 100
}

// 方块形状定义 (I, O, T, S, Z, J, L)
const SHAPES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  O: [
    [1, 1],
    [1, 1]
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0]
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0]
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0]
  ]
}

// 方块颜色
const COLORS = {
  I: '#00f0f0',
  O: '#f0f000',
  T: '#a000f0',
  S: '#00f000',
  Z: '#f00000',
  J: '#0000f0',
  L: '#f0a000'
}

type ShapeType = keyof typeof SHAPES

interface Piece {
  shape: number[][]
  type: ShapeType
  x: number
  y: number
  color: string
}

interface TetrisGameState {
  board: (string | null)[][]
  currentPiece: Piece | null
  nextPiece: Piece | null
  score: number
  lines: number
  level: number
  highScore: number
  isPlaying: boolean
  isPaused: boolean
  gameOver: boolean
  startTime: number
  endTime?: number
  totalClicks: number
  correctClicks: number
}

const gameState = ref<TetrisGameState>({
  board: [],
  currentPiece: null,
  nextPiece: null,
  score: 0,
  lines: 0,
  level: 1,
  highScore: 0,
  isPlaying: false,
  isPaused: false,
  gameOver: false,
  startTime: 0,
  totalClicks: 0,
  correctClicks: 0
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
 * 创建空棋盘
 */
function createEmptyBoard(): (string | null)[][] {
  return Array(config.rows).fill(null).map(() => Array(config.cols).fill(null))
}

/**
 * 创建随机方块
 */
function createRandomPiece(): Piece {
  const types = Object.keys(SHAPES) as ShapeType[]
  const type = types[Math.floor(Math.random() * types.length)]
  const shape = SHAPES[type]
  
  return {
    shape: shape.map(row => [...row]),
    type,
    x: Math.floor(config.cols / 2) - Math.floor(shape[0].length / 2),
    y: 0,
    color: COLORS[type]
  }
}

/**
 * 初始化游戏
 */
async function initGame() {
  // 加载最高分和统计
  gameState.value.highScore = await getHighScore()
  stats.value = await getGameStats()
  
  // 重置状态
  gameState.value.board = createEmptyBoard()
  gameState.value.currentPiece = createRandomPiece()
  gameState.value.nextPiece = createRandomPiece()
  gameState.value.score = 0
  gameState.value.lines = 0
  gameState.value.level = 1
  gameState.value.gameOver = false
  gameState.value.isPaused = false
  gameState.value.totalClicks = 0
  gameState.value.correctClicks = 0
  currentSpeed = config.initialSpeed
  performance.value = null
  
  console.log('[Tetris] Init complete')
}

/**
 * 开始游戏
 */
function startGame() {
  gameState.value.isPlaying = true
  gameState.value.startTime = Date.now()
  startGameLoop()
  
  console.log('[Tetris] Game started')
}

/**
 * 检查碰撞
 */
function checkCollision(piece: Piece, offsetX = 0, offsetY = 0): boolean {
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x]) {
        const newX = piece.x + x + offsetX
        const newY = piece.y + y + offsetY
        
        // 检查边界
        if (newX < 0 || newX >= config.cols || newY >= config.rows) {
          return true
        }
        
        // 检查已有方块
        if (newY >= 0 && gameState.value.board[newY][newX]) {
          return true
        }
      }
    }
  }
  return false
}

/**
 * 旋转方块
 */
function rotatePiece(piece: Piece): number[][] {
  const size = piece.shape.length
  const rotated: number[][] = Array(size).fill(null).map(() => Array(size).fill(0))
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      rotated[x][size - 1 - y] = piece.shape[y][x]
    }
  }
  
  return rotated
}

/**
 * 锁定方块到棋盘
 */
function lockPiece() {
  if (!gameState.value.currentPiece) return
  
  const piece = gameState.value.currentPiece
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x]) {
        const boardY = piece.y + y
        const boardX = piece.x + x
        if (boardY >= 0) {
          gameState.value.board[boardY][boardX] = piece.color
        }
      }
    }
  }
  
  // 检查消除行
  clearLines()
  
  // 生成新方块
  gameState.value.currentPiece = gameState.value.nextPiece
  gameState.value.nextPiece = createRandomPiece()
  
  // 检查游戏是否结束
  if (checkCollision(gameState.value.currentPiece!)) {
    endGame('Game over')
  }
}

/**
 * 消除完整的行
 */
function clearLines() {
  let linesCleared = 0
  
  for (let y = config.rows - 1; y >= 0; y--) {
    if (gameState.value.board[y].every(cell => cell !== null)) {
      // 移除这一行
      gameState.value.board.splice(y, 1)
      // 在顶部添加新的空行
      gameState.value.board.unshift(Array(config.cols).fill(null))
      linesCleared++
      y++ // 重新检查当前行
    }
  }
  
  if (linesCleared > 0) {
    gameState.value.lines += linesCleared
    gameState.value.correctClicks += linesCleared
    
    // 计算分数 (单行100, 双行300, 三行500, 四行800)
    const scoreMap = [0, 100, 300, 500, 800]
    const points = scoreMap[Math.min(linesCleared, 4)] * gameState.value.level
    gameState.value.score += points
    
    // 升级 (每10行升一级)
    const newLevel = Math.floor(gameState.value.lines / 10) + 1
    if (newLevel > gameState.value.level) {
      gameState.value.level = newLevel
      currentSpeed = Math.max(config.maxSpeed, config.initialSpeed - (newLevel - 1) * config.speedDecrement)
      console.log('[Tetris] Level up:', newLevel, 'Speed:', currentSpeed)
      
      // 重启游戏循环以应用新速度
      if (gameState.value.isPlaying && !gameState.value.isPaused) {
        stopGameLoop()
        startGameLoop()
      }
    }
    
    // 桌宠互动
    if (linesCleared >= 4) {
      notifyPet('tetris', gameState.value.score)
    } else if (linesCleared >= 2) {
      notifyPet('good', gameState.value.score)
    }
  }
}

/**
 * 游戏主循环
 */
function gameLoop() {
  if (!gameState.value.isPlaying || gameState.value.isPaused || !gameState.value.currentPiece) return
  
  // 方块下落
  if (!checkCollision(gameState.value.currentPiece, 0, 1)) {
    gameState.value.currentPiece.y++
  } else {
    // 锁定方块
    lockPiece()
  }
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
  if (!gameState.value.isPlaying || gameState.value.isPaused || !gameState.value.currentPiece) return
  
  const key = e.key.toLowerCase()
  const piece = gameState.value.currentPiece
  gameState.value.totalClicks++
  
  switch (key) {
    case 'w':
      // 旋转
      const rotated = rotatePiece(piece)
      const testPiece = { ...piece, shape: rotated }
      if (!checkCollision(testPiece)) {
        piece.shape = rotated
      }
      break
      
    case 'a':
      // 向左
      if (!checkCollision(piece, -1, 0)) {
        piece.x--
      }
      break
      
    case 's':
      // 向下加速
      if (!checkCollision(piece, 0, 1)) {
        piece.y++
        gameState.value.score += 1 // 软降加分
      }
      break
      
    case 'd':
      // 向右
      if (!checkCollision(piece, 1, 0)) {
        piece.x++
      }
      break
      
    case ' ':
      // 硬降 (直接落到底)
      e.preventDefault()
      let dropDistance = 0
      while (!checkCollision(piece, 0, 1)) {
        piece.y++
        dropDistance++
      }
      gameState.value.score += dropDistance * 2 // 硬降加分更多
      lockPiece()
      break
  }
}

/**
 * 结束游戏
 */
async function endGame(reason: string) {
  console.log('[Tetris] Game over:', reason)
  
  gameState.value.isPlaying = false
  gameState.value.gameOver = true
  gameState.value.endTime = Date.now()
  stopGameLoop()
  
  // 计算表现和积分
  const perf = calculatePerformance({
    score: gameState.value.score,
    combo: gameState.value.lines, // 用消除的行数作为combo
    totalClicks: gameState.value.totalClicks,
    correctClicks: gameState.value.correctClicks,
    startTime: gameState.value.startTime,
    endTime: gameState.value.endTime || Date.now(),
    speed: 0,
    isPlaying: false,
    isPaused: false,
    blocks: [],
    highScore: gameState.value.highScore,
    gameOver: true
  } as any)
  performance.value = perf
  
  console.log('[Tetris] Performance:', perf)
  
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
 * 获取单元格类名
 */
function getCellClass(x: number, y: number): string {
  // 检查是否是当前方块
  if (gameState.value.currentPiece) {
    const piece = gameState.value.currentPiece
    const relX = x - piece.x
    const relY = y - piece.y
    
    if (relY >= 0 && relY < piece.shape.length && 
        relX >= 0 && relX < piece.shape[0].length &&
        piece.shape[relY][relX]) {
      return 'filled current-piece'
    }
  }
  
  // 检查是否是已锁定的方块
  if (gameState.value.board[y]?.[x]) {
    return 'filled locked'
  }
  
  return ''
}

/**
 * 获取单元格样式
 */
function getCellStyle(x: number, y: number): any {
  // 当前方块的颜色
  if (gameState.value.currentPiece) {
    const piece = gameState.value.currentPiece
    const relX = x - piece.x
    const relY = y - piece.y
    
    if (relY >= 0 && relY < piece.shape.length && 
        relX >= 0 && relX < piece.shape[0].length &&
        piece.shape[relY][relX]) {
      return { backgroundColor: piece.color }
    }
  }
  
  // 已锁定方块的颜色
  const color = gameState.value.board[y]?.[x]
  if (color) {
    return { backgroundColor: color }
  }
  
  return {}
}

/**
 * 检查是否是下一个方块的单元格
 */
function isNextPieceCell(x: number, y: number): boolean {
  if (!gameState.value.nextPiece) return false
  
  const piece = gameState.value.nextPiece
  return y < piece.shape.length && x < piece.shape[0].length && piece.shape[y][x] === 1
}

/**
 * 获取下一个方块单元格样式
 */
function getNextPieceCellStyle(x: number, y: number): any {
  if (isNextPieceCell(x, y) && gameState.value.nextPiece) {
    return { backgroundColor: gameState.value.nextPiece.color }
  }
  return {}
}

/**
 * 通知桌宠
 */
function notifyPet(type: string, score?: number) {
  const messages: Record<string, string[]> = {
    good: ['Nice!', 'Good job!', 'Keep going!'],
    tetris: ['🎉 Tetris!', 'Amazing!', 'Incredible!'],
    newRecord: ['🎉 New Record!', 'Record broken!', 'Fantastic!'],
    gameOver: ['Try again!', 'So close!', 'Keep practicing!']
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
  window.addEventListener('keydown', handleKeyPress)
  console.log('[Tetris] Game loaded')
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overflow: hidden;
  min-height: 600px;
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

/* ========== 游戏主体 ========== */
.game-body {
  flex: 1;
  display: flex;
  gap: 16px;
  padding: 16px;
  overflow: auto;
  justify-content: center;
  align-items: flex-start;
  min-height: 0;
}

/* ========== 游戏区域 ========== */
.game-board {
  background: #1a1a2e;
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.grid-row {
  display: flex;
  line-height: 0;
}

.grid-cell {
  width: 25px;
  height: 25px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.05);
  transition: all 0.1s;
}

.grid-cell.filled {
  border-color: rgba(0, 0, 0, 0.3);
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.2);
}

.grid-cell.current-piece {
  animation: pieceGlow 0.5s ease-in-out infinite alternate;
}

@keyframes pieceGlow {
  from {
    filter: brightness(1);
  }
  to {
    filter: brightness(1.2);
  }
}

/* ========== 侧边栏 ========== */
.game-sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 170px;
  max-width: 190px;
  flex-shrink: 0;
}

.next-piece-panel,
.controls-hint {
  background: white;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.next-piece-panel h3,
.controls-hint h3 {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.next-piece-preview {
  background: #1a1a2e;
  border-radius: 8px;
  padding: 10px;
  display: inline-block;
}

.preview-row {
  display: flex;
  line-height: 0;
}

.preview-cell {
  width: 18px;
  height: 18px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.05);
}

.preview-cell.filled {
  border-color: rgba(0, 0, 0, 0.3);
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.2);
}

.hint-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  font-size: 12px;
  color: #666;
}

kbd {
  display: inline-block;
  padding: 3px 6px;
  font-size: 11px;
  font-weight: 600;
  color: #333;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  min-width: 24px;
  text-align: center;
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

