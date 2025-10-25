<template>
  <!-- 对话框 -->
  <ChatDialog
    :visible="showChatDialog"
    :initial-message="chatInitialMessage"
    :current-actor="currentActor"
    @close="showChatDialog = false"
  />
  
  <div class="asoul-pet-container">
    <!-- 桌宠图片 -->
    <img
      :src="currentImage"
      :class="['asoul-pet-image', { 'face-left': faceDirection === 'left' }]"
      :style="petStyle"
      alt="asoul-pet"
      draggable="false"
      @mousedown="handleMouseDown"
      @dblclick="toggleSettings"
      @dragover.prevent
      @drop="handleDrop"
      @selectstart.prevent
    />
    
    <!-- 设置/游戏/任务面板 -->
    <div v-if="showSettings" class="settings-panel" :style="settingsStyle">
      <!-- 游戏视图 -->
      <div v-if="showGameInPanel" class="game-view">
        <GameMenu @close="closeGamePanel" />
      </div>
      
      <!-- 任务视图 -->
      <div v-else-if="showTaskInPanel" class="task-view">
        <button class="panel-close-btn" @click="closeTaskPanel">← Back</button>
        <div class="task-content">
          <TaskPanel />
        </div>
      </div>
      
      <!-- 设置视图 -->
      <div v-else class="settings-view">
        <div class="settings-header">
          <h3>{{ t('pet.selectCharacter') }}</h3>
          <button class="close-btn" @click="showSettings = false">×</button>
        </div>
        <div class="character-grid">
          <div
            v-for="char in characters"
            :key="char"
            :class="['character-item', { active: currentActor === char }]"
            @click="changeCharacter(char)"
          >
            <img :src="getCharacterImage(char)" :alt="t(`pet.characters.${char}`)" />
            <span>{{ t(`pet.characters.${char}`) }}</span>
          </div>
        </div>
        
        <!-- 快捷入口 -->
        <div class="settings-actions">
          <button @click="openTaskPanel" class="action-btn task-btn">
            <span class="btn-icon">🎯</span>
            <span class="btn-text">Daily Tasks</span>
          </button>
          <button @click="openGamePanel" class="action-btn game-btn">
            <span class="btn-icon">🎮</span>
            <span class="btn-text">Game Center</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 消息气泡 -->
    <div
      v-if="messageVisible"
      :class="['message-bubble', { 'is-recommendation': recommendationData }]"
      :style="messageStyle"
      @click="handleMessageClick"
    >
      <p>{{ currentMessage }}</p>
    </div>

    <!-- 倒计时显示（头顶） -->
    <div
      v-if="countdownVisible"
      class="countdown-text"
      :style="countdownStyle"
    >
      {{ countdownMessage }}
    </div>
    
    <!-- 诱饵 -->
    <img
      v-if="baitVisible"
      :src="baitImage"
      class="bait-image"
      :style="baitStyle"
      alt="bait"
      draggable="false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import browser from 'webextension-polyfill'
import { t } from '@/utils/i18n'
import ChatDialog from './ChatDialog.vue'
import GameMenu from './games/GameMenu.vue'
import TaskPanel from './TaskPanel.vue'

// 角色配置表
const TABLE = {
  diana: { bait: 'candy', cursor: 'cursor-diana.png' },
  ava: { bait: 'bowl', cursor: 'cursor-ava.png' },
  bella: { bait: 'star', cursor: 'cursor-bella.png' },
  carol: { bait: 'knight', cursor: 'cursor-carol.png' },
  eileen: { bait: 'icecream', cursor: 'cursor-eileen.png' },
  luna: { bait: 'moon', cursor: 'cursor-luna.png' }
}

// 状态管理
const currentActor = ref<'diana' | 'ava' | 'bella' | 'carol' | 'eileen' | 'luna'>('luna')
const currentStatus = ref<string>('thinking')
const position = ref({ x: window.innerWidth - 150, y: window.innerHeight - 150 })
const faceDirection = ref<'left' | 'right'>('right')

// 消息
const messageVisible = ref(false)
const currentMessage = ref('')
const messagePosition = ref({ x: 0, y: 0 })

// 倒计时消息
const countdownVisible = ref(false)
const countdownMessage = ref('')
const countdownPosition = ref({ x: 0, y: 0 })

// 推荐数据（使用消息气泡显示）
const recommendationData = ref<any>(null)

// 诱饵
const baitVisible = ref(false)
const baitType = ref<string>('candy')
const baitPosition = ref({ x: 0, y: 0 })

// 拖拽状态
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const initialPos = ref({ x: 0, y: 0 })
let isMouseDown = false // 全局鼠标按下标志

