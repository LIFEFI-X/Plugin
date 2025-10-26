<template>
  <div v-if="visible" class="chat-dialog-overlay" @click.self="handleClose">
    <div class="chat-dialog">
      <!-- Header --> 
      <div class="chat-header">
        <div class="chat-title">
          <img :src="petAvatar" class="pet-avatar" alt="LifeFi" />
          <span>{{ t('pet.chat.title') }}</span>
        </div>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <!-- Context Information -->
      <div v-if="contextInfo.hasContext" class="context-info">
        <div class="context-section" v-if="contextInfo.knowledgeBases.length > 0">
          <div class="section-header" @click="toggleSection('kb')">
            <span>📚 {{ t('pet.chat.knowledgeBase') }} ({{ contextInfo.knowledgeBases.length }})</span>
            <span class="toggle-icon">{{ expandedSections.kb ? '▼' : '▶' }}</span>
          </div>
          <div v-if="expandedSections.kb" class="section-content">
            <div v-for="(kb, index) in contextInfo.knowledgeBases" :key="kb.id" class="context-item">
              <div class="item-title">{{ index + 1 }}. {{ kb.title }}</div>
              <div class="item-content">{{ kb.content.substring(0, 100) }}...</div>
            </div>
          </div>
        </div>

        <div class="context-section" v-if="contextInfo.crossTabContexts.length > 0">
          <div class="section-header" @click="toggleSection('ctx')">
            <span>📎 {{ t('pet.chat.context') }} ({{ contextInfo.crossTabContexts.length }})</span>
            <span class="toggle-icon">{{ expandedSections.ctx ? '▼' : '▶' }}</span>
          </div>
          <div v-if="expandedSections.ctx" class="section-content">
            <div v-for="(ctx, index) in contextInfo.crossTabContexts" :key="ctx.id" class="context-item">
              <div class="item-content">{{ index + 1 }}. {{ ctx.text }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Chat Messages Area -->
      <div class="chat-messages" ref="messagesContainer">
        <div v-for="(msg, index) in messages" :key="index" :class="['message', msg.role]">
          <div class="message-avatar" v-if="msg.role === 'assistant'">
            <img :src="petAvatar" alt="LifeFi" />
          </div>
          <div class="message-content">
            <div class="message-text">{{ msg.content }}</div>
            <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
          </div>
          <div class="message-avatar" v-if="msg.role === 'user'">
            <div class="user-avatar">You</div>
          </div>
        </div>

        <!-- Loading Status -->
        <div v-if="isLoading" class="message assistant">
          <div class="message-avatar">
            <img :src="petAvatar" alt="LifeFi" />
          </div>
          <div class="message-content">
            <div class="loading-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="chat-input-area">
        <textarea
          v-model="userInput"
          :placeholder="t('pet.chat.inputPlaceholder')"
          @keydown.enter.exact.prevent="handleSend"
          @keydown.enter.shift.exact="userInput += '\n'"
          :disabled="isLoading"
          rows="3"
        ></textarea>
        <button 
          class="send-btn" 
          @click="handleSend" 
          :disabled="isLoading || !userInput.trim()"
        >
          {{ isLoading ? t('pet.chat.sending') : t('pet.chat.send') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { t } from '@/utils/i18n'

const props = defineProps<{
  visible: boolean
  initialMessage?: string
  currentActor: string
}>()

const emit = defineEmits<{
  close: []
}>()

// State
const messages = ref<Array<{ role: 'user' | 'assistant', content: string, timestamp: number }>>([])
const userInput = ref('')
const isLoading = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)

// Context information
const contextInfo = ref<{
  hasContext: boolean
  knowledgeBases: Array<{ id: string, title: string, content: string }>
  crossTabContexts: Array<{ id: string, text: string }>
}>({
  hasContext: false,
  knowledgeBases: [],
  crossTabContexts: []
})

// Expanded sections state
const expandedSections = ref({
  kb: false,
  ctx: false
})

// Pet avatar
const petAvatar = computed(() => {
  return browser.runtime.getURL(`asoul/${props.currentActor}/thinking.png`)
})

// Toggle section
function toggleSection(section: 'kb' | 'ctx') {
  expandedSections.value[section] = !expandedSections.value[section]
}

// Format time
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// Scroll to bottom
async function scrollToBottom() {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// Send message 
async function handleSend() {
  const input = userInput.value.trim()
  if (!input || isLoading.value) return

  // Add user message
  messages.value.push({
    role: 'user',
    content: input,
    timestamp: Date.now()
  })
  userInput.value = ''
  scrollToBottom()

  // Call AI
  isLoading.value = true
  try {
    const response = await browser.runtime.sendMessage({
      type: 'LIFEFI_PET_AI_CALL',
      payload: {
        action: 'chat',
        prompt: input
      }
    })

    if (response && response.success) {
      messages.value.push({
        role: 'assistant',
        content: response.result || t('pet.ai.noResponse'),
        timestamp: Date.now()
      })
    } else {
      messages.value.push({
        role: 'assistant',
        content: response?.error || t('pet.ai.error'),
        timestamp: Date.now()
      })
    }
  } catch (error) {
    console.error('[ChatDialog] AI request failed:', error)
    messages.value.push({
      role: 'assistant',
      content: t('pet.ai.error'),
      timestamp: Date.now()
    })
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

// Close dialog
function handleClose() {
  emit('close')
}

// Load context information 
async function loadContext() {
  try {
    const response = await browser.runtime.sendMessage({
      type: 'LIFEFI_GET_CONTEXT'
    })

    if (response && response.success && response.context) {
      contextInfo.value = {
        hasContext: true,
        knowledgeBases: response.context.knowledgeBases || [],
        crossTabContexts: response.context.crossTabContexts || []
      }
      console.log('[ChatDialog] Context loaded:', contextInfo.value)
    }
  } catch (error) {
    console.error('[ChatDialog] Failed to load context:', error)
  }
}

// Initialize
watch(() => props.visible, async (newVal) => {
  if (newVal) {
    // Load context when opening dialog
    await loadContext()
    
    // If there is an initial message, send it automatically
    if (props.initialMessage && messages.value.length === 0) {
      userInput.value = props.initialMessage
      setTimeout(() => {
        handleSend()
      }, 300)
    }
    
    scrollToBottom()
  }
})

onMounted(() => {
  if (props.visible) {
    loadContext()
  }
})
</script>

<style scoped>
.chat-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2147483646;
  backdrop-filter: blur(4px);
}

.chat-dialog {
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  width: 600px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.chat-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
}

.pet-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid white;
  object-fit: cover;
}

.close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 24px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Context Information Area */
.context-info {
  border-bottom: 1px solid #eee;
  max-height: 200px;
  overflow-y: auto;
}

.context-section {
  border-bottom: 1px solid #f5f5f5;
}

.context-section:last-child {
  border-bottom: none;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #f9f9f9;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  user-select: none;
}

.section-header:hover {
  background: #f5f5f5;
}

.toggle-icon {
  font-size: 12px;
  color: #999;
}

.section-content {
  padding: 8px 20px 12px;
  background: white;
}

.context-item {
  margin-bottom: 8px;
  padding: 8px;
  background: #f9f9f9;
  border-radius: 6px;
  font-size: 13px;
}

.item-title {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.item-content {
  color: #666;
  font-size: 12px;
  line-height: 1.4;
}

/* Messages Area */
.chat-messages {
  flex: 1;
  min-height: 300px;
  max-height: 500px;
  overflow-y: auto;
  padding: 20px;
  background: #f5f5f5;
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  animation: messageSlideIn 0.3s ease-out;
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

.message-avatar img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-text {
  background: white;
  padding: 12px 16px;
  border-radius: 12px;
  line-height: 1.6;
  color: #333;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.message.user .message-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.message-time {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
  padding: 0 4px;
}

.loading-dots {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  background: white;
  border-radius: 12px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #999;
  animation: dotFlashing 1s infinite;
}

.loading-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.loading-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes dotFlashing {
  0%, 80%, 100% {
    opacity: 0.3;
  }
  40% {
    opacity: 1;
  }
}

/* Input Area */
.chat-input-area {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #eee;
  background: white;
}

.chat-input-area textarea {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  resize: none;
  transition: border-color 0.2s;
}

.chat-input-area textarea:focus {
  outline: none;
  border-color: #667eea;
}

.chat-input-area textarea:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.send-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
  white-space: nowrap;
}

.send-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* Scrollbar Styles */
.chat-messages::-webkit-scrollbar,
.context-info::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track,
.context-info::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb,
.context-info::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover,
.context-info::-webkit-scrollbar-thumb:hover {
  background: #999;
}
</style>

