<template>
  <!-- Dialog -->
  <ChatDialog
    :visible="showChatDialog"
    :initial-message="chatInitialMessage"
    :current-actor="currentActor"
    @close="showChatDialog = false"
  />
  
  <div class="asoul-pet-container">
    <!-- Pet Image -->
    <img
      v-show="showPet"
      :src="currentImage"
      :class="['asoul-pet-image', { 'face-left': faceDirection === 'left' }]"
      :style="petStyle"
      alt="asoul-pet"
      draggable="false"
      @mousedown="handleMouseDown"
      @dblclick="handlePetClick"
      @dragover.prevent
      @drop="handleDrop"
      @selectstart.prevent
    />
    
    <!-- Settings/Game/Task Panel -->
    <div v-if="showSettings" class="settings-panel" :style="settingsStyle">
      <!-- Game View -->
      <div v-if="showGameInPanel" class="game-view">
        <GameMenu @close="closeGamePanel" />
      </div>
      
      <!-- Task View -->
      <div v-else-if="showTaskInPanel" class="task-view">
        <button class="panel-close-btn" @click="closeTaskPanel">← Back</button>
        <div class="task-content">
          <TaskPanel />
        </div>
      </div>
      
      <!-- Settings View -->
      <div v-else class="settings-view">
        <div class="settings-header">
          <h3>{{ t('pet.selectCharacter') }}</h3>
          <button class="restore-pet-btn" @click="restorePet" title="Restore to Pet">
            <span class="restore-icon">🐾</span>
          </button>
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
        
        <!-- Shortcut entry -->
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
    
    <!-- Message Bubble -->
    <div
      v-if="messageVisible"
      :class="['message-bubble', { 'is-recommendation': recommendationData }]"
      :style="messageStyle"
      @click="handleMessageClick"
    >
      <p>{{ currentMessage }}</p>
    </div>

    <!-- Countdown Display (Above Pet) -->
    <div
      v-if="countdownVisible"
      class="countdown-text"
      :style="countdownStyle"
    >
      {{ countdownMessage }}
    </div>
    
    <!-- Bait -->
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

// Character Configuration Table
const TABLE = {
  diana: { bait: 'candy', cursor: 'cursor-diana.png' },
  ava: { bait: 'bowl', cursor: 'cursor-ava.png' },
  bella: { bait: 'star', cursor: 'cursor-bella.png' },
  carol: { bait: 'knight', cursor: 'cursor-carol.png' },
  eileen: { bait: 'icecream', cursor: 'cursor-eileen.png' },
  luna: { bait: 'moon', cursor: 'cursor-luna.png' }
}

// State Management
const currentActor = ref<'diana' | 'ava' | 'bella' | 'carol' | 'eileen' | 'luna'>('luna')
const currentStatus = ref<string>('thinking')
const position = ref({ x: 20, y: window.innerHeight - 130 }) // Default: bottom-left corner
const faceDirection = ref<'left' | 'right'>('right')

// Display Control
const showPet = ref(true) // Control pet show/hide

// Message
const messageVisible = ref(false)
const currentMessage = ref('')
const messagePosition = ref({ x: 0, y: 0 })

// Countdown Message
const countdownVisible = ref(false)
const countdownMessage = ref('')
const countdownPosition = ref({ x: 0, y: 0 })

// Recommendation Data (displayed using message bubble)
const recommendationData = ref<any>(null)

// Bait
const baitVisible = ref(false)
const baitType = ref<string>('candy')
const baitPosition = ref({ x: 0, y: 0 })

// Drag State
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const initialPos = ref({ x: 0, y: 0 })
let isMouseDown = false // Global mouse down flag

// Keyboard Control State
const keyPressed = ref<Set<string>>(new Set())
const moveSpeed = 5 // Move speed (pixels/frame)
const jumpHeight = 100 // Jump height
let animationFrameId: number | null = null
let isJumping = false

