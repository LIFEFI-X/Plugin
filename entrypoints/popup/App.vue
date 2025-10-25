<script lang="ts" setup>
import { ref, onMounted, computed, toRaw } from 'vue'
import { nanoid } from 'nanoid'
import { detectApiType } from '@/utils/api'
import {
  saveConfig as saveToDb,
  getConfig as getFromDb,
  getAllKBs,
  saveKB,
  deleteKB,
  getAllCrossTabContexts,
  deleteCrossTabContext,
  clearAllCrossTabContexts
} from '@/utils/db'
import type { KnowledgeBase, CrossTabContext } from '@/types/knowledge'
import { estimateTokens, formatTokenCount } from '@/utils/token'
import { useI18n } from '@/utils/i18n'
import { createNFTTransfer, openNFTCreationPage } from '@/utils/nft-bridge'

// ============ Internationalization ============
const { t, currentLanguage, setLanguage, availableLanguages, loadLanguage } = useI18n()

// ============ DeepSeek configuration (hidden but logic preserved) ============
const config = ref({
  apiUrl: 'https://api.deepseek.com/chat/completions', // switch to Chat API
  apiKey: 'sk-99fe12f7b8154369a90d0596dfb3e0d3',
  modelId: 'deepseek-chat',
  maxTokens: 150,
  temperature: 1.5
})

// Force initialize DeepSeek configuration (overwrite on each load)
async function initDefaultConfig() {
  try {
    console.log('[Popup] Forcing DeepSeek configuration override...')
    
    const defaultProvider = {
      id: 'deepseek',
      name: 'DeepSeek',
      apiUrl: config.value.apiUrl,
      apiKey: config.value.apiKey,
      apiType: 'deepseek',
      enabled: true,
      models: [{
        id: config.value.modelId,
        name: config.value.modelId,
        config: {
          maxTokens: config.value.maxTokens,
          temperature: config.value.temperature,
          stream: true
        }
      }]
    }
    
    // Force save to overwrite previous configuration
    await saveToDb('aiProviders', [defaultProvider])
    await saveToDb('selectedModel', {
      providerId: 'deepseek',
      modelId: config.value.modelId
    })
    
    console.log('[Popup] ✅ DeepSeek configuration overwritten')
    return true
  } catch (error) {
    console.error('[Popup] Failed to initialize default configuration:', error)
    return false
  }
}

// ============ Knowledge base management ============
const knowledgeBases = ref<KnowledgeBase[]>([])
const showKBDialog = ref(false)
const kbDialogMode = ref<'create' | 'edit'>('create')
const currentKB = ref<Partial<KnowledgeBase>>({
  title: '',
  content: ''
})

// Load knowledge base list
async function loadKBs() {
  knowledgeBases.value = await getAllKBs()
}

// Open create knowledge base dialog
function openCreateKBDialog() {
  kbDialogMode.value = 'create'
  currentKB.value = {
    title: '',
    content: ''
  }
  showKBDialog.value = true
}

// Open edit knowledge base dialog
function openEditKBDialog(kb: KnowledgeBase) {
  kbDialogMode.value = 'edit'
  currentKB.value = { ...kb }
  showKBDialog.value = true
}

// Save knowledge base
async function saveKBItem() {
  if (!currentKB.value.title?.trim() || !currentKB.value.content?.trim()) {
    alert('Please fill in both the title and the content.')
    return
  }
  
  const now = Date.now()
  const kb: KnowledgeBase = {
    id: currentKB.value.id || nanoid(),
    title: currentKB.value.title.trim(),
    content: currentKB.value.content.trim(),
    enabled: currentKB.value.enabled ?? false,
    createdAt: currentKB.value.createdAt || now,
    updatedAt: now,
    tokens: estimateTokens(currentKB.value.content)
  }
  
  await saveKB(kb)
  await loadKBs()
  showKBDialog.value = false
}

// Delete knowledge base
async function deleteKBItem(id: string) {
  if (!confirm('Are you sure you want to delete this knowledge base?')) return
  await deleteKB(id)
  await loadKBs()
}

