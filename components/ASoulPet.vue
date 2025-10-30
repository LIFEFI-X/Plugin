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
        <div class="task-content">
          <TaskPanel @back="closeTaskPanel" />
        </div>
      </div>
            <!-- Settings View -->
      
      <div v-else class="settings-view">
        <div class="settings-header">
          <h3>{{ isWalletBound ? t('pet.nft.equipPet') : t('pet.gpt.selectPet') }}</h3>
          <button class="restore-pet-btn" @click="restorePet" title="Restore to LifeFi Companion">
            <svg class="restore-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 10L12 5L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M7 14L12 19L17 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>

        <!-- Wallet Binding Section (shown when not wallet bound) -->
        <div v-if="!isWalletBound" class="wallet-binding-section">
          <p class="wallet-hint">{{ t('pet.nft.walletHint') }}</p>
          <div class="wallet-input-group">
            <input
              v-model="walletAddress"
              type="text"
              :placeholder="t('pet.nft.walletPlaceholder')"
              class="wallet-input"
              @keyup.enter="bindWallet"
            />
            <button @click="bindWallet" class="bind-btn">
              {{ t('pet.nft.bind') }}
            </button>
          </div>
        </div>

        <!-- Character Grid -->
        <div v-if="isWalletBound">
          <!-- Wallet Status -->
          <div class="wallet-status">
            <p class="wallet-info">
              <span class="wallet-label">{{ t('pet.nft.walletAddress') }}:</span>
              <span class="wallet-address">{{ walletAddress.slice(0, 6) }}...{{ walletAddress.slice(-4) }}</span>
              <button @click="unbindWallet" class="unbind-btn" :title="t('pet.nft.unbind')">✕</button>
            </p>
          </div>

          <!-- CPoint Balance Display (after wallet binding) -->
          <div class="cpoint-balance-section">
            <div class="cpoint-balance-display">
              <span class="cpoint-icon">CP</span>
              <span class="cpoint-amount">{{ cpointBalance }}</span>
              <span class="cpoint-label">CPoint</span>
            </div>
            <p class="cpoint-rate-info">
              {{ t('pet.gpt.currentRate') }}: <strong>{{ currentCpointRate }}x</strong>
              <span class="rate-pet">({{ t(`pet.characters.${currentActor}`) }})</span>
            </p>
          </div>

          <!-- Faye NFT Section -->
          <div class="section-header nft-section-header">
            <h4>{{ t('pet.nft.nftPet') }}</h4>
          </div>
          <div class="character-grid">
            <div
              v-for="char in availableCharacters"
              :key="char"
              :class="['character-item', { active: currentActor === char }, 'nft-pet']"
              @click="changeCharacter(char)"
            >
              <img :src="getCharacterImage(char)" :alt="t(`pet.characters.${char}`)" />
              <span>{{ t(`pet.characters.${char}`) }}</span>
              <span class="equip-badge">{{ currentActor === char ? t('pet.nft.equipped') : t('pet.nft.equip') }}</span>
              <div class="pet-rate-badge nft-rate">{{ CPOINT_TIER_CONFIG[char].cpointRate }}x CPoint</div>
            </div>
          </div>

          <!-- More Companion Button -->
          <div class="more-companion-section">
            <a href="https://www.lifefi.io/" target="_blank" class="more-companion-btn">
              {{ t('pet.nft.moreCompanion') }} →
            </a>
          </div>

          <!-- CPoint Unlockable Companions Section -->
          <div class="section-header cpoint-section-header">
            <span class="section-icon">CP</span>
            <h4>{{ t('pet.gpt.gptPets') }}</h4>
          </div>
          <div class="character-grid">
            <div
              v-for="char in cpointUnlockablePets"
              :key="char"
              :class="[
                'character-item',
                { active: currentActor === char },
                { locked: !unlockedPets.has(char) },
                { unlocked: unlockedPets.has(char) }
              ]"
              @click="unlockedPets.has(char) ? changeCharacter(char) : null"
            >
              <img :src="getCharacterImage(char)" :alt="t(`pet.characters.${char}`)" />
              <span class="char-name">{{ t(`pet.characters.${char}`) }}</span>

              <!-- Unlocked pet info -->
              <div v-if="unlockedPets.has(char)" class="pet-info">
                <div class="pet-rate-badge">{{ CPOINT_TIER_CONFIG[char].cpointRate }}x CPoint</div>
                <span v-if="currentActor === char" class="active-badge">{{ t('pet.gpt.active') }}</span>
              </div>

              <!-- Locked pet info -->
              <div v-else class="lock-overlay">
                <svg class="lock-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
                </svg>
                <div class="unlock-cost">{{ CPOINT_TIER_CONFIG[char].unlockCost }} CPoint</div>
                <div class="unlock-progress-bar">
                  <div
                    class="unlock-progress-fill"
                    :style="{ width: getUnlockProgress(char) + '%' }"
                  ></div>
                </div>
                <button
                  v-if="canUnlockPet(char)"
                  @click.stop="unlockPet(char)"
                  class="unlock-btn"
                >
                  {{ t('pet.gpt.unlock') }}
                </button>
                <div v-else class="tier-badge">Tier {{ CPOINT_TIER_CONFIG[char].tier }}</div>
              </div>
            </div>
          </div>
        </div>
        <div v-else>
          <!-- Before wallet binding: Show nothing or binding prompt -->
        </div>

        <!--  (only shown when wallet is bound) -->
        <div v-if="isWalletBound" class="settings-actions">
          <button @click="openTaskPanel" class="action-btn task-btn">
            <span class="btn-text">Daily Tasks</span>
          </button>
          <button @click="openGamePanel" class="action-btn game-btn">
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
  faye: { bait: 'moon', cursor: 'cursor-faye.png' }
}

