<template>
  <div class="task-panel">
    <!-- Header -->
    <div class="task-header">
      <div class="gpt-balance">
        <span class="balance-amount">{{ balance }}</span>
        <span class="balance-label">GPT</span>
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
                <span class="milestone-reward">+{{ milestone.reward }} GPT</span>
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
                <span v-if="milestone.claimed" class="status-icon claimed">✅</span>
                <span v-else-if="task.currentDuration >= milestone.duration" class="status-icon ready">🎁</span>
                <span v-else class="status-icon locked">🔒</span>
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* Header */
.task-header {
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.header-title .icon {
  font-size: 24px;
}

.header-title h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.gpt-balance {
  display: flex;
  align-items: center;
  justify-content: end;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  backdrop-filter: blur(5px);
}

.gpt-icon {
  font-size: 20px;
}

.balance-amount {
  font-size: 24px;
  font-weight: 700;
  color: #ffd700;
}

.balance-label {
  font-size: 14px;
  opacity: 0.9;
}

/* Task List */
.task-list {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.task-item {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.task-item.active {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 215, 0, 0.5);
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
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
  background: rgba(34, 197, 94, 0.9);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.task-description {
  margin: 0 0 12px 0;
  font-size: 13px;
  opacity: 0.9;
  line-height: 1.4;
}

/* Current Progress */
.current-progress {
  margin-bottom: 12px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
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
  font-size: 18px;
  font-weight: 600;
  color: #ffd700;
}

/* Milestones */
.milestones {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.milestone {
  padding: 12px;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.milestone.locked {
  background: rgba(0, 0, 0, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.milestone.available {
  background: rgba(34, 197, 94, 0.2);
  border: 2px solid rgba(34, 197, 94, 0.5);
  animation: pulse 2s ease-in-out infinite;
}

.milestone.completed {
  background: rgba(0, 0, 0, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.2);
  opacity: 0.7;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(34, 197, 94, 0);
  }
}

.milestone-content {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.milestone-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.milestone-duration {
  font-size: 14px;
  font-weight: 600;
  opacity: 0.9;
}

.milestone-reward {
  font-size: 16px;
  font-weight: 700;
  color: #ffd700;
}

.countdown {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
}

.countdown-icon {
  font-size: 14px;
}

.countdown-text {
  font-size: 14px;
  font-weight: 600;
  color: #ffd700;
}

.milestone-status {
  display: flex;
  align-items: center;
}

.status-icon {
  font-size: 20px;
}

.status-icon.ready {
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

/* Progress Bar */
.milestone-progress-bar {
  height: 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffd700 0%, #ffed4e 100%);
  border-radius: 3px;
  transition: width 0.5s ease;
}

/* Scrollbar */
.task-list::-webkit-scrollbar {
  width: 6px;
}

.task-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.task-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.task-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.4);
}
</style>

