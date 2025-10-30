<template>
  <div class="task-panel">
    <!-- Header -->
    <div class="task-header">
      <button class="back-btn" @click="$emit('back')">
        <span class="back-icon">←</span>
        <span class="back-text">Back</span>
      </button>
      <div class="cpoint-balance">
        <span class="balance-icon">CP</span>
        <span class="balance-amount">{{ balance }}</span>
        <span class="balance-label">CPoint</span>
      </div>
    </div>

    <!-- Task List -->
    <div class="task-list">
      <div
        v-for="task in tasks"
        :key="task.id"
        :class="['task-item', { active: task.isActive }]"
      >
        <!-- Task Header -->
        <div class="task-title">
          <span class="platform-icon">{{ getPlatformIcon(task.platform) }}</span>
          <span class="title-text">{{ task.title }}</span>
          <span v-if="task.isActive" class="active-badge">Active</span>
        </div>

        <!-- Task Description -->
        <p class="task-description">{{ task.description }}</p>

        <!-- Current Progress -->
        <div v-if="task.isActive" class="current-progress">
          <div class="progress-time">
            <span class="time-icon">⏱️</span>
            <span class="time-text">{{ formatTime(task.currentDuration) }}</span>
          </div>
        </div>

        <!-- Milestones -->
        <div class="milestones">
          <div
            v-for="(milestone, index) in task.milestones"
            :key="index"
            :class="['milestone', {
              'completed': milestone.claimed,
              'available': !milestone.claimed && task.currentDuration >= milestone.duration,
              'locked': !milestone.claimed && task.currentDuration < milestone.duration
            }]"
          >
            <div class="milestone-content">
              <div class="milestone-info">
                <span class="milestone-duration">{{ formatTime(milestone.duration) }}</span>
                <span class="milestone-reward">+{{ milestone.reward }} CPoint</span>
              </div>
              
              <!-- Countdown (only for next unclaimed milestone) -->
              <div
                v-if="!milestone.claimed && task.isActive && isNextMilestone(task, index)"
                class="countdown"
              >
                <span class="countdown-icon">⏳</span>
                <span class="countdown-text">{{ formatTime(calculateCountdown(task.currentDuration, milestone.duration)) }}</span>
              </div>

              <!-- Status Icon -->
              <div class="milestone-status">
                <svg v-if="milestone.claimed" class="status-icon claimed" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M8 12L11 15L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <svg v-else-if="task.currentDuration >= milestone.duration" class="status-icon ready" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L14 8H20L15 12L17 18L12 14L7 18L9 12L4 8H10L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                  <circle cx="12" cy="10" r="2" fill="currentColor"/>
                </svg>
                <svg v-else class="status-icon locked" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="6" y="11" width="12" height="9" rx="2" stroke="currentColor" stroke-width="2"/>
                  <path d="M9 11V7C9 5.34315 10.3431 4 12 4C13.6569 4 15 5.34315 15 7V11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <circle cx="12" cy="15.5" r="1" fill="currentColor"/>
                </svg>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="milestone-progress-bar">
              <div
                class="progress-fill"
                :style="{ width: `${getProgressPercentage(task.currentDuration, milestone.duration)}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { Task } from '@/types/task'
import { getTasks, getGPTBalance } from '@/utils/reward'
import { formatTime, calculateCountdown } from '@/utils/tracking'

// Define emits
const emit = defineEmits<{
  back: []
  'reward-claimed': [reward: number, newBalance: number]
}>()

// State
const tasks = ref<Task[]>([])
const balance = ref<number>(0)

// Timer for updating UI
let updateTimer: number | null = null

// Load initial data
async function loadData() {
  try {
    const [taskList, balanceData] = await Promise.all([
      getTasks(),
      getGPTBalance()
    ])
    
    tasks.value = taskList
    balance.value = balanceData.total
    
    console.log('[TaskPanel] Data loaded:', { tasks: taskList.length, balance: balanceData.total })
  } catch (error) {
    console.error('[TaskPanel] Failed to load data:', error)
  }
}

// Get platform icon
function getPlatformIcon(platform: 'x' | 'youtube'): string {
  return platform === 'x' ? '𝕏' : '▶️'
}

// Calculate progress percentage
function getProgressPercentage(current: number, target: number): number {
  return Math.min(100, (current / target) * 100)
}