// CPoint Tier System Configuration
// Each companion has unlock cost and CPoint earning rate multiplier
const CPOINT_TIER_CONFIG = {
  // Free tier - default companion
  carol: {
    unlockCost: 0,
    cpointRate: 1.0,
    tier: 0,
    description: 'Default companion - Basic CPoint earning rate'
  },
  // Tier 1 - Entry level companions
  diana: {
    unlockCost: 100,
    cpointRate: 1.2,
    tier: 1,
    description: 'Tier 1 - 20% faster CPoint earning'
  },
  bella: {
    unlockCost: 100,
    cpointRate: 1.2,
    tier: 1,
    description: 'Tier 1 - 20% faster CPoint earning'
  },
  // Tier 2 - Mid level companions
  ava: {
    unlockCost: 250,
    cpointRate: 1.5,
    tier: 2,
    description: 'Tier 2 - 50% faster CPoint earning'
  },
  eileen: {
    unlockCost: 250,
    cpointRate: 1.5,
    tier: 2,
    description: 'Tier 2 - 50% faster CPoint earning'
  },
  // Tier 3 - NFT exclusive (highest rate)
  faye: {
    unlockCost: 0, // Unlocked via wallet binding, not CPoint
    cpointRate: 2.0,
    tier: 3,
    description: 'NFT Exclusive - 100% faster CPoint earning (Highest rate!)'
  }
} as const

// CPoint earning activities and base rewards
const CPOINT_ACTIVITIES = {
  WRITING: 1, // 1 CPoint per 100 characters written
  TASK_COMPLETE: 10, // 10 CPoint per task completed
  GAME_PLAY: 5, // 5 CPoint per game played
  DAILY_LOGIN: 20, // 20 CPoint for daily login
  EATING_MODE: 2 // 2 CPoint per eating mode activation
} as const

// 状态管理
const currentActor = ref<'diana' | 'ava' | 'bella' | 'carol' | 'eileen' | 'faye'>('carol')
const currentStatus = ref<string>('thinking')
const position = ref({ x: 20, y: window.innerHeight - 130 })// Default: bottom-left corner
const faceDirection = ref<'left' | 'right'>('right')

// Display Control
const showPet = ref(true)// Control pet show/hide

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
let isMouseDown = false  // Global mouse down flag