// Settings Panel
const showSettings = ref(false)
const showGameInPanel = ref(false)
const showTaskInPanel = ref(false)
const characters = ['diana', 'ava', 'bella', 'carol', 'eileen','luna'] as const

// Dialog
const showChatDialog = ref(false)
const chatInitialMessage = ref('')

// Game Panel
function openGamePanel() {
  showGameInPanel.value = true
  showTaskInPanel.value = false
  showRandomMessage('Let\'s play!')
}

function closeGamePanel() {
  showGameInPanel.value = false
  // Don't disable settings panel, return to settings view
}

// Task Panel
function openTaskPanel() {
  showTaskInPanel.value = true
  showGameInPanel.value = false
  showRandomMessage('Check your tasks!')
}

function closeTaskPanel() {
  showTaskInPanel.value = false
  // Don't disable settings panel, return to settings view
}

// Eating Mode
const eatingMode = ref(false)
let eatingTimer: number | null = null

// Bathing Mode
const bathingMode = ref(false)
let bathCheckTimer: number | null = null

// Computed Properties
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
  left: `${position.value.x + 110}px`,
  bottom: `${window.innerHeight - position.value.y - 50}px`
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
  left: `${position.value.x}px`,
  bottom: '0px', // Panel fixed at bottom, appears from bottom to top
  transformOrigin: 'bottom left'
}))

// ==================== Core Feature: Drag ====================

// Mouse down (on pet)
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
  
  // Show interaction status on press
  hideMessage()
  updateStatus('interact_1')
  
  console.log('[ASoulPet] ✅ mousedown handled, isMouseDown=true, isDragging=false')
}

// Double-click pet (distinguish drag from double-click)
function handlePetClick(e: MouseEvent) {
  // If dragging, don't trigger double-click event
  if (isDragging.value) {
    console.log('[ASoulPet] ⏭️ Skipping double-click (was dragging)')
    return
  }
  
  console.log('[ASoulPet] 👆👆 Pet double-clicked, showing character panel')
  
  // Hide pet, show panel
  showPet.value = false
  showSettings.value = true
  showGameInPanel.value = false
  showTaskInPanel.value = false
}

// Global mouse move
function handleDocumentMouseMove(e: MouseEvent) {
  if (!isMouseDown) return
  
  const deltaX = e.clientX - dragStart.value.x
  const deltaY = e.clientY - dragStart.value.y
  
  // Check if dragging started (moved more than 5px)
  if (!isDragging.value && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
    isDragging.value = true
    console.log('[ASoulPet] 🚀 Drag started (isDragging=true)', { deltaX, deltaY })
  }
  
  if (!isDragging.value) return
  
  // Update position
  let newX = initialPos.value.x + deltaX
  let newY = initialPos.value.y + deltaY
  
  // Limit to viewport
  newX = Math.max(0, Math.min(window.innerWidth - 100, newX))
  newY = Math.max(0, Math.min(window.innerHeight - 100, newY))
  
  position.value = { x: newX, y: newY }
  
  // Update direction
  updateDirection(e.clientX)
}

// Global mouse up
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
  
  // Immediately reset all drag states
  isMouseDown = false
  isDragging.value = false
  
  console.log('[ASoulPet] ✅ mouseup handled, reset: isMouseDown=false, isDragging=false, wasDragging=' + wasDragging)
  
  // If dragged, show random message
  if (wasDragging) {
    setTimeout(() => {
      updateStatus('rand')
      showRandomMessage()
      saveSettings()
    }, 300)
  } else {
    // Just a click, not a drag
    setTimeout(() => {
      updateStatus('rand')
      showRandomMessage()
    }, 500)
  }
}

// ==================== Core Feature: Face Mouse (facingToMouse) ====================

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
  if (isDragging.value) return // Don't change direction while dragging
  
  if (facingDebounce) {
    clearTimeout(facingDebounce)
  }
  
  facingDebounce = window.setTimeout(() => {
    updateDirection(e.clientX)
  }, 85)
}

// ==================== Core Feature: Follow Mouse (followMouse) ====================

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