// Check if this is the next milestone to be claimed
function isNextMilestone(task: Task, index: number): boolean {
  // Find the first unclaimed milestone
  for (let i = 0; i < task.milestones.length; i++) {
    if (!task.milestones[i].claimed) {
      return i === index
    }
  }
  return false
}

// Listen for reward events
function handleRewardClaimed(event: CustomEvent) {
  const { reward, balance: newBalance } = event.detail
  
  console.log('[TaskPanel] Reward claimed:', { reward, newBalance })
  
  balance.value = newBalance
  
  // Notify parent component to update CPoint balance
  emit('reward-claimed', reward, newBalance)
  
  // Reload tasks to update milestone status
  loadData()
}

// Start update timer
function startUpdateTimer() {
  // Update every second
  updateTimer = window.setInterval(() => {
    loadData()
  }, 1000)
}

// Stop update timer
function stopUpdateTimer() {
  if (updateTimer) {
    clearInterval(updateTimer)
    updateTimer = null
  }
}

// Lifecycle
onMounted(() => {
  loadData()
  startUpdateTimer()
  
  // Listen for reward events
  window.addEventListener('task-reward-claimed', handleRewardClaimed as EventListener)
  
  console.log('[TaskPanel] Mounted')
})

onUnmounted(() => {
  stopUpdateTimer()
  window.removeEventListener('task-reward-claimed', handleRewardClaimed as EventListener)
  
  console.log('[TaskPanel] Unmounted')
})
</script>

<style scoped>
.task-panel {
  width: 100%;
  height: 100%;
  background: #000000;
  color: white;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
}

/* Header */
.task-header {
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 8px 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateX(-2px);
}

.back-icon {
  font-size: 16px;
}

.back-text {
  font-size: 14px;
}

.cpoint-balance {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.balance-icon {
  font-size: 14px;
  font-weight: 700;
  color: white;
  background: rgba(255, 255, 255, 0.15);
  padding: 4px 8px;
  border-radius: 6px;
  letter-spacing: 1px;
}

.balance-amount {
  font-size: 24px;
  font-weight: 600;
  color: white;
}

.balance-label {
  font-size: 14px;
  opacity: 0.7;
  font-weight: 500;
}

/* Task List */
.task-list {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.task-item {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.task-item.active {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 16px rgba(255, 255, 255, 0.1);
}

.task-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.platform-icon {
  font-size: 20px;
}

.title-text {
  font-size: 16px;
  font-weight: 600;
  flex: 1;
}

.active-badge {
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.task-description {
  margin: 0 0 12px 0;
  font-size: 13px;
  opacity: 0.7;
  line-height: 1.4;
}

/* Current Progress */
.current-progress {
  margin-bottom: 12px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

.progress-time {
  display: flex;
  align-items: center;
  gap: 6px;
}

.time-icon {
  font-size: 16px;
}

.time-text {
  font-size: 16px;
  font-weight: 600;
}

/* Milestones */
.milestones {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.milestone {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px;
  transition: all 0.3s ease;
}

.milestone.locked {
  opacity: 0.5;
}

.milestone.available {
  border-color: rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.08);
}

.milestone.completed {
  opacity: 0.6;
  background: rgba(255, 255, 255, 0.02);
}

.milestone-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.milestone-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.milestone-duration {
  font-size: 14px;
  font-weight: 600;
}

.milestone-reward {
  font-size: 13px;
  opacity: 0.8;
}

.countdown {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  opacity: 0.7;
}

.countdown-icon {
  font-size: 14px;
}

.milestone-status .status-icon {
  width: 24px;
  height: 24px;
  transition: transform 0.3s ease;
}

.milestone-status .status-icon.claimed {
  color: rgba(255, 255, 255, 0.8);
}

.milestone-status .status-icon.ready {
  color: white;
  animation: pulse 2s ease-in-out infinite;
}

.milestone-status .status-icon.locked {
  color: rgba(255, 255, 255, 0.4);
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

.milestone-progress-bar {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: rgba(255, 255, 255, 0.3);
  transition: width 0.3s ease;
  border-radius: 2px;
}

.milestone.completed .progress-fill {
  background: rgba(255, 255, 255, 0.2);
}

.milestone.available .progress-fill {
  background: white;
}

/* Scrollbar */
.task-list::-webkit-scrollbar {
  width: 6px;
}

.task-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.task-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

.task-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}
</style>