// Keyboard Control State
const keyPressed = ref<Set<string>>(new Set())
const moveSpeed = 5 // Move speed (pixels/frame)
const jumpHeight = 100// Jump height
let animationFrameId: number | null = null
let isJumping = false

// Settings Panel
const showSettings = ref(false)
const showGameInPanel = ref(false)
const showTaskInPanel = ref(false)
// Base characters available without wallet binding (excluding Faye)
const baseCharacters = ['diana', 'ava', 'bella', 'carol', 'eileen'] as const
const characters = ['diana', 'ava', 'bella', 'carol', 'eileen','faye'] as const

// Wallet binding state
const walletAddress = ref<string>('')
const isWalletBound = ref(false)
const showWalletInput = ref(false)

// CPoint System State
const cpointBalance = ref<number>(0) // User's total CPoint balance
const unlockedPets = ref<Set<string>>(new Set(['carol'])) // Carol is unlocked by default
const characterWritingCount = ref<number>(0) // Track writing for CPoint earning
const lastLoginDate = ref<string>('') // Track daily login bonus

// Computed property for available characters based on wallet binding and CPoint unlocks
const availableCharacters = computed(() => {
  if (isWalletBound.value) {
    // After wallet binding: show Faye (NFT) only
    return ['faye'] as const
  } else {
    // Before wallet binding: don't show any pets (force wallet binding first)
    return [] as const
  }
})

// Computed property for CPoint-unlockable companions (only shown after wallet binding)
const cpointUnlockablePets = computed(() => {
  if (isWalletBound.value) {
    // Show all Q-version companions with their unlock status after wallet binding
    return baseCharacters
  } else {
    // Hide CPoint companions before wallet binding
    return [] as const
  }
})

// Computed property for current CPoint earning rate
const currentCpointRate = computed(() => {
  const config = CPOINT_TIER_CONFIG[currentActor.value]
  return config ? config.cpointRate : 1.0
})

// Check if a pet can be unlocked
function canUnlockPet(petName: string): boolean {
  const config = CPOINT_TIER_CONFIG[petName as keyof typeof CPOINT_TIER_CONFIG]
  if (!config) return false
  const canUnlock = cpointBalance.value >= config.unlockCost && !unlockedPets.value.has(petName)

  // Debug logging
  if (cpointBalance.value >= config.unlockCost * 0.8) { // Log when close to unlocking
    console.log(`[CPoint] canUnlockPet check for ${petName}:`, {
      cpointBalance: cpointBalance.value,
      unlockCost: config.unlockCost,
      isUnlocked: unlockedPets.value.has(petName),
      canUnlock
    })
  }

  return canUnlock
}

// Get unlock progress percentage
function getUnlockProgress(petName: string): number {
  const config = CPOINT_TIER_CONFIG[petName as keyof typeof CPOINT_TIER_CONFIG]
  if (!config || config.unlockCost === 0) return 100
  return Math.min(100, (cpointBalance.value / config.unlockCost) * 100)
}

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
  
  console.log('[ASoulPet] 👆👆 LifeFi Companion double-clicked, showing character panel')
  
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

      // Load wallet binding state
      if (config.walletAddress) {
        walletAddress.value = config.walletAddress
        isWalletBound.value = true
      }

      // Load CPoint system state
      if (config.cpointBalance !== undefined) {
        cpointBalance.value = config.cpointBalance
      }
      if (config.unlockedPets) {
        unlockedPets.value = new Set(config.unlockedPets)
      }
      if (config.lastLoginDate) {
        lastLoginDate.value = config.lastLoginDate
      }

      // Check and award daily login bonus
      checkDailyLogin()
      if (config.followMouse === true) {
        enableFollowMouse()
      }

      if (config.followClick === true) {
        enableClickTracking()
      }

      console.log('[ASoulPet] Configuration loaded:', config)
    } else {
      // First time user - award daily login bonus
      checkDailyLogin()
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
      followClick: clickTrackingEnabled,
      walletAddress: walletAddress.value,
      cpointBalance: cpointBalance.value,
      unlockedPets: Array.from(unlockedPets.value),
      lastLoginDate: lastLoginDate.value
    }

    await browser.storage.sync.set({
      ASOUL_CONFIG: JSON.stringify(config)
    })
  } catch (error) {
    console.error('[ASoulPet] Failed to save settings:', error)
  }
}

