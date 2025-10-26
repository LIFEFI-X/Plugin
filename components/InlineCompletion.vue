<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  visible: boolean
  suggestion: string
  position: { top: number; left: number }
}>()

const emit = defineEmits<{
  accept: []
  reject: []
}>()
</script>

<template>
  <div
    v-if="visible && suggestion"
    class="inline-completion"
    :style="{
      top: `${position.top}px`,
      left: `${position.left}px`
    }"
  >
    <span class="suggestion-text">{{ suggestion }}</span>
    <span class="suggestion-hint">Tab to accept</span>
  </div>
</template>

<style scoped>
.inline-completion {
  position: fixed;
  z-index: 2147483647;
  pointer-events: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: white;
  padding: 6px 12px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 400px;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.suggestion-text {
  color: #667eea;
  font-size: 14px;
  font-weight: 500;
}

.suggestion-hint {
  padding: 2px 8px;
  background: #667eea;
  color: white;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}
</style>

