<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
  type: 'simplify' | 'expand' | 'translate'
  content: string
  position: { top: number; left: number }
  locale?: 'zh-CN' | 'en'
}>()

const emit = defineEmits<{
  close: []
}>()

const visible = ref(false)

onMounted(() => {
  // delay visibility to enable transition animation
  setTimeout(() => {
    visible.value = true
  }, 10)
})

const handleClose = () => {
  visible.value = false
  setTimeout(() => {
    emit('close')
  }, 300)
}

const getLabel = () => {
  const labels = {
    'zh-CN': {
      simplify: 'Simplify',
      expand: 'Expand',
      translate: 'Translate'
    },
    'en': {
      simplify: 'Simplify',
      expand: 'Expand',
      translate: 'Translate'
    }
  }
  const locale = props.locale || 'en'
  return labels[locale][props.type]
}
</script>

<template>
  <div
    class="lifefi-inline-response"
    :class="{ visible }"
    :style="{
      position: 'absolute',
      top: `${position.top}px`,
      left: `${position.left}px`,
      zIndex: 999998
    }"
  >
    <div class="response-card">
      <div class="response-header">
        <span class="response-label">{{ getLabel() }}:</span>
        <button class="close-btn" @click="handleClose">✕</button>
      </div>
      <div class="response-content">{{ content }}</div>
    </div>
  </div>
</template>

<style scoped>
.lifefi-inline-response {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  max-width: 600px;
  opacity: 0;
  transform: translateY(-10px);
  transition: all 0.3s ease-out;
  pointer-events: none;
}

.lifefi-inline-response.visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.response-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 2px solid #e5e7eb;
  padding: 12px 16px;
  margin-top: 8px;
}

.response-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.response-label {
  font-weight: 600;
  font-size: 13px;
  color: #3b82f6;
  text-transform: capitalize;
}

.close-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.response-content {
  color: #1f2937;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