// ==================== CPoint System Functions ====================

// Award CPoint to user with multiplier based on current companion
function awardCpoint(baseAmount: number, activityName: string = '') {
  const multipliedAmount = Math.floor(baseAmount * currentCpointRate.value)
  cpointBalance.value += multipliedAmount

  saveSettings()

  const message = activityName
    ? `+${multipliedAmount} CPoint from ${activityName}! (${currentCpointRate.value}x rate)`
    : `+${multipliedAmount} CPoint!`

  showRandomMessage(message)

  console.log(`[CPoint] Awarded ${multipliedAmount} CPoint (base: ${baseAmount}, rate: ${currentCpointRate.value}x)`)
}

// Check and award daily login bonus
function checkDailyLogin() {
  const today = new Date().toDateString()

  if (lastLoginDate.value !== today) {
    lastLoginDate.value = today
    awardCpoint(CPOINT_ACTIVITIES.DAILY_LOGIN, 'Daily Login')
    saveSettings()
  }
}

// Unlock a companion with CPoint
async function unlockPet(petName: string) {
  console.log('[CPoint] unlockPet called with:', petName)
  console.log('[CPoint] Current state:', {
    cpointBalance: cpointBalance.value,
    unlockedPets: Array.from(unlockedPets.value),
    petName
  })

  const config = CPOINT_TIER_CONFIG[petName as keyof typeof CPOINT_TIER_CONFIG]

  if (!config) {
    console.error('[CPoint] Invalid pet:', petName)
    showRandomMessage('Invalid pet')
    return
  }

  if (unlockedPets.value.has(petName)) {
    console.warn('[CPoint] LifeFi Companion already unlocked:', petName)
    showRandomMessage('LifeFi Companion already unlocked')
    return
  }

  if (cpointBalance.value < config.unlockCost) {
    console.warn('[CPoint] Insufficient CPoint:', {
      current: cpointBalance.value,
      required: config.unlockCost,
      shortfall: config.unlockCost - cpointBalance.value
    })
    showRandomMessage(`Need ${config.unlockCost - cpointBalance.value} more CPoint to unlock`)
    return
  }

  console.log('[CPoint] Unlocking pet...', {
    petName,
    cost: config.unlockCost,
    balanceBefore: cpointBalance.value
  })

  // Deduct CPoint and unlock companion
  cpointBalance.value -= config.unlockCost
  unlockedPets.value.add(petName)

  console.log('[CPoint] Companion unlocked, saving settings...', {
    balanceAfter: cpointBalance.value,
    unlockedPets: Array.from(unlockedPets.value)
  })

  await saveSettings()

  showRandomMessage(`${t(`pet.characters.${petName}`)} unlocked! (${config.cpointRate}x CPoint rate)`)

  console.log(`[CPoint] Unlock complete for ${petName}`)
}

// Track writing activity and award CPoint
function trackWritingActivity(charactersWritten: number) {
  characterWritingCount.value += charactersWritten

  // Award 1 CPoint per 100 characters
  const cpointToAward = Math.floor(characterWritingCount.value / 100)

  if (cpointToAward > 0) {
    awardCpoint(cpointToAward * CPOINT_ACTIVITIES.WRITING, 'Writing')
    characterWritingCount.value = characterWritingCount.value % 100
  }
}

// Award CPoint for completing a task
function awardTaskCpoint() {
  awardCpoint(CPOINT_ACTIVITIES.TASK_COMPLETE, 'Task Completed')
}

// Award CPoint for playing a game
function awardGameCpoint() {
  awardCpoint(CPOINT_ACTIVITIES.GAME_PLAY, 'Game Played')
}

