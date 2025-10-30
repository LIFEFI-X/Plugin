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
  font-family:'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #000000;
  padding: 6px 12px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 400px;
  animation: fadeIn 0.2s ease-out;
  backdrop-filter: blur(20px);
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
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.suggestion-hint {
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}
</style>

