<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  selectedText?: string
}>()

const emit = defineEmits<{
  submit: [data: { prompt: string }]
  close: []
}>()

const localVisible = ref(props.visible)
const prompt = ref('')

watch(() => props.visible, (val) => {
  localVisible.value = val
  if (val) {
    prompt.value = ''
    isSubmitting.value = false
  }
})

watch(() => props.selectedText, (val) => {
  console.log('[CustomInput] Selection updated:', val?.substring(0, 50))
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

const isSubmitting = ref(false)

// 重置表单
const resetForm = () => {
  prompt.value = ''
  isSubmitting.value = false
  console.log('[CustomInput] Form reset')
}

// 暴露重置方法给父组件
defineExpose({
  resetForm
})

const handleSubmit = () => {
  if (!prompt.value.trim()) return
  if (isSubmitting.value) {
    console.log('[CustomInput] Submission in progress; skipping duplicate request')
    return
  }
  
  console.log('[CustomInput] Submitting:', {
    promptLength: prompt.value.trim().length
  })
  
  isSubmitting.value = true
  
  emit('submit', {
    prompt: prompt.value.trim()
  })
  
  // 延迟重置提交状态，防止关闭动画期间重复触发
  setTimeout(() => {
    isSubmitting.value = false
  }, 500)
  
  handleClose()
}

// 图片功能已移除
</script>

<template>
  <div
    v-show="localVisible"
    class="lifefi-custom-input-backdrop"
    @click="handleBackdropClick"
  >
    <div class="lifefi-custom-input-modal">
      <div class="modal-header">
        <h3 class="modal-title">Custom Prompt</h3>
        <button class="close-btn" @click="handleClose">✕</button>
      </div>
      
      <div class="modal-body">
        <div v-if="selectedText" class="selected-text-preview">
          <div class="preview-label">Selected Text:</div>
          <div class="preview-content">{{ selectedText }}</div>
        </div>
        
        <div class="input-section">
          <label class="input-label">Enter your prompt:</label>
          <textarea
            v-model="prompt"
            class="prompt-textarea"
            placeholder="Ask AI anything about the selected text..."
            rows="6"
            autofocus
          ></textarea>
          <div class="input-hint">
            💡 Tip: The selected text will be used as context
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn-secondary" @click="handleClose">Cancel</button>
        <button 
          class="btn-primary" 
          @click="handleSubmit"
          :disabled="!prompt.trim()"
        >
          Submit
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lifefi-custom-input-backdrop {
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

.lifefi-custom-input-modal {
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

.close-btn:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
  position: relative;
}

.selected-text-preview {
  margin-bottom: 20px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.preview-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.preview-content {
  color: #1f2937;
  font-size: 14px;
  line-height: 1.5;
  max-height: 100px;
  overflow-y: auto;
}

.input-section {
  margin-bottom: 16px;
}

.input-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.prompt-textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.5;
  color: #1f2937;
  resize: vertical;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.prompt-textarea:focus {
  outline: none;
  border-color: #3b82f6;
}

.prompt-textarea::placeholder {
  color: #9ca3af;
}

.input-hint {
  font-size: 12px;
  color: #6b7280;
  margin-top: 8px;
}

.images-preview {
  margin-top: 16px;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
  margin-top: 8px;
}

.image-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid #e5e7eb;
}

.image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-img-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.remove-img-btn:hover {
  background: rgba(0, 0, 0, 0.9);
}

.drag-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(59, 130, 246, 0.1);
  border: 3px dashed #3b82f6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.drag-message {
  font-size: 18px;
  font-weight: 600;
  color: #3b82f6;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-secondary,
.btn-primary {
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  border: none;
}

.btn-secondary {
  background: white;
  border: 1px solid #d1d5db;
  color: #374151;
}

.btn-secondary:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