// Test function to manually award CPoint (for debugging)
function testCpointAward() {
  awardCpoint(10, 'Test')
  console.log('[CPoint Test] Current actor:', currentActor.value)
  console.log('[CPoint Test] Current rate:', currentCpointRate.value)
  console.log('[CPoint Test] Current balance:', cpointBalance.value)
  console.log('[CPoint Test] Unlocked companions:', Array.from(unlockedPets.value))
}



function toggleEatingMode() {
  eatingMode.value = !eatingMode.value

  if (eatingMode.value) {
    showRandomMessage(t('pet.modes.eating'))
    startEating()
    // Award CPoint for activating eating mode
    awardCpoint(CPOINT_ACTIVITIES.EATING_MODE, 'Eating Mode')
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

// ==================== Wallet Binding Functions ====================

function validateWalletAddress(address: string): boolean {
  // Basic validation for common wallet address formats
  // Ethereum: 0x followed by 40 hex characters
  const ethPattern = /^0x[a-fA-F0-9]{40}$/
  // Solana: 32-44 base58 characters
  const solPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

  return ethPattern.test(address) || solPattern.test(address)
}

async function bindWallet() {
  const trimmedAddress = walletAddress.value.trim()

  if (!trimmedAddress) {
    showRandomMessage('Please enter a wallet address')
    return
  }

  if (!validateWalletAddress(trimmedAddress)) {
    showRandomMessage('Invalid wallet address format')
    return
  }

  walletAddress.value = trimmedAddress
  isWalletBound.value = true
  showWalletInput.value = false

  await saveSettings()

  showRandomMessage('Wallet bound! Faye is now equipable!')
}

function unbindWallet() {
  walletAddress.value = ''
  isWalletBound.value = false

  // If currently using Faye, switch back to Carol (default)
  if (currentActor.value === 'faye') {
    currentActor.value = 'carol'
    updateCursor('carol')
  }

  saveSettings()
  showRandomMessage('Wallet unbound')
}

function toggleWalletInput() {
  showWalletInput.value = !showWalletInput.value
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


function handleRewardAnimation(reward: number) {

  hideCountdown()
  

  updateStatus('happy')

  showRandomMessage(`+${reward} CPoint! 🎉`)

  if (!isJumping) {
    performJump()
  }
  

  setTimeout(() => {
    updateStatus('thinking')
  }, 2000)
}


function showCountdown(platform: string, countdown: number, reward: number) {
  if (!platform || countdown <= 0 || reward <= 0) {
    hideCountdown()
    return
  }

  const minutes = Math.floor(countdown / 60)
  const seconds = countdown % 60
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

  // Calculate reward with current pet's multiplier
  const multipliedReward = Math.floor(reward * currentCpointRate.value)

  const platformName = platform === 'x' ? '𝕏' : '▶️'

  // Show base reward and multiplied reward
  if (currentCpointRate.value > 1.0) {
    countdownMessage.value = `${timeStr} → ${reward} × ${currentCpointRate.value} = ${multipliedReward} CPoint`
  } else {
    countdownMessage.value = `${timeStr} → ${multipliedReward} CPoint`
  }

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
    const message = `✨ Recommended:\n${recommendation.title}\n${recommendation.description}\n\n💡 Click message to visit → Earn 200 CPoint!`
  
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
        showRandomMessage('Opening recommendation... You\'ll earn 200 CPoint!')
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

  // Listen for storage changes to update CPoint balance in real-time
  browser.storage.onChanged.addListener((changes: any, areaName: string) => {
    if (areaName === 'sync' && changes.ASOUL_CONFIG) {
      const newConfig = changes.ASOUL_CONFIG.newValue
      if (newConfig) {
        try {
          const config = typeof newConfig === 'string' ? JSON.parse(newConfig) : newConfig
          if (config.cpointBalance !== undefined && config.cpointBalance !== cpointBalance.value) {
            const oldBalance = cpointBalance.value
            cpointBalance.value = config.cpointBalance
            console.log('[ASoulPet] CPoint balance updated from storage:', { old: oldBalance, new: config.cpointBalance })
          }
        } catch (error) {
          console.error('[ASoulPet] Failed to parse storage change:', error)
        }
      }
    }
  })


  document.addEventListener('mousemove', handleDocumentMouseMove)
  document.addEventListener('mouseup', handleDocumentMouseUp)

  // Bind keyboard events
  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('keyup', handleKeyUp)
  
  // Listen to window messages
  window.addEventListener('message', handleWindowMessage)
  
  console.log('[ASoulPet] LifeFi Companion initialized')
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
  

  disableFacingMouse()
  disableFollowMouse()
  disableClickTracking()
  
  document.removeEventListener('mousemove', handleDocumentMouseMove)
  document.removeEventListener('mouseup', handleDocumentMouseUp)
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('keyup', handleKeyUp)
  window.removeEventListener('message', handleWindowMessage)

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
  background-color: #000000;
  border: 1.5px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  z-index: 999999;
  pointer-events: none;
  animation: fadeIn 0.2s ease-in-out;
}

.message-bubble.is-recommendation {
  max-width: 280px;
  background: #000000;
  border: 2px solid rgba(255, 255, 255, 0.4);
  cursor: pointer;
  pointer-events: all;
  transition: all 0.2s;
}

.message-bubble.is-recommendation:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.6);
}

.message-bubble p {
  margin: 0;
  font-size: 13px;
  color: white;
  line-height: 1.5;
  word-wrap: break-word;
  white-space: pre-line;
}

.message-bubble.is-recommendation p {
  color: white;
  font-weight: 500;
}

/* 倒计时文字（头顶） */
.countdown-text {
  position: fixed;
  padding: 4px 8px;
  background: #000000;
  color: white;
  border: 1.5px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  z-index: 999998;
  pointer-events: none;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
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


.settings-panel {
  position: fixed;
  background: #000000;
  border-radius: 24px 24px 0 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.9);
  z-index: 999999;
  pointer-events: all;
  animation: slideUpFromBottom 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: none;
}

.settings-view {
  padding: 20px;
  min-width: 280px;
  max-height: calc(80vh - 40px);
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
}

.settings-view::-webkit-scrollbar {
  width: 6px;
}

.settings-view::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.settings-view::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

.settings-view::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
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


.restore-pet-btn {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  padding: 8px 12px;
  width: auto;
  height: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(255, 255, 255, 0.1);
}

.restore-pet-btn:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.15);
}