// Toggle knowledge base enabled state
async function toggleKBEnabled(kb: KnowledgeBase) {
  const enabledCount = knowledgeBases.value.filter(k => k.enabled).length
  
  // When enabling, ensure the limit has not been reached
  if (!kb.enabled && enabledCount >= 3) {
    alert('You can only enable up to three knowledge bases at the same time.')
    return
  }
  
  // Toggle state
  kb.enabled = !kb.enabled
  kb.updatedAt = Date.now()
  
  console.log('[KB] Toggled knowledge base state:', kb.title, kb.enabled ? 'enabled' : 'disabled')
  
  // Convert to plain object and persist to IndexedDB
  const plainKB = toRaw(kb)
  await saveKB(plainKB)
  
  console.log('[KB] ✅ State saved')
  
  // Reload to keep state in sync
  await loadKBs()
}

// Compute knowledge base status
const kbStats = computed(() => {
  const enabled = knowledgeBases.value.filter(kb => kb.enabled)
  const totalTokens = enabled.reduce((sum, kb) => sum + (kb.tokens || 0), 0)
  return {
    total: knowledgeBases.value.length,
    enabled: enabled.length,
    totalTokens
  }
})

// ============ NFT creation features ============
const isNFTMode = ref(false)
const selectedKBs = ref<string[]>([])
const isCreatingNFT = ref(false)

// Toggle NFT selection mode
function toggleNFTMode() {
  isNFTMode.value = !isNFTMode.value
  if (!isNFTMode.value) {
    selectedKBs.value = []
  }
  console.log('[NFT] Switching mode:', isNFTMode.value ? 'selection mode' : 'standard mode')
}

// Toggle knowledge base selection
function toggleKBSelection(kb: KnowledgeBase) {
  if (!isNFTMode.value) return
  
  const index = selectedKBs.value.indexOf(kb.id)
  if (index > -1) {
    // Already selected; remove selection
    selectedKBs.value.splice(index, 1)
  } else {
    // Not selected; add selection
    if (selectedKBs.value.length >= 5) {
      alert(t('nft.max_selection'))
      return
    }
    selectedKBs.value.push(kb.id)
  }
  console.log('[NFT] Selected:', selectedKBs.value.length, 'knowledge bases', selectedKBs.value)
}

// Create NFT transfer
async function handleCreateNFT() {
  if (selectedKBs.value.length === 0) {
    alert(t('nft.min_selection'))
    return
  }
  
  isCreatingNFT.value = true
  
  try {
    console.log('[NFT] Starting transfer creation...')
    
    // Collect data for selected knowledge bases
    const selectedData = knowledgeBases.value.filter(kb => 
      selectedKBs.value.includes(kb.id)
    )
    
    // Call API to create transfer
    const result = await createNFTTransfer(selectedData, currentLanguage.value)
    
    console.log('[NFT] Transfer created successfully:', result.data.transferId)
    
    // Open NFT creation page
    await openNFTCreationPage(result.data.url)
    
    // Clear state
    selectedKBs.value = []
    isNFTMode.value = false
    
    alert(t('nft.transfer_created'))
    
  } catch (error: any) {
    console.error('[NFT] Failed to create transfer:', error)
    alert(error.message || t('nft.transfer_failed'))
  } finally {
    isCreatingNFT.value = false
  }
}

// ============ Cross-tab context management ============
const crossTabContexts = ref<CrossTabContext[]>([])

// Load cross-tab contexts
async function loadCrossTabContexts() {
  crossTabContexts.value = await getAllCrossTabContexts()
}

// Delete cross-tab context
async function deleteCrossTabCtx(id: string) {
  await deleteCrossTabContext(id)
  await loadCrossTabContexts()
}

// Toggle cross-tab context enabled state
async function toggleCrossTabCtxEnabled(ctx: CrossTabContext) {
  // Toggle state
  ctx.enabled = !ctx.enabled
  
  console.log('[CrossTab] Toggled context state:', ctx.sourceTitle || ctx.sourceUrl, ctx.enabled ? 'enabled' : 'disabled')
  
  // Convert to plain object and persist to IndexedDB
  const { saveCrossTabContext } = await import('@/utils/db')
  const plainCtx = toRaw(ctx)
  await saveCrossTabContext(plainCtx)
  
  console.log('[CrossTab] ✅ State saved')
  
  // Reload to keep state in sync
  await loadCrossTabContexts()
}

// Clear all cross-tab contexts
async function clearAllCrossTabCtx() {
  if (!confirm('Are you sure you want to clear all cross-tab contexts?')) return
  await clearAllCrossTabContexts()
  await loadCrossTabContexts()
}