// ==================== Core Feature: Click Tracking (followClick) ====================

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
  
  // If clicked on pet itself, don't trigger chase
  const target = e.target as HTMLElement
  if (target.classList && target.classList.contains('asoul-pet-image')) {
    return
  }
  
  // Clear previous bait
  if (baitTimeout) {
    clearTimeout(baitTimeout)
  }
  baitVisible.value = false
  
  // Show new bait
  baitType.value = TABLE[currentActor.value].bait
  baitPosition.value = {
    x: e.clientX - 75,
    y: e.clientY - 75
  }
  baitVisible.value = true
  
  // Chase bait
  chaseTarget({ x: e.clientX, y: e.clientY })
  
  // Remove bait after 5 seconds
  baitTimeout = window.setTimeout(() => {
    baitVisible.value = false
  }, 5000)
}

// ==================== Core Feature: Keyboard Control ====================

function handleKeyDown(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  
  // Toggle eating mode - priority processing, not restricted by input fields
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    toggleEatingMode()
    console.log('[ASoulPet] Typing-eater mode toggled:', eatingMode.value ? 'enabled' : 'disabled')
    return
  }
  
  // If in input field, other keyboard controls don't respond
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
    return
  }
  
  keyPressed.value.add(e.key)
  
  // Jump
  if (e.key === 'ArrowUp' && !isJumping) {
    performJump()
  }

  // Start move animation
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    // If in bathing mode, exit the bathtub
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
  
  // Stop move animation
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
      // Don't save while moving to avoid frequent saves exceeding quota
    }

    if (keyPressed.value.has('ArrowLeft') || keyPressed.value.has('ArrowRight')) {
      animationFrameId = requestAnimationFrame(animate)
    } else {
      animationFrameId = null
      updateStatus('thinking')
      // Save only once after movement ends
      saveSettings()
    }
  }

  animate()
}

function performJump() {
  isJumping = true
  const startY = position.value.y
  const startTime = Date.now()
  const duration = 500 // Jump duration

  updateStatus('happy')

  const jump = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)

    // Parabolic motion
    const jumpProgress = Math.sin(progress * Math.PI)
    position.value.y = startY - jumpHeight * jumpProgress

    if (progress < 1) {
      requestAnimationFrame(jump)
    } else {
      position.value.y = startY
      isJumping = false
      updateStatus('thinking')
      // Save after jump ends
      saveSettings()
    }
  }

  jump()
}

// ==================== Helper Functions ====================

// Update direction
function updateDirection(mouseX: number) {
  const petCenterX = position.value.x + 50
  faceDirection.value = mouseX >= petCenterX ? 'right' : 'left'
}

// Update status
function updateStatus(status: string) {
  if (status === 'rand') {
    const randomNum = Math.floor(Math.random() * 8) + 2 // 2-9
    status = `interact_${randomNum}`
  }
  currentStatus.value = status
}

// Chase target
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

// Show random message
let messageTimer: number | null = null