.restore-pet-btn:active {
  transform: translateY(0) scale(0.98);
}

.restore-icon {
  width: 20px;
  height: 20px;
  color: white;
  transition: transform 0.3s ease;
}

.restore-pet-btn:hover .restore-icon {
  transform: scale(1.1);
}

.character-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 8px;
}

.character-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
}

.character-item:hover {
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.1);
}

.character-item.active {
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 16px rgba(255, 255, 255, 0.15);
}

.character-item img {
  width: 60px;
  height: 60px;
  object-fit: contain;
  margin-bottom: 8px;
}

.character-item span {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.character-item.active span {
  color: white;
  font-weight: 600;
}


.settings-actions {
  margin-top: 16px;
  margin-bottom: 8px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.05);
  color: white;
}

.task-btn:hover,
.game-btn:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.1);
}

.btn-icon {
  font-size: 18px;
}

.btn-text {
  font-size: 14px;
}

/* Wallet Binding Styles */
.wallet-binding-section {
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  margin-bottom: 16px;
}

.wallet-hint {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 16px;
  line-height: 1.5;
  text-align: center;
}

.wallet-input-group {
  display: flex;
  gap: 8px;
}

.wallet-input {
  flex: 1;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  font-size: 14px;
  outline: none;
  transition: all 0.3s ease;
  font-family: monospace;
  color: white;
}

.wallet-input:focus {
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.08);
}

.wallet-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.bind-btn {
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.bind-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.1);
}

.bind-btn:active {
  transform: translateY(0);
}

.wallet-status {
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  margin-bottom: 12px;
}

