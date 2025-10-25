<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  content: string
  loading?: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const localVisible = ref(props.visible)

watch(() => props.visible, (val) => {
  localVisible.value = val
})

const handleClose = () => {
  localVisible.value = false
  emit('close')
}

const handleBackdropClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) {
    handleClose()
  }
}
</script>

<template>
  <div
    v-show="localVisible"
    class="lifefi-response-modal-backdrop"
    @click="handleBackdropClick"
  >
    <div class="lifefi-response-modal">
      <div class="modal-header">
        <h3 class="modal-title">{{ loading ? 'AI Processing...' : 'AI Response' }}</h3>
        <button class="close-btn" @click="handleClose" :disabled="loading">
          ✕
        </button>
      </div>
      <div class="modal-body">
        <div v-if="loading" class="loading-spinner">
          <div class="spinner"></div>
          <p>Processing your request...</p>
        </div>
        <div v-else class="response-content">
          {{ content }}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" @click="handleClose" :disabled="loading">
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lifefi-response-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999999;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.lifefi-response-modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 20px;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover:not(:disabled) {
  background: #f3f4f6;
  color: #1f2937;
}

.close-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-spinner p {
  color: #6b7280;
  font-size: 14px;
  margin: 0;
}

.response-content {
  color: #1f2937;
  font-size: 15px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-secondary {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  transition: all 0.2s;
}

.btn-secondary:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
