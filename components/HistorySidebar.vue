<script setup lang="ts">
import { computed } from 'vue'
import type { HistoryRecord } from '@/types'

const props = defineProps<{
  visible: boolean
  records: HistoryRecord[]
}>()

const emit = defineEmits<{
  close: []
  undo: [id: string]
  clear: []
}>()

const typeLabels = {
  polish: '✨ 润色',
  fix: '🔧 纠错',
  simplify: '📝 简化',
  expand: '📈 扩写'
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`
  return date.toLocaleDateString('en-US')
}

const groupedRecords = computed(() => {
  const groups: { [key: string]: HistoryRecord[] } = {}
  
  props.records.forEach(record => {
    const date = new Date(record.timestamp).toLocaleDateString('en-US')
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(record)
  })
  
  return groups
})
</script>

<template>
  <div v-if="visible" class="history-sidebar">
    <div class="sidebar-header">
      <h3>Modification History</h3>
      <div class="header-actions">
        <button v-if="records.length > 0" @click="emit('clear')" class="clear-btn">
          Clear
        </button>
        <button @click="emit('close')" class="close-btn">✕</button>
      </div>
    </div>
    
    <div class="sidebar-content">
      <div v-if="records.length === 0" class="empty-state">
        <p>No modification records</p>
      </div>
      
      <div v-else class="records-list">
        <div v-for="(items, date) in groupedRecords" :key="date" class="date-group">
          <div class="date-header">{{ date }}</div>
          
          <div
            v-for="record in items"
            :key="record.id"
            class="record-item"
          >
            <div class="record-header">
              <span class="record-type">{{ typeLabels[record.type] }}</span>
              <span class="record-time">{{ formatTime(record.timestamp) }}</span>
            </div>
            
            <div class="record-content">
              <div class="text-block">
                <div class="text-label">Original text:</div>
                <div class="text-value original">{{ record.originalText }}</div>
              </div>
              
              <div class="text-block">
                <div class="text-label">Modified text:</div>
                <div class="text-value new">{{ record.newText }}</div>
              </div>
            </div>
            
            <div class="record-footer">
              <button @click="emit('undo', record.id)" class="undo-btn">
                Undo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: 380px;
  height: 100vh;
  background: white;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  z-index: 999998;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.clear-btn {
  padding: 4px 12px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #6b7280;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;
  color: #6b7280;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.date-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.date-header {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.record-item {
  background: #f9fafb;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #e5e7eb;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.record-type {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
}

.record-time {
  font-size: 12px;
  color: #9ca3af;
}

.record-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.text-block {
  font-size: 13px;
}

.text-label {
  color: #6b7280;
  margin-bottom: 4px;
  font-size: 11px;
}

.text-value {
  padding: 8px;
  border-radius: 4px;
  line-height: 1.5;
}

.text-value.original {
  background: white;
  color: #6b7280;
  text-decoration: line-through;
}

.text-value.new {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #d1fae5;
}

.record-footer {
  display: flex;
  justify-content: flex-end;
}

.undo-btn {
  padding: 4px 12px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: #6b7280;
  transition: all 0.2s;
}

.undo-btn:hover {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}
</style>