.wallet-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 13px;
}

.wallet-label {
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
}

.wallet-address {
  flex: 1;
  color: rgba(255, 255, 255, 0.9);
  font-family: monospace;
  font-weight: 600;
  font-size: 12px;
}

.unbind-btn {
  padding: 4px 8px;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;
}

.unbind-btn:hover {
  background: #d32f2f;
  transform: scale(1.05);
}

.character-item.equipable {
  position: relative;
}

.equip-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: white;
  border-radius: 12px;
  font-size: 10px !important;
  font-weight: 700 !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 4px rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.character-item.active .equip-badge {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 2px 4px rgba(255, 255, 255, 0.15);
}

/* CPoint System Styles */
.cpoint-balance-section {
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  margin-bottom: 16px;
  backdrop-filter: blur(20px);
  transition: all 0.3s ease;
}

.cpoint-balance-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 8px;
}

.cpoint-icon {
  font-size: 14px;
  font-weight: 700;
  color: white;
  background: rgba(255, 255, 255, 0.15);
  padding: 6px 10px;
  border-radius: 8px;
  letter-spacing: 1px;
}

.cpoint-amount {
  font-size: 32px;
  font-weight: 600;
  color: white;
  letter-spacing: -1px;
}

.cpoint-label {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
}

.cpoint-rate-info {
  text-align: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

.cpoint-rate-info strong {
  color: white;
  font-size: 15px;
  font-weight: 600;
}

.rate-pet {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

/* More Companion Button */
.more-companion-section {
  padding: 12px 0;
  text-align: center;
}

.more-companion-btn {
  display: inline-block;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  text-decoration: none;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.more-companion-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.1);
}

.more-companion-btn:active {
  transform: translateY(0);
}

/* Locked Companion Styles */
.character-item.locked {
  opacity: 0.7;
  cursor: not-allowed;
  position: relative;
}

.character-item.locked img {
  filter: grayscale(100%);
}

.lock-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.lock-icon {
  width: 32px;
  height: 32px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 8px;
  transition: transform 0.3s ease, color 0.3s ease;
}

.lock-overlay:hover .lock-icon {
  transform: scale(1.1);
  color: white;
}

.unlock-cost {
  font-size: 14px;
  font-weight: 700;
  color: white;
  margin-bottom: 8px;
}

.unlock-progress-bar {
  width: 100%;
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.unlock-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #9e9e9e 0%, #757575 100%);
  transition: width 0.3s ease;
}

.unlock-btn {
  padding: 6px 16px;
  background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.unlock-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
}

.tier-badge {
  padding: 4px 12px;
  background: linear-gradient(135deg, #9e9e9e 0%, #757575 100%);
  color: white;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.pet-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
}

.pet-rate-badge {
  padding: 4px 8px;
  background: linear-gradient(135deg, #9e9e9e 0%, #757575 100%);
  color: white;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.active-badge {
  padding: 3px 8px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  border-radius: 10px;
  font-size: 9px !important;
  font-weight: 700 !important;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.char-name {
  font-size: 13px !important;
  color: rgba(255, 255, 255, 0.8) !important;
  font-weight: 500 !important;
}

.character-item.unlocked:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(255, 255, 255, 0.15);
}

/* Section Headers */
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  margin: 16px 0 12px 0;
  border-radius: 16px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.section-header h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: white;
}

.section-icon {
  font-size: 18px;
}

.nft-section-header {
  border-left: 3px solid rgba(255, 255, 255, 0.3);
}

.cpoint-section-header {
  border-left: 3px solid rgba(255, 255, 255, 0.2);
}

.no-pets-message {
  padding: 32px 16px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
}

.nft-pet {
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  background: rgba(255, 255, 255, 0.05) !important;
  backdrop-filter: blur(20px) !important;
}

.nft-pet:hover {
  border-color: rgba(255, 255, 255, 0.3) !important;
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.1) !important;
}

.nft-rate {
  background: rgba(255, 255, 255, 0.15) !important;
  color: white !important;
}
</style>






