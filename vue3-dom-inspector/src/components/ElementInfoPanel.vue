<template>
  <section class="info-panel">
    <div class="section-head">
      <div class="section-title">悬停元素详情</div>
      <el-tag v-if="isMock" size="small" type="warning">模拟数据</el-tag>
      <el-tag v-else-if="info" size="small" type="success">实时</el-tag>
    </div>

    <el-empty
      v-if="!info"
      description="开始检查后，将鼠标移到原系统元素上"
      :image-size="72"
    />

    <template v-else>
      <div class="field-list">
        <div class="field-row" v-for="row in fieldRows" :key="row.label">
          <div class="field-icon">
            <el-icon><Document /></el-icon>
          </div>
          <div class="field-main">
            <div class="field-label">{{ row.label }}</div>
            <div class="field-value mono">{{ row.value }}</div>
          </div>
        </div>
      </div>

      <div class="block">
        <div class="block-title">Attributes</div>
        <pre class="code-block">{{ attributesText }}</pre>
      </div>

      <div class="block">
        <div class="block-title">Ancestors / DOM Path</div>
        <pre class="code-block">{{ ancestorsText }}</pre>
      </div>

      <div class="block">
        <div class="block-title">outerHTML（截断）</div>
        <pre class="code-block">{{ info.outerHTML || '—' }}</pre>
      </div>

      <div class="block">
        <div class="block-title">Rect</div>
        <pre class="code-block">{{ rectText }}</pre>
      </div>
    </template>

    <div v-if="history?.length" class="history">
      <div class="block-title">最近悬停</div>
      <button
        v-for="item in history"
        :key="item._key"
        type="button"
        class="history-item"
        @click="$emit('select', item)"
      >
        <span class="mono">{{ item.tag || '?' }}{{ item.id ? '#' + item.id : '' }}</span>
        <span class="history-path">{{ item.path || item.className || '' }}</span>
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { Document } from '@element-plus/icons-vue'

const props = defineProps({
  info: { type: Object, default: null },
  isMock: { type: Boolean, default: false },
  history: { type: Array, default: () => [] },
})

defineEmits(['select'])

const fieldRows = computed(() => {
  const info = props.info
  if (!info) return []
  const classes = Array.isArray(info.classList)
    ? info.classList.join(' ')
    : info.className || ''
  return [
    { label: 'Tag', value: info.tag || '—' },
    { label: 'ID', value: info.id || '（无）' },
    { label: 'Class', value: classes || '（无）' },
    { label: 'Path', value: info.path || '—' },
    { label: 'Text', value: info.text || '—' },
  ]
})

const attributesText = computed(() => {
  if (!props.info?.attributes) return '—'
  try {
    return JSON.stringify(props.info.attributes, null, 2)
  } catch {
    return String(props.info.attributes)
  }
})

const ancestorsText = computed(() => {
  const info = props.info
  if (!info) return '—'
  if (Array.isArray(info.ancestors) && info.ancestors.length) {
    return info.ancestors
      .map((a, i) => {
        const id = a.id ? `#${a.id}` : ''
        const cls = a.className ? `.${String(a.className).trim().split(/\s+/).join('.')}` : ''
        return `${'  '.repeat(i)}${a.tag}${id}${cls}`
      })
      .join('\n')
  }
  return info.path || '—'
})

const rectText = computed(() => {
  if (!props.info?.rect) return '—'
  try {
    return JSON.stringify(props.info.rect, null, 2)
  } catch {
    return String(props.info.rect)
  }
})
</script>

<style scoped>
.info-panel {
  padding: 12px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid var(--sg-border);
}

.section-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.section-title,
.block-title {
  font-size: 13px;
  font-weight: 700;
  color: #14533a;
}

.field-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.field-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 10px;
  border-radius: 8px;
  background: #f7faf8;
  border: 1px solid #edf2ef;
  text-align: left;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.field-row:hover {
  background: #eef8f1;
  border-color: rgba(47, 158, 95, 0.25);
}

.field-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(103, 194, 58, 0.15);
  color: var(--sg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.field-label {
  font-size: 12px;
  font-weight: 600;
  color: #14533a;
}

.field-value {
  font-size: 12px;
  color: #374151;
  word-break: break-all;
  margin-top: 2px;
}

.block {
  margin-top: 10px;
}

.block-title {
  margin-bottom: 6px;
}

.code-block {
  margin: 0;
  padding: 10px;
  border-radius: 8px;
  background: #0f1f17;
  color: #d7f5e3;
  font-size: 11px;
  line-height: 1.45;
  overflow: auto;
  max-height: 160px;
  white-space: pre-wrap;
  word-break: break-word;
}

.history {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.history-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--sg-border);
  background: #fafbfa;
  cursor: pointer;
  font: inherit;
  width: 100%;
}

.history-item:hover {
  border-color: rgba(47, 158, 95, 0.35);
}

.history-path {
  font-size: 11px;
  color: var(--sg-muted);
  word-break: break-all;
  text-align: left;
}
</style>