// 键盘控制状态
const keyPressed = ref<Set<string>>(new Set())
const moveSpeed = 5 // 移动速度（像素/帧）
const jumpHeight = 100 // 跳跃高度
let animationFrameId: number | null = null
let isJumping = false

// 设置面板
const showSettings = ref(false)
const showGameInPanel = ref(false)
const showTaskInPanel = ref(false)
const characters = ['diana', 'ava', 'bella', 'carol', 'eileen','luna'] as const

// 对话框
const showChatDialog = ref(false)
const chatInitialMessage = ref('')

// 游戏面板
function openGamePanel() {
  showGameInPanel.value = true
  showTaskInPanel.value = false
  showRandomMessage('Let\'s play!')
}

function closeGamePanel() {
  showGameInPanel.value = false
  // 不disabled设置面板，返回设置视图
}

// 任务面板
function openTaskPanel() {
  showTaskInPanel.value = true
  showGameInPanel.value = false
  showRandomMessage('Check your tasks!')
}

function closeTaskPanel() {
  showTaskInPanel.value = false
  // 不disabled设置面板，返回设置视图
}

// 吃字模式
const eatingMode = ref(false)
let eatingTimer: number | null = null

// 洗澡模式
const bathingMode = ref(false)
let bathCheckTimer: number | null = null

// 计算属性
const currentImage = computed(() => {
  return browser.runtime.getURL(`asoul/${currentActor.value}/${currentStatus.value}.png`)
})

const baitImage = computed(() => {
  return browser.runtime.getURL(`asoul/${baitType.value}.png`)
})