async function showRandomMessage(customMessage?: string) {
  try {
    let message = customMessage
    
    if (!message) {
      // Get message from language pack
      const actorMessages = t(`pet.messages.${currentActor.value}`)
      if (Array.isArray(actorMessages) && actorMessages.length > 0) {
        const randomIndex = Math.floor(Math.random() * actorMessages.length)
        message = actorMessages[randomIndex]
      }
    }
    
    if (message) {
      currentMessage.value = message
      messageVisible.value = true
      
      // Auto-hide after 3 seconds (extended display time)
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

// Handle drag and drop (add to context)
async function handleDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  
  const text = e.dataTransfer?.getData('text/plain')
  if (text) {
    // Send message to content script to save as context
    try {
      await browser.runtime.sendMessage({
        type: 'LIFEFI_SAVE_CONTEXT',
        data: { text }
      })
      
      showRandomMessage('Got it!')
      updateStatus('rand')
    } catch (error) {
      console.error('[ASoulPet] Failed to save context:', error)
    }
  }
}

// Idle animation
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

// ==================== Configuration Management ====================

async function loadSettings() {
  try {
    const result = await browser.storage.sync.get('ASOUL_CONFIG')
    if (result.ASOUL_CONFIG) {
      const config = JSON.parse(result.ASOUL_CONFIG)
      
      // Set character
      if (config.currentActor) {
        currentActor.value = config.currentActor
      }
      
      // Set position
      if (config.position) {
        position.value = config.position
      }
      
      // Enable interaction features (only enable when explicitly configured as true)
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

// ==================== Lifecycle ====================

// ==================== Text Eating Feature ====================

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

    // Check if it's an editable element
    const isEditable = (
      activeElement &&
      (activeElement.tagName === 'INPUT' || 
       activeElement.tagName === 'TEXTAREA' || 
       activeElement.isContentEditable)
    )

    if (!isEditable) {
      // No focused input, randomly find one on the page
      const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="search"], textarea'))
      const validInputs = inputs.filter((input: any) => input.value && input.value.length > 0)
      
      if (validInputs.length > 0) {
        const randomInput = validInputs[Math.floor(Math.random() * validInputs.length)] as HTMLInputElement
        eatFromElement(randomInput)
      } else {
        // No content to eat, blink
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
  }, 800) // Eat one character every 800ms
}

function eatFromElement(element: HTMLInputElement | HTMLTextAreaElement) {
  const value = element.value
  
  if (!value || value.length === 0) {
    // No content, blink
    updateStatus('unhappy')
    return
  }

  // Eat the last character
  element.value = value.slice(0, -1)
  
  // Trigger input event to ensure framework can detect the change
  const event = new Event('input', { bubbles: true })
  element.dispatchEvent(event)
  
  // Show eating animation
  updateStatus('happy')
  
  // 20% chance to show "delicious"
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

// ==================== Bathing Mode ====================

function startBathTimeCheck() {
  // Check every minute if it's 9pm
  bathCheckTimer = window.setInterval(() => {
    const now = new Date()
    const hours = now.getHours()
    
    // If it's 9pm (21:00-21:59) and not in bathing mode
    if (hours === 21 && !bathingMode.value) {
      enterBathingMode()
    }
    
    // If not 9 PM and in bathing mode, auto exit
    if (hours !== 21 && bathingMode.value) {
      exitBathingMode()
    }
  }, 60000) // Check every minute
  
  // Check immediately once
  const now = new Date()
  const hours = now.getHours()
  if (hours === 21 && !bathingMode.value) {
    enterBathingMode()
  }
}

function enterBathingMode() {
  bathingMode.value = true
  eatingMode.value = false // Exit eating mode
  
  if (eatingTimer) {
    clearInterval(eatingTimer)
    eatingTimer = null
  }
  
  updateStatus('happy') // Show happy status while bathing
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

// ==================== Settings Panel ====================

function toggleSettings() {
  showSettings.value = !showSettings.value
  // Reset game view when disabled
  if (!showSettings.value) {
    showGameInPanel.value = false
  }
}

// Restore to pet mode
function restorePet() {
  console.log('[ASoulPet] 🐾 Restoring to pet mode')
  showSettings.value = false
  showGameInPanel.value = false
  showTaskInPanel.value = false
  showPet.value = true
  
  // Restore interaction status
  setTimeout(() => {
    updateStatus('thinking')
  }, 300)
}

function getCharacterImage(char: string) {
  return browser.runtime.getURL(`asoul/${char}/thinking.png`)
}

async function changeCharacter(char: typeof characters[number]) {
  currentActor.value = char
  updateCursor(char)
  await saveSettings()
  showRandomMessage(t('pet.greeting'))
  
  // Restore to pet after selecting character
  restorePet()
}

function updateCursor(actor: string) {
  const cursorUrl = browser.runtime.getURL(`asoul/cursor-${actor}.png`)
  // Update global cursor 
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

// ==================== AI Feature Integration ====================

async function handleAIRequest(action: string, text: string) {
  console.log('[ASoulPet] 🤖 handleAIRequest invoked', { action, textLength: text.length })
  
  try {
    if (action === 'translate') {
      console.log('[ASoulPet] 🌐 Starting translation...')
      // Translation feature - display in bubble
      updateStatus('thinking')
      showRandomMessage(t('pet.ai.translating'))
      
      // Call AI API for translation
      const targetLang = t('common.language') === '中文' ? '英文' : '中文'
      console.log('[ASoulPet] Target language:', targetLang)
      const prompt = `请将以下文字翻译成${targetLang}：\n\n${text}`
      const result = await callAI(prompt, 'translate')
      
      console.log('[ASoulPet] ✅ Translation complete, result length:', result.length)
      updateStatus('happy')
      showRandomMessage(result || t('pet.ai.translateComplete'))
      
    } else if (action === 'chat') {
      console.log('[ASoulPet] 💬 Opening AI dialog...')
      // Chat feature - open dialog
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
    
    // Process AI request through background script
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

// Listen to messages from content.ts
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

// Show recommendation (using message bubble)
function showRecommendationMessage(recommendation: any) {
  recommendationData.value = recommendation
  
  // Display recommendation using message bubble
  const message = `✨ Recommended:\n${recommendation.title}\n${recommendation.description}\n\n💡 Click message to visit → Earn 200 GPT!`
  
  currentMessage.value = message
  messageVisible.value = true
  
  // after 3 seconds
  if (messageTimer) {
    clearTimeout(messageTimer)
  }
  messageTimer = window.setTimeout(() => {
    hideMessage()
    recommendationData.value = null
  }, 3000)
}

// Handle message bubble click (possibly recommendation)
async function handleMessageClick() {
  // If current message is recommendation
  if (recommendationData.value) {
    try {
      // Save recommendation click record
      const { saveRecommendationClick } = await import('@/utils/recommendations')
      await saveRecommendationClick(recommendationData.value.id, recommendationData.value.url)
      
      console.log('[ASoulPet] Recommendation clicked:', recommendationData.value)
      
      // Open link
      window.open(recommendationData.value.url, '_blank')
      
      // Clear recommendation data
      recommendationData.value = null
      
      // Show new message
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
  
  // Default: facingToMouse (only change direction, no movement)
  enableFacingMouse()
  
  // Initialize cursor
  updateCursor(currentActor.value)
  
  // Start bath time check
  startBathTimeCheck()
  
  // Bind global mouse events (drag required)
  document.addEventListener('mousemove', handleDocumentMouseMove)
  document.addEventListener('mouseup', handleDocumentMouseUp)
  
  // Bind keyboard events
  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('keyup', handleKeyUp)
  
  // Listen to window messages
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
  // Clear timers
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
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
  transition: transform 0.2s ease, filter 0.2s ease;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
  z-index: 99999;
}

.asoul-pet-image:hover {
  filter: drop-shadow(0 6px 12px rgba(102, 126, 234, 0.4));
}

.asoul-pet-image:not(.face-left):hover {
  transform: scale(1.05);
}

.asoul-pet-image.face-left {
  transform: scaleX(-1);
}

.asoul-pet-image.face-left:hover {
  transform: scaleX(-1) scale(1.05);
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

/* Settings Panel */
.settings-panel {
  position: fixed;
  background: white;
  border-radius: 12px 12px 0 0;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.2);
  z-index: 999999;
  pointer-events: all;
  animation: slideUpFromBottom 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
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

@keyframes slideUpFromBottom {
  from {
    opacity: 0;
    transform: translateY(100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
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

/* Restore to Pet Button */
.restore-pet-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  cursor: pointer;
  padding: 8px 12px;
  width: auto;
  height: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.restore-pet-btn:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);
}

.restore-pet-btn:active {
  transform: translateY(0) scale(0.98);
}

.restore-icon {
  font-size: 20px;
  animation: petIconBounce 2s ease-in-out infinite;
}

@keyframes petIconBounce {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
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

/* Settings panel action buttons */
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