// Compute cross-tab context stats
const crossTabStats = computed(() => {
  const enabled = crossTabContexts.value.filter(ctx => ctx.enabled)
  const totalTokens = enabled.reduce((sum, ctx) => sum + estimateTokens(ctx.text), 0)
  return {
    total: crossTabContexts.value.length,
    enabled: enabled.length,
    totalTokens
  }
})

// ============ Initialization ============
onMounted(async () => {
  try {
    // Load language settings
    await loadLanguage()
    
    // Force DeepSeek configuration override on each load
    await initDefaultConfig()
    
    // Load knowledge bases and cross-tab contexts
    await loadKBs()
    await loadCrossTabContexts()
    
    console.log('[Popup] ✅ Initialization complete')
  } catch (error) {
    console.error('[Popup] Initialization failed:', error)
  }
})
</script>

<template>
  <div class="app-container">
    <!-- Top language selector -->
    <div class="app-header">
      <select :value="currentLanguage" @change="setLanguage(($event.target as HTMLSelectElement).value)" class="language-select">
        <option v-for="lang in availableLanguages" :key="lang.code" :value="lang.code">
          {{ lang.name }}
        </option>
      </select>
    </div>

    <!-- Main content area -->
    <div class="app-body">
      <!-- Knowledge base section -->
      <section class="section kb-section">
        <div class="section-header">
          <div class="section-title">
            <span class="icon">📚</span>
            <h2>{{ t('knowledge.title') }}</h2>
            <span class="badge">{{ kbStats.enabled }}/3</span>
          </div>
          <div class="header-actions">
            <button 
              v-if="knowledgeBases.length > 0"
              @click="toggleNFTMode" 
              class="btn-nft-mode" 
              :class="{ 'active': isNFTMode }"
              :title="t('nft.select_mode')"
            >
              {{ isNFTMode ? '✓' : '🎨' }}
            </button>
            <button @click="openCreateKBDialog" class="btn-icon" :title="t('knowledge.create')">
              <span>＋</span>
            </button>
          </div>
        </div>

        <div class="section-stats">
          <span>{{ t('knowledge.enabled_count', { count: kbStats.enabled }) }}</span>
          <span class="divider">·</span>
          <span>{{ formatTokenCount(kbStats.totalTokens) }}</span>
        </div>

        <!-- NFT mode hint -->
        <div v-if="isNFTMode" class="nft-mode-banner">
          <span>{{ t('nft.select_kb_hint') }} ({{ selectedKBs.length }}/5)</span>
          <button @click="handleCreateNFT" :disabled="selectedKBs.length === 0 || isCreatingNFT" class="btn-create-nft">
            {{ isCreatingNFT ? t('nft.creating_transfer') : t('nft.create_button') }}
          </button>
        </div>

        <div v-if="knowledgeBases.length === 0" class="empty-state">
          <p>{{ t('knowledge.empty_state') }}</p>
          <p class="hint">{{ t('knowledge.empty_hint') }}</p>
        </div>

        <div v-else class="kb-list">
          <div
            v-for="kb in knowledgeBases"
            :key="kb.id"
            class="kb-item"
            :class="{ 
              'kb-item-enabled': kb.enabled,
              'kb-item-selectable': isNFTMode,
              'kb-item-selected': isNFTMode && selectedKBs.includes(kb.id)
            }"
            @click="isNFTMode && toggleKBSelection(kb)"
          >
            <div class="kb-item-header">
              <label class="checkbox-wrapper" v-if="!isNFTMode">
                <input
                  type="checkbox"
                  :checked="kb.enabled"
                  @change="toggleKBEnabled(kb)"
                />
                <span class="checkbox-label">{{ kb.title }}</span>
              </label>
              <div v-else class="nft-select-label" @click.stop>
                <input 
                  type="checkbox"
                  :checked="selectedKBs.includes(kb.id)"
                  @change="toggleKBSelection(kb)"
                />
                <span class="checkbox-label">{{ kb.title }}</span>
              </div>
              <div class="kb-item-actions" v-if="!isNFTMode">
                <button @click="openEditKBDialog(kb)" class="btn-text" :title="t('common.edit')">
                  {{ t('common.edit') }}
                </button>
                <button @click="deleteKBItem(kb.id)" class="btn-text btn-danger" :title="t('common.delete')">
                  {{ t('common.delete') }}
                </button>
              </div>
            </div>
            <div class="kb-item-preview">
              {{ kb.content.substring(0, 60) }}{{ kb.content.length > 60 ? '...' : '' }}
            </div>
            <div class="kb-item-meta">
              <span>{{ formatTokenCount(kb.tokens || 0) }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Cross-tab context section -->
      <section class="section cross-tab-section">
        <div class="section-header">
          <div class="section-title">
            <span class="icon">📎</span>
            <h2>{{ t('crossTab.title') }}</h2>
            <span class="badge">{{ crossTabStats.enabled }}</span>
          </div>
          <button
            v-if="crossTabContexts.length > 0"
            @click="clearAllCrossTabCtx"
            class="btn-text btn-danger"
            :title="t('crossTab.clear_all')"
          >
            {{ t('crossTab.clear_all') }}
          </button>
        </div>

        <div class="section-stats">
          <span>{{ t('crossTab.collected', { count: crossTabStats.total }) }}</span>
          <span class="divider">·</span>
          <span>{{ formatTokenCount(crossTabStats.totalTokens) }}</span>
        </div>

        <div v-if="crossTabContexts.length === 0" class="empty-state">
          <p>{{ t('crossTab.empty_state') }}</p>
          <p class="hint">{{ t('crossTab.empty_hint') }}</p>
        </div>

        <div v-else class="cross-tab-list">
          <div
            v-for="ctx in crossTabContexts"
            :key="ctx.id"
            class="cross-tab-item"
            :class="{ 'cross-tab-item-enabled': ctx.enabled }"
          >
            <div class="cross-tab-item-header">
              <label class="checkbox-wrapper">
                <input
                  type="checkbox"
                  :checked="ctx.enabled"
                  @change="toggleCrossTabCtxEnabled(ctx)"
                />
                <span class="checkbox-label">
                  {{ ctx.text.substring(0, 30) }}{{ ctx.text.length > 30 ? '...' : '' }}
                </span>
              </label>
              <button @click="deleteCrossTabCtx(ctx.id)" class="btn-text btn-danger" :title="t('common.delete')">
                ×
              </button>
            </div>
            <div class="cross-tab-item-source">
              {{ t('crossTab.from') }}: {{ ctx.sourceTitle || ctx.sourceUrl }}
            </div>
            <div class="cross-tab-item-meta">
              <span>{{ formatTokenCount(estimateTokens(ctx.text)) }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Usage tips -->
      <section class="section tips-section">
        <div class="section-header">
          <div class="section-title">
            <span class="icon">💡</span>
            <h2>{{ t('tips.title') }}</h2>
          </div>
        </div>
        <ul class="tips-list">
          <li v-html="t('tips.completion')"></li>
          <li v-html="t('tips.toolbar')"></li>
          <li v-html="t('tips.knowledge')"></li>
          <li v-html="t('tips.cross_tab')"></li>
        </ul>
      </section>
    </div>

    <!-- Create/Edit knowledge base dialog -->
    <div v-if="showKBDialog" class="dialog-overlay" @click.self="showKBDialog = false">
      <div class="dialog">
        <div class="dialog-header">
          <h3>{{ kbDialogMode === 'create' ? t('knowledge.create') : t('common.edit') + ' ' + t('knowledge.title') }}</h3>
          <button @click="showKBDialog = false" class="btn-close">×</button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label>{{ t('knowledge.name_label') }}</label>
            <input
              v-model="currentKB.title"
              type="text"
              :placeholder="t('knowledge.name_placeholder')"
              class="input-field"
              maxlength="50"
            />
          </div>
          <div class="form-group">
            <label>{{ t('knowledge.content_label') }}</label>
            <textarea
              v-model="currentKB.content"
              :placeholder="t('knowledge.content_placeholder')"
              class="textarea-field"
              rows="10"
            ></textarea>
            <div class="form-hint">
              {{ t('knowledge.estimated') }}: {{ formatTokenCount(estimateTokens(currentKB.content || '')) }}
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button @click="showKBDialog = false" class="btn btn-secondary">{{ t('common.cancel') }}</button>
          <button @click="saveKBItem" class="btn btn-primary">{{ t('common.save') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============ Global Styles ============ */
.app-container {
  width: 480px;
  height: 600px;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  overflow: hidden; /* Ensure the outer container stays scroll-free */
}

/* ============ Top Bar ============ */
.app-header {
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
}

.language-select {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  background: white;
  transition: all 0.2s;
}

.language-select:hover {
  border-color: #667eea;
}

.header-content {
  text-align: center;
}

.app-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.app-title .icon {
  font-size: 28px;
}

.app-subtitle {
  margin: 6px 0 0 0;
  font-size: 13px;
  opacity: 0.9;
}

/* ============ Main Content Area ============ */
.app-body {
  flex: 1;
  min-height: 0; /* Critical: prevent flex children from overflowing the parent */
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
}

/* ============ Common Section Styles ============ */
.section {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title .icon {
  font-size: 18px;
}

.section-title h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.badge {
  background: #e0e7ff;
  color: #4f46e5;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.section-stats {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 12px;
}

.divider {
  margin: 0 8px;
  color: #d1d5db;
}

/* ============ Button Styles ============ */
.btn-icon {
  width: 32px;
  height: 32px;
  border: none;
  background: #f3f4f6;
  border-radius: 6px;
  font-size: 18px;
  font-weight: bold;
  color: #667eea;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: #e5e7eb;
}

.btn-text {
  border: none;
  background: none;
  color: #667eea;
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
  transition: opacity 0.2s;
}

.btn-text:hover {
  opacity: 0.7;
}

.btn-text.btn-danger {
  color: #dc2626;
}

/* ============ NFT Mode Styles ============ */
.btn-nft-mode {
  width: 32px;
  height: 32px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 6px;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-nft-mode:hover {
  border-color: #667eea;
}

.btn-nft-mode.active {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.nft-mode-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}

.btn-create-nft {
  padding: 6px 16px;
  background: white;
  color: #667eea;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-create-nft:hover:not(:disabled) {
  background: #f3f4f6;
}

.btn-create-nft:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nft-select-label {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.nft-select-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.kb-item-selectable {
  cursor: pointer;
}

.kb-item-selectable:hover {
  border-color: #667eea;
  background: #f5f7ff;
}

.kb-item-selected {
  border-color: #667eea !important;
  background: #ede9fe !important;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* ============ Empty State ============ */
.empty-state {
  text-align: center;
  padding: 32px 16px;
  color: #9ca3af;
}

.empty-state p {
  margin: 0 0 8px 0;
  font-size: 14px;
}

.empty-state .hint {
  font-size: 12px;
}

/* ============ Knowledge Base List ============ */
.kb-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.kb-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  transition: all 0.2s;
}

.kb-item-enabled {
  border-color: #667eea;
  background: #f5f7ff;
}

.kb-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  flex: 1;
}

.checkbox-wrapper input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.kb-item-actions {
  display: flex;
  gap: 8px;
}

.kb-item-preview {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
  margin-bottom: 8px;
}

.kb-item-meta {
  font-size: 12px;
  color: #9ca3af;
}

/* ============ Cross-Tab List ============ */
.cross-tab-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cross-tab-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px;
  transition: all 0.2s;
}

.cross-tab-item-enabled {
  border-color: #667eea;
  background: #f5f7ff;
}

.cross-tab-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.cross-tab-item-source {
  font-size: 11px;
  color: #9ca3af;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cross-tab-item-meta {
  font-size: 11px;
  color: #9ca3af;
}

/* ============ Usage Tips ============ */
.tips-list {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.8;
}

.tips-list li {
  margin-bottom: 6px;
}

.tips-list strong {
  color: #374151;
}

kbd {
  padding: 2px 6px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  font-size: 11px;
  font-family: monospace;
  color: #1f2937;
}

/* ============ Dialog Styles ============ */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: white;
  border-radius: 12px;
  width: 440px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.btn-close {
  border: none;
  background: none;
  font-size: 28px;
  color: #9ca3af;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  color: #6b7280;
}

.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.input-field {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
  box-sizing: border-box;
}

.input-field:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.textarea-field {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.6;
  resize: vertical;
  transition: all 0.2s;
  box-sizing: border-box;
}

.textarea-field:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-hint {
  font-size: 12px;
  color: #6b7280;
  margin-top: 6px;
}

.dialog-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
}

.btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5568d3;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}
</style>