const petStyle = computed(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`
}))

const messageStyle = computed(() => ({
  left: `${messagePosition.value.x}px`,
  top: `${messagePosition.value.y}px`
}))

const countdownStyle = computed(() => ({
  left: `${position.value.x + 50}px`,
  top: `${position.value.y - 25}px`
}))

const baitStyle = computed(() => ({
  left: `${baitPosition.value.x}px`,
  top: `${baitPosition.value.y}px`
}))

const settingsStyle = computed(() => ({
  left: `${position.value.x + 120}px`,
  top: `${position.value.y}px`
}))

// ==================== 核心功能：拖拽 ====================

// 鼠标按下（在桌宠上）
function handleMouseDown(e: MouseEvent) {
  console.log('[ASoulPet] 🖱️ mousedown on pet', {
    target: (e.target as HTMLElement).className,
    clientX: e.clientX,
    clientY: e.clientY
  })
  
  e.preventDefault()
  e.stopPropagation()
  
  isMouseDown = true
  isDragging.value = false
  dragStart.value = { x: e.clientX, y: e.clientY }
  initialPos.value = { ...position.value }
  
  // 点击时显示互动状态
  hideMessage()
  updateStatus('interact_1')
  
  console.log('[ASoulPet] ✅ mousedown handled, isMouseDown=true, isDragging=false')
}

// 全局鼠标移动
function handleDocumentMouseMove(e: MouseEvent) {
  if (!isMouseDown) return
  
  const deltaX = e.clientX - dragStart.value.x
  const deltaY = e.clientY - dragStart.value.y
  
  // 判断是否开始拖拽（移动超过 5px）
  if (!isDragging.value && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
    isDragging.value = true
    console.log('[ASoulPet] 🚀 Drag started (isDragging=true)', { deltaX, deltaY })
  }
  
  if (!isDragging.value) return
  
  // 更新位置
  let newX = initialPos.value.x + deltaX
  let newY = initialPos.value.y + deltaY
  
  // 限制在视口内
  newX = Math.max(0, Math.min(window.innerWidth - 100, newX))
  newY = Math.max(0, Math.min(window.innerHeight - 100, newY))
  
  position.value = { x: newX, y: newY }
  
  // 更新朝向
  updateDirection(e.clientX)
}

// 全局鼠标松开
function handleDocumentMouseUp(e: MouseEvent) {
  console.log('[ASoulPet] 🖱️ mouseup on document', {
    isMouseDown,
    isDragging: isDragging.value,
    target: (e.target as HTMLElement).className || (e.target as HTMLElement).tagName,
    clientX: e.clientX,
    clientY: e.clientY
  })
  
  if (!isMouseDown) {
    console.log('[ASoulPet] ⏭️ Skipping drag; isMouseDown=false')
    return
  }
  
  const wasDragging = isDragging.value
  
  // 立即重置所有拖拽状态
  isMouseDown = false
  isDragging.value = false
  
  console.log('[ASoulPet] ✅ mouseup handled, reset: isMouseDown=false, isDragging=false, wasDragging=' + wasDragging)
  
  // 如果进行了拖拽，显示随机消息
  if (wasDragging) {
    setTimeout(() => {
      updateStatus('rand')
      showRandomMessage()
      saveSettings()
    }, 300)
  } else {
    // 只是点击，不是拖拽
    setTimeout(() => {
      updateStatus('rand')
      showRandomMessage()
    }, 500)
  }
}

// ==================== 核心功能：朝向鼠标（facingToMouse）====================

let facingMouseEnabled = false
let facingDebounce: number | null = null

function enableFacingMouse() {
  facingMouseEnabled = true
  document.addEventListener('mousemove', handleFacingMouse)
  console.log('[ASoulPet] facingToMouse enabled (orientation only)')
}

function disableFacingMouse() {
  facingMouseEnabled = false
  document.removeEventListener('mousemove', handleFacingMouse)
}

function handleFacingMouse(e: MouseEvent) {
  if (!facingMouseEnabled) return
  if (isDragging.value) return // 拖拽时不改变朝向
  
  if (facingDebounce) {
    clearTimeout(facingDebounce)
  }
  
  facingDebounce = window.setTimeout(() => {
    updateDirection(e.clientX)
  }, 85)
}

// ==================== 核心功能：跟随鼠标（followMouse）====================

let followMouseEnabled = false
let followDebounce: number | null = null

function enableFollowMouse() {
  followMouseEnabled = true
  document.addEventListener('mousemove', handleFollowMouse)
  console.log('[ASoulPet] followMouse enabled (character follows cursor)')
}

function disableFollowMouse() {
  followMouseEnabled = false
  document.removeEventListener('mousemove', handleFollowMouse)
}

function handleFollowMouse(e: MouseEvent) {
  if (!followMouseEnabled) return
  if (isDragging.value) return
  
  if (followDebounce) {
    clearTimeout(followDebounce)
  }
  
  followDebounce = window.setTimeout(() => {
    chaseTarget({ x: e.clientX, y: e.clientY })
  }, 75)
}

// ==================== 核心功能：点击追踪（followClick）====================

let clickTrackingEnabled = false

function enableClickTracking() {
  clickTrackingEnabled = true
  document.addEventListener('mousedown', handleDocumentClick)
  console.log('[ASoulPet] followClick enabled (click spawns lure)')
}

function disableClickTracking() {
  clickTrackingEnabled = false
  document.removeEventListener('mousedown', handleDocumentClick)
}

let baitTimeout: number | null = null

function handleDocumentClick(e: MouseEvent) {
  if (!clickTrackingEnabled) return
  
  // 如果点击的是桌宠自己，不触发追逐
  const target = e.target as HTMLElement
  if (target.classList && target.classList.contains('asoul-pet-image')) {
    return
  }
  
  // 清除之前的诱饵
  if (baitTimeout) {
    clearTimeout(baitTimeout)
  }
  baitVisible.value = false
  
  // 显示新诱饵
  baitType.value = TABLE[currentActor.value].bait
  baitPosition.value = {
    x: e.clientX - 75,
    y: e.clientY - 75
  }
  baitVisible.value = true
  
  // 追逐诱饵
  chaseTarget({ x: e.clientX, y: e.clientY })
  
  // 5秒后移除诱饵
  baitTimeout = window.setTimeout(() => {
    baitVisible.value = false
  }, 5000)
}

// ==================== 核心功能：键盘控制 ====================

function handleKeyDown(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  
  // 吃字模式切换 - 优先处理，不受输入框限制
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    toggleEatingMode()
    console.log('[ASoulPet] Typing-eater mode toggled:', eatingMode.value ? 'enabled' : 'disabled')
    return
  }
  
  // 如果在输入框中，其他键盘控制不响应
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
    return
  }
  
  keyPressed.value.add(e.key)
  
  // 跳跃
  if (e.key === 'ArrowUp' && !isJumping) {
    performJump()
  }

  // 开始移动动画
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    // 如果在洗澡模式，走出浴缸
    if (bathingMode.value) {
      exitBathingMode()
    }
    
    if (!animationFrameId) {
      startMoveAnimation()
    }
  }
}

function handleKeyUp(e: KeyboardEvent) {
  keyPressed.value.delete(e.key)
  
  // 停止移动动画
  if (!keyPressed.value.has('ArrowLeft') && !keyPressed.value.has('ArrowRight')) {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
      updateStatus('thinking')
    }
  }
}

function startMoveAnimation() {
  const animate = () => {
    let moved = false

    if (keyPressed.value.has('ArrowLeft')) {
      position.value.x = Math.max(0, position.value.x - moveSpeed)
      faceDirection.value = 'left'
      moved = true
    }

    if (keyPressed.value.has('ArrowRight')) {
      position.value.x = Math.min(window.innerWidth - 100, position.value.x + moveSpeed)
      faceDirection.value = 'right'
      moved = true
    }

    if (moved) {
      updateStatus('chasing')
      // 移动时不保存，避免频繁保存超配额
    }

    if (keyPressed.value.has('ArrowLeft') || keyPressed.value.has('ArrowRight')) {
      animationFrameId = requestAnimationFrame(animate)
    } else {
      animationFrameId = null
      updateStatus('thinking')
      // 移动结束后才保存一次
      saveSettings()
    }
  }

  animate()
}

function performJump() {
  isJumping = true
  const startY = position.value.y
  const startTime = Date.now()
  const duration = 500 // 跳跃持续时间

  updateStatus('happy')

  const jump = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)

    // 抛物线运动
    const jumpProgress = Math.sin(progress * Math.PI)
    position.value.y = startY - jumpHeight * jumpProgress

    if (progress < 1) {
      requestAnimationFrame(jump)
    } else {
      position.value.y = startY
      isJumping = false
      updateStatus('thinking')
      // 跳跃结束后保存
      saveSettings()
    }
  }

  jump()
}

// ==================== 辅助功能 ====================

// 更新朝向
function updateDirection(mouseX: number) {
  const petCenterX = position.value.x + 50
  faceDirection.value = mouseX >= petCenterX ? 'right' : 'left'
}

// 更新状态
function updateStatus(status: string) {
  if (status === 'rand') {
    const randomNum = Math.floor(Math.random() * 8) + 2 // 2-9
    status = `interact_${randomNum}`
  }
  currentStatus.value = status
}

// 追逐目标
let chaseAnimation: number | null = null

function chaseTarget(target: { x: number, y: number }) {
  if (chaseAnimation) {
    cancelAnimationFrame(chaseAnimation)
  }
  
  hideMessage()
  updateDirection(target.x)
  updateStatus('chasing')
  
  const startX = position.value.x
  const startY = position.value.y
  const endX = Math.max(0, Math.min(window.innerWidth - 100, target.x - 50))
  const endY = Math.max(0, Math.min(window.innerHeight - 100, target.y - 75))
  
  const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2))
  const speed = 200 // px per second
  const duration = (distance / speed) * 1000
  const startTime = Date.now()
  
  function animate() {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    position.value = {
      x: startX + (endX - startX) * progress,
      y: startY + (endY - startY) * progress
    }
    
    if (progress < 1) {
      chaseAnimation = requestAnimationFrame(animate)
    } else {
      updateStatus('thinking')
      chaseAnimation = null
    }
  }
  
  animate()
}

// 显示随机消息
let messageTimer: number | null = null

async function showRandomMessage(customMessage?: string) {
  try {
    let message = customMessage
    
    if (!message) {
      // 从语言包获取消息
      const actorMessages = t(`pet.messages.${currentActor.value}`)
      if (Array.isArray(actorMessages) && actorMessages.length > 0) {
        const randomIndex = Math.floor(Math.random() * actorMessages.length)
        message = actorMessages[randomIndex]
      }
    }
    
    if (message) {
      currentMessage.value = message
      messagePosition.value = {
        x: position.value.x + 100,
        y: position.value.y + 50
      }
      messageVisible.value = true
      
      // 3秒后自动隐藏（延长显示时间）
      if (messageTimer) {
        clearTimeout(messageTimer)
      }
      messageTimer = window.setTimeout(() => {
        hideMessage()
      }, 3000)
    }
  } catch (error) {
    console.error('[ASoulPet] Failed to fetch message:', error)
  }
}

function hideMessage() {
  messageVisible.value = false
  if (messageTimer) {
    clearTimeout(messageTimer)
  }
}

// 处理拖拽收藏（添加到上下文）
async function handleDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  
  const text = e.dataTransfer?.getData('text/plain')
  if (text) {
    // 发送消息到 content script 保存为上下文
    try {
      await browser.runtime.sendMessage({
        type: 'LIFEFI_SAVE_CONTEXT',
        data: { text }
      })
      
      showRandomMessage('收到！')
      updateStatus('rand')
    } catch (error) {
      console.error('[ASoulPet] Failed to save context:', error)
    }
  }
}

// 空闲动画
let idleTimer: number | null = null

function startIdleAnimation() {
  idleTimer = window.setInterval(() => {
    if (currentStatus.value === 'thinking' && Math.random() > 0.7) {
      updateStatus('rand')
      setTimeout(() => {
        updateStatus('thinking')
      }, 1500)
    }
  }, 5000)
}

// ==================== 配置管理 ====================

async function loadSettings() {
  try {
    const result = await browser.storage.sync.get('ASOUL_CONFIG')
    if (result.ASOUL_CONFIG) {
      const config = JSON.parse(result.ASOUL_CONFIG)
      
      // 设置角色
      if (config.currentActor) {
        currentActor.value = config.currentActor
      }
      
      // 设置位置
      if (config.position) {
        position.value = config.position
      }
      
      // 启用互动功能（只有明确配置为 true 才启用）
      if (config.followMouse === true) {
        enableFollowMouse()
      }
      
      if (config.followClick === true) {
        enableClickTracking()
      }
      
      console.log('[ASoulPet] Configuration loaded:', config)
    }
  } catch (error) {
    console.error('[ASoulPet] Failed to load settings:', error)
  }
}

async function saveSettings() {
  try {
    const config = {
      currentActor: currentActor.value,
      position: position.value,
      followMouse: followMouseEnabled,
      followClick: clickTrackingEnabled
    }
    
    await browser.storage.sync.set({
      ASOUL_CONFIG: JSON.stringify(config)
    })
  } catch (error) {
    console.error('[ASoulPet] Failed to save settings:', error)
  }
}

// ==================== 生命周期 ====================

// ==================== 吃字功能 ====================

function toggleEatingMode() {
  eatingMode.value = !eatingMode.value
  
  if (eatingMode.value) {
    showRandomMessage(t('pet.modes.eating'))
    startEating()
  } else {
    showRandomMessage(t('pet.modes.normal'))
    stopEating()
  }
}

function startEating() {
  if (eatingTimer) {
    clearInterval(eatingTimer)
  }

  eatingTimer = window.setInterval(() => {
    if (!eatingMode.value) {
      stopEating()
      return
    }

    const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement

    // 检查是否是可编辑元素
    const isEditable = (
      activeElement &&
      (activeElement.tagName === 'INPUT' || 
       activeElement.tagName === 'TEXTAREA' || 
       activeElement.isContentEditable)
    )

    if (!isEditable) {
      // 没有聚焦的输入框，随机在页面找一个
      const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="search"], textarea'))
      const validInputs = inputs.filter((input: any) => input.value && input.value.length > 0)
      
      if (validInputs.length > 0) {
        const randomInput = validInputs[Math.floor(Math.random() * validInputs.length)] as HTMLInputElement
        eatFromElement(randomInput)
      } else {
        // 没有内容可吃，眨眨眼
        updateStatus('unhappy')
        setTimeout(() => {
          if (eatingMode.value) {
            showRandomMessage(t('pet.noInput'))
          }
        }, 500)
      }
      return
    }

    eatFromElement(activeElement)
  }, 800) // 每800ms吃一个字
}

function eatFromElement(element: HTMLInputElement | HTMLTextAreaElement) {
  const value = element.value
  
  if (!value || value.length === 0) {
    // 没有内容，眨眨眼
    updateStatus('unhappy')
    return
  }

  // 吃掉最后一个字符
  element.value = value.slice(0, -1)
  
  // 触发 input 事件，确保框架能检测到变化
  const event = new Event('input', { bubbles: true })
  element.dispatchEvent(event)
  
  // 显示吃字动画
  updateStatus('happy')
  
  // 20% 概率显示"真好吃"
  if (Math.random() < 0.2) {
    showRandomMessage(t('pet.eating'))
  }
}

function stopEating() {
  if (eatingTimer) {
    clearInterval(eatingTimer)
    eatingTimer = null
  }
  updateStatus('thinking')
}

// ==================== 洗澡模式 ====================

function startBathTimeCheck() {
  // 每分钟检查一次是否到了晚上9点
  bathCheckTimer = window.setInterval(() => {
    const now = new Date()
    const hours = now.getHours()
    
    // 如果是晚上9点（21:00-21:59）且未在洗澡模式
    if (hours === 21 && !bathingMode.value) {
      enterBathingMode()
    }
    
    // 如果不是9点且在洗澡模式，自动退出
    if (hours !== 21 && bathingMode.value) {
      exitBathingMode()
    }
  }, 60000) // 每分钟检查一次
  
  // 立即检查一次
  const now = new Date()
  const hours = now.getHours()
  if (hours === 21 && !bathingMode.value) {
    enterBathingMode()
  }
}

function enterBathingMode() {
  bathingMode.value = true
  eatingMode.value = false // 退出吃字模式
  
  if (eatingTimer) {
    clearInterval(eatingTimer)
    eatingTimer = null
  }
  
  updateStatus('happy') // 洗澡时显示开心状态
  showRandomMessage(t('pet.bathing'))
  
  console.log('[ASoulPet] 🛁 Entered bath mode')
}

function exitBathingMode() {
  if (!bathingMode.value) return
  
  bathingMode.value = false
  updateStatus('thinking')
  showRandomMessage(t('pet.bathExit'))
  
  console.log('[ASoulPet] 🚶 Left the bathtub')
}

// ==================== 设置面板 ====================

function toggleSettings() {
  showSettings.value = !showSettings.value
  // disabled时也重置游戏视图
  if (!showSettings.value) {
    showGameInPanel.value = false
  }
}

function getCharacterImage(char: string) {
  return browser.runtime.getURL(`asoul/${char}/thinking.png`)
}

async function changeCharacter(char: typeof characters[number]) {
  currentActor.value = char
  updateCursor(char)
  await saveSettings()
  showRandomMessage(t('pet.greeting'))
  showSettings.value = false
}

function updateCursor(actor: string) {
  const cursorUrl = browser.runtime.getURL(`asoul/cursor-${actor}.png`)
  // 更新全局光标
  const style = document.getElementById('lifefi-custom-cursor') || document.createElement('style')
  style.id = 'lifefi-custom-cursor'
  style.textContent = `
    body {
      cursor: url('${cursorUrl}') 16 16, auto !important;
    }
    a, button, input, textarea, select {
      cursor: pointer !important;
    }
    input[type="text"], input[type="search"], textarea {
      cursor: text !important;
    }
    .asoul-pet-image {
      cursor: move !important;
    }
  `
  if (!style.parentNode) {
    document.head.appendChild(style)
  }
}

// ==================== AI 功能集成 ====================

async function handleAIRequest(action: string, text: string) {
  console.log('[ASoulPet] 🤖 handleAIRequest invoked', { action, textLength: text.length })
  
  try {
    if (action === 'translate') {
      console.log('[ASoulPet] 🌐 Starting translation...')
      // 翻译功能 - 在气泡中显示
      updateStatus('thinking')
      showRandomMessage(t('pet.ai.translating'))
      
      // 调用 AI API 进行翻译
      const targetLang = t('common.language') === '中文' ? '英文' : '中文'
      console.log('[ASoulPet] Target language:', targetLang)
      const prompt = `请将以下文字翻译成${targetLang}：\n\n${text}`
      const result = await callAI(prompt, 'translate')
      
      console.log('[ASoulPet] ✅ Translation complete, result length:', result.length)
      updateStatus('happy')
      showRandomMessage(result || t('pet.ai.translateComplete'))
      
    } else if (action === 'chat') {
      console.log('[ASoulPet] 💬 Opening AI dialog...')
      // 对话功能 - 打开对话框
      chatInitialMessage.value = text
      showChatDialog.value = true
      updateStatus('happy')
      showRandomMessage(t('pet.ai.thinking'))
    }
  } catch (error) {
    console.error('[ASoulPet] ❌ AI request failed:', error)
    updateStatus('unhappy')
    showRandomMessage(t('pet.ai.error'))
  }
}

async function callAI(prompt: string, action: string = 'chat'): Promise<string> {
  try {
    console.log('[ASoulPet] 📤 Sending AI request to background...', { action, promptLength: prompt.length })
    
    // 通过 background script 处理 AI 请求
    const response = await browser.runtime.sendMessage({
      type: 'LIFEFI_PET_AI_CALL',
      payload: {
        action,
        prompt
      }
    })
    
    console.log('[ASoulPet] 📥 Received background response:', response)
    
    if (!response || !response.success) {
      const errorMsg = response?.error || t('pet.ai.error')
      console.error('[ASoulPet] ❌ AI invocation failed:', errorMsg)
      return errorMsg
    }
    
    return response.result || t('pet.ai.noResponse')
    
  } catch (error) {
    console.error('[ASoulPet] ❌ AI API call failed:', error)
    throw error
  }
}

// 监听来自content.ts的消息
function handleWindowMessage(event: MessageEvent) {
  console.log('[ASoulPet] Received window message:', event.data)
  
  if (event.data.type === 'LIFEFI_PET_MESSAGE') {
    showRandomMessage(event.data.message)
  } else if (event.data.type === 'LIFEFI_PET_AI_REQUEST') {
    console.log('[ASoulPet] Handling AI request:', event.data.action, 'text length:', event.data.text?.length)
    handleAIRequest(event.data.action, event.data.text)
  } else if (event.data.type === 'LIFEFI_PET_REWARD_ANIMATION') {
    console.log('[ASoulPet] Trigger reward animation:', event.data.reward)
    handleRewardAnimation(event.data.reward)
  } else if (event.data.type === 'LIFEFI_PET_COUNTDOWN') {
    console.log('[ASoulPet] Update countdown:', event.data)
    showCountdown(event.data.platform, event.data.countdown, event.data.reward)
  } else if (event.data.type === 'LIFEFI_PET_RECOMMENDATION') {
    console.log('[ASoulPet] Show recommendation:', event.data)
    showRecommendationMessage(event.data.recommendation)
  }
}

// 处理奖励动画
function handleRewardAnimation(reward: number) {
  // 隐藏倒计时
  hideCountdown()
  
  // 播放开心动画
  updateStatus('happy')
  
  // 显示奖励消息
  showRandomMessage(`+${reward} GPT! 🎉`)
  
  // 跳跃庆祝
  if (!isJumping) {
    performJump()
  }
  
  // 2秒后恢复思考状态
  setTimeout(() => {
    updateStatus('thinking')
  }, 2000)
}

// 显示倒计时
function showCountdown(platform: string, countdown: number, reward: number) {
  // 如果platform为空或countdown为0，隐藏倒计时
  if (!platform || countdown <= 0 || reward <= 0) {
    hideCountdown()
    return
  }
  
  const minutes = Math.floor(countdown / 60)
  const seconds = countdown % 60
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  
  const platformName = platform === 'x' ? '𝕏' : '▶️'
  countdownMessage.value = `${timeStr} → ${reward}`
  
  countdownVisible.value = true
}

// 隐藏倒计时
function hideCountdown() {
  countdownVisible.value = false
}

// 显示推荐（使用消息气泡）
function showRecommendationMessage(recommendation: any) {
  recommendationData.value = recommendation
  
  // 使用消息气泡显示推荐
  const message = `✨ Recommended:\n${recommendation.title}\n${recommendation.description}\n\n💡 Click message to visit → Earn 200 GPT!`
  
  currentMessage.value = message
  messagePosition.value = {
    x: position.value.x + 100,
    y: position.value.y + 50
  }
  messageVisible.value = true
  
  // 3秒后自动隐藏
  if (messageTimer) {
    clearTimeout(messageTimer)
  }
  messageTimer = window.setTimeout(() => {
    hideMessage()
    recommendationData.value = null
  }, 3000)
}

// 处理消息气泡点击（可能是推荐）
async function handleMessageClick() {
  // 如果当前显示的是推荐消息
  if (recommendationData.value) {
    try {
      // 保存推荐点击记录
      const { saveRecommendationClick } = await import('@/utils/recommendations')
      await saveRecommendationClick(recommendationData.value.id, recommendationData.value.url)
      
      console.log('[ASoulPet] Recommendation clicked:', recommendationData.value)
      
      // 打开链接
      window.open(recommendationData.value.url, '_blank')
      
      // 清空推荐数据
      recommendationData.value = null
      
      // 显示新消息
      hideMessage()
      setTimeout(() => {
        showRandomMessage('Opening recommendation... You\'ll earn 200 GPT!')
      }, 100)
    } catch (error) {
      console.error('[ASoulPet] Failed to handle recommendation click:', error)
    }
  }
}

onMounted(() => {
  loadSettings()
  startIdleAnimation()
  
  // 默认启用 facingToMouse（只改变朝向，不移动）
  enableFacingMouse()
  
  // 初始化光标
  updateCursor(currentActor.value)
  
  // 启动洗澡时间检查
  startBathTimeCheck()
  
  // 绑定全局鼠标事件（拖拽必需）
  document.addEventListener('mousemove', handleDocumentMouseMove)
  document.addEventListener('mouseup', handleDocumentMouseUp)
  
  // 绑定键盘事件
  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('keyup', handleKeyUp)
  
  // 监听窗口消息
  window.addEventListener('message', handleWindowMessage)
  
  console.log('[ASoulPet] Pet initialized')
  console.log('[ASoulPet] Current avatar:', currentActor.value, `(${t('pet.name')})`)
  console.log('[ASoulPet] facingToMouse: enabled (default)')
  console.log('[ASoulPet] followMouse: disabled (requires configuration)')
  console.log('[ASoulPet] followClick: disabled (requires configuration)')
  console.log('[ASoulPet] Keyboard controls:', t('pet.keyboard.move'), t('pet.keyboard.jump'), t('pet.keyboard.eat'))
  console.log('[ASoulPet] Double-click the pet to open settings')
  console.log('[ASoulPet] 🛁 Bath mode: triggers daily at 21:00')
})

onUnmounted(() => {
  // 清理定时器
  if (messageTimer) {
    clearTimeout(messageTimer)
  }
  if (idleTimer) {
    clearInterval(idleTimer)
  }
  if (baitTimeout) {
    clearTimeout(baitTimeout)
  }
  if (chaseAnimation) {
    cancelAnimationFrame(chaseAnimation)
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  if (eatingTimer) {
    clearInterval(eatingTimer)
  }
  if (bathCheckTimer) {
    clearInterval(bathCheckTimer)
  }
  
  // 清理事件监听
  disableFacingMouse()
  disableFollowMouse()
  disableClickTracking()
  
  document.removeEventListener('mousemove', handleDocumentMouseMove)
  document.removeEventListener('mouseup', handleDocumentMouseUp)
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('keyup', handleKeyUp)
  window.removeEventListener('message', handleWindowMessage)
  
  // 清理自定义光标样式
  const cursorStyle = document.getElementById('lifefi-custom-cursor')
  if (cursorStyle && cursorStyle.parentNode) {
    cursorStyle.parentNode.removeChild(cursorStyle)
  }
})
</script>

<style scoped>
.asoul-pet-container {
  position: fixed;
  z-index: 2147483646;
  pointer-events: none;
}

.asoul-pet-image {
  position: fixed;
  width: 100px;
  height: 100px;
  object-fit: contain;
  pointer-events: all;
  cursor: move;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
  transition: none;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
  z-index: 99999;
}

.asoul-pet-image:hover {
  filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.15));
}

.asoul-pet-image.face-left {
  transform: scaleX(-1);
}

.message-bubble {
  position: fixed;
  max-width: 200px;
  padding: 8px 12px;
  background-color: rgba(250, 235, 215, 0.95);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 999999;
  pointer-events: none;
  animation: fadeIn 0.2s ease-in-out;
}

.message-bubble.is-recommendation {
  max-width: 280px;
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border: 2px solid #1d9bf0;
  cursor: pointer;
  pointer-events: all;
  transition: all 0.2s;
}

.message-bubble.is-recommendation:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(29, 155, 240, 0.3);
}

.message-bubble p {
  margin: 0;
  font-size: 13px;
  color: #333;
  line-height: 1.5;
  word-wrap: break-word;
  white-space: pre-line;
}

.message-bubble.is-recommendation p {
  color: #0d47a1;
  font-weight: 500;
}

/* 倒计时文字（头顶） */
.countdown-text {
  position: fixed;
  padding: 4px 8px;
  background: rgba(102, 126, 234, 0.9);
  color: white;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  z-index: 999998;
  pointer-events: none;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  letter-spacing: 0.5px;
  transform: translateX(-50%);
  animation: fadeIn 0.2s ease-in-out;
}

.bait-image {
  position: fixed;
  width: 100px;
  height: 100px;
  object-fit: contain;
  transform: scale(0.25);
  z-index: 999999;
  pointer-events: none;
  animation: baitAppear 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes baitAppear {
  from {
    opacity: 0;
    transform: scale(0);
  }
  to {
    opacity: 1;
    transform: scale(0.25);
  }
}

/* 设置面板 */
.settings-panel {
  position: fixed;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  z-index: 999999;
  pointer-events: all;
  animation: slideIn 0.3s ease-out;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.settings-view {
  padding: 20px;
  min-width: 280px;
}

.game-view {
  width: 450px;
  height: 680px;
  overflow: hidden;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
}

.task-view {
  width: 400px;
  height: 600px;
  overflow: hidden;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  position: relative;
  background: transparent;
}

.panel-close-btn {
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(10px);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.4);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  z-index: 1000;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.panel-close-btn:hover {
  background: rgba(255, 255, 255, 0.35);
  transform: translateX(-2px);
}

.task-content {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f0f0f0;
}

.settings-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f5f5f5;
  color: #666;
}

.character-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.character-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.character-item:hover {
  border-color: #ff69b4;
  background: #fff5f9;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(255, 105, 180, 0.2);
}

.character-item.active {
  border-color: #ff1493;
  background: #ffe4f1;
}

.character-item img {
  width: 60px;
  height: 60px;
  object-fit: contain;
  margin-bottom: 8px;
}

.character-item span {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.character-item.active span {
  color: #ff1493;
  font-weight: 600;
}

/* 设置面板操作按钮 */
.settings-actions {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.task-btn {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.task-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4);
}

.game-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.game-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-icon {
  font-size: 18px;
}

.btn-text {
  font-size: 14px;
}
</style>






