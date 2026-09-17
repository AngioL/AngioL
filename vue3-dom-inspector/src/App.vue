<template>
  <div class="assistant-shell">
    <header class="assistant-header">
      <div class="brand">
        <span class="brand-logo" aria-hidden="true">
          <el-icon :size="20"><Monitor /></el-icon>
        </span>
        <h1>法律合规小助手</h1>
      </div>
      <el-icon class="header-user" :size="18"><User /></el-icon>
    </header>

    <div class="crumb">DOM 检查 / 悬停元素</div>

    <div class="assistant-body">
      <section class="hero-card">
        <div class="hero-icon">
          <el-icon :size="36"><Aim /></el-icon>
        </div>
        <div class="hero-text">
          <h2>页面元素检查器</h2>
          <p class="hero-tag">悬停采集 · 路径回传 · 实时面板</p>
          <p class="hero-desc">
            通过 BrowserAction 向原系统注入悬停脚本，实时展示 id、class、DOM 路径与属性。
          </p>
        </div>
      </section>

      <ConfigPanel
        v-model:left-url="leftUrl"
        v-model:right-url="rightUrl"
        :inspecting="inspecting"
        :bridge-status="bridgeStatus"
        :force-mock="forceMock"
        @update:force-mock="forceMock = $event"
        @start="onStart"
        @stop="onStop"
      />

      <ElementInfoPanel
        :info="elementInfo"
        :is-mock="lastMeta.mock"
        :history="history"
        @select="elementInfo = $event"
      />
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Aim, Monitor, User } from '@element-plus/icons-vue'
import {
  getBridgeStatus,
  onElementInfo,
  startInspect,
  stopInspect,
} from './bridge/browserAction.js'
import ConfigPanel from './components/ConfigPanel.vue'
import ElementInfoPanel from './components/ElementInfoPanel.vue'

const envLeft = import.meta.env.VITE_LEFT_SYSTEM_URL || 'http://20.1.39.51:20888/pmp_irs'
const envRight = import.meta.env.VITE_RIGHT_SYSTEM_URL || window.location.origin

const leftUrl = ref(envLeft)
const rightUrl = ref(envRight)
const forceMock = ref(false)
const inspecting = ref(false)
const elementInfo = ref(null)
const history = ref([])
const bridgeStatus = reactive(getBridgeStatus())
const lastMeta = reactive({ mock: false })

let unsubscribe = null

function refreshStatus() {
  Object.assign(bridgeStatus, getBridgeStatus())
}

function onStart() {
  try {
    const result = startInspect({
      leftSystemUrl: leftUrl.value,
      rightSystemUrl: rightUrl.value,
      forceMock: forceMock.value,
    })
    inspecting.value = true
    refreshStatus()
    ElMessage.success(result.message || '已开始检查')
  } catch (err) {
    ElMessage.error(err?.message || String(err))
  }
}

function onStop() {
  stopInspect({
    leftSystemUrl: leftUrl.value,
    forceMock: forceMock.value,
  })
  inspecting.value = false
  refreshStatus()
  ElMessage.info('已停止检查')
}

onMounted(() => {
  refreshStatus()
  unsubscribe = onElementInfo((info, meta) => {
    elementInfo.value = info
    lastMeta.mock = Boolean(meta?.mock)
    if (info) {
      history.value = [{ ...info, _key: `${info.ts || Date.now()}-${Math.random()}` }, ...history.value].slice(0, 12)
    }
  })
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
  if (inspecting.value) {
    stopInspect({ leftSystemUrl: leftUrl.value, forceMock: forceMock.value })
  }
})
</script>

<style scoped>
.assistant-shell {
  width: min(420px, 100%);
  min-height: 100%;
  margin: 0 auto;
  background: var(--sg-panel);
  box-shadow: 0 0 0 1px rgba(26, 107, 74, 0.08), 8px 0 32px rgba(15, 40, 28, 0.08);
  display: flex;
  flex-direction: column;
}

.assistant-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(90deg, #1a6b4a 0%, #21865c 55%, #1f7a48 100%);
  color: #fff;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-logo {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.brand h1 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.header-user {
  opacity: 0.9;
}

.crumb {
  padding: 8px 16px;
  font-size: 12px;
  color: var(--sg-muted);
  background: #f3f6f4;
  border-bottom: 1px solid var(--sg-border);
}

.assistant-body {
  padding: 14px 14px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
  overflow: auto;
}

.hero-card {
  display: flex;
  gap: 12px;
  padding: 14px;
  border-radius: 10px;
  background:
    linear-gradient(135deg, rgba(103, 194, 58, 0.12), rgba(47, 158, 95, 0.04)),
    #fff;
  border: 1px solid rgba(47, 158, 95, 0.18);
}

.hero-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: linear-gradient(145deg, #67c23a, #2f9e5f);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.hero-text h2 {
  margin: 0 0 4px;
  font-size: 16px;
  color: #14533a;
}

.hero-tag {
  margin: 0 0 6px;
  font-size: 12px;
  color: var(--sg-primary);
  font-weight: 600;
}

.hero-desc {
  margin: 0;
  font-size: 12px;
  color: var(--sg-muted);
  line-height: 1.55;
}

@media (min-width: 900px) {
  .assistant-shell {
    margin-right: 0;
    margin-left: auto;
    min-height: 100vh;
  }
}
</style>
