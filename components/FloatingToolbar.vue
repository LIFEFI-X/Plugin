<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  visible: boolean
  position: { x: number; y: number }
  locale?: 'zh-CN' | 'en'
}>()

const emit = defineEmits<{
  action: [type: 'simplify' | 'expand' | 'translate' | 'addContext' | 'custom']
  close: []
}>()

const loading = ref(false)

const handleAction = (type: 'simplify' | 'expand' | 'translate' | 'addContext' | 'custom') => {
  emit('action', type)
}

// Internationalization text
const i18n = computed(() => {
  const locale = props.locale || 'zh-CN'
  return {
    'zh-CN': {
      simplify: { label: '📝 简化', desc: '精简表达' },
      expand: { label: '📈 扩写', desc: '丰富内容' },
      translate: { label: '🌐 翻译', desc: '中英对照' },
      custom: { label: '✏️ 自定义', desc: '询问 AI' },
      addContext: { label: '📎 上下文', desc: '添加到库' }
    },
    'en': {
      simplify: { label: '📝 Simplify', desc: 'Make concise' },
      expand: { label: '📈 Expand', desc: 'Add details' },
      translate: { label: '🌐 Translate', desc: 'Bilingual' },
      custom: { label: '✏️ Custom', desc: 'Ask AI' },
      addContext: { label: '📎 Context', desc: 'Add to lib' }
    }
  }[locale]
})

const actions = computed(() => [
  { type: 'simplify' as const, ...i18n.value.simplify },
  { type: 'expand' as const, ...i18n.value.expand },
  { type: 'translate' as const, ...i18n.value.translate },
  { type: 'custom' as const, ...i18n.value.custom },
  { type: 'addContext' as const, ...i18n.value.addContext }
])
</script>

<template>
  <div
    v-if="visible"
    class="lifefi-toolbar"
    :style="{
      position: 'fixed !important',
      left: `${position.x}px !important`,
      top: `${position.y}px !important`,
      zIndex: 2147483647,
      display: 'block !important',
      visibility: 'visible !important',
      opacity: '1 !important'
    }"
  >
    <div class="toolbar-container">
      <button
        v-for="action in actions"
        :key="action.type"
        class="toolbar-btn"
        :disabled="loading"
        @click="handleAction(action.type)"
      >
        <span class="btn-label">{{ action.label }}</span>
        <span class="btn-desc">{{ action.desc }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.lifefi-toolbar {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.toolbar-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 8px;
  display: flex;
  gap: 4px;
  border: 1px solid #e5e7eb;
}

.toolbar-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 12px;
  border: none;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 70px;
}

.toolbar-btn:hover {
  background: #f3f4f6;
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-label {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.btn-desc {
  font-size: 11px;
  color: #6b7280;
}
</style>

