<template>
  <section class="config-panel">
    <div class="section-title">连接配置</div>

    <el-form label-position="top" size="small" @submit.prevent>
      <el-form-item label="原系统链接（左侧）">
        <el-input
          :model-value="leftUrl"
          placeholder="http://host/path"
          clearable
          @update:model-value="$emit('update:leftUrl', $event)"
        />
      </el-form-item>
      <el-form-item label="本系统链接（右侧）">
        <el-input
          :model-value="rightUrl"
          placeholder="http://localhost:5173"
          clearable
          @update:model-value="$emit('update:rightUrl', $event)"
        />
      </el-form-item>
      <el-form-item>
        <el-checkbox
          :model-value="forceMock"
          @update:model-value="$emit('update:forceMock', $event)"
        >
          强制 Mock（忽略宿主 API）
        </el-checkbox>
      </el-form-item>
    </el-form>

    <div class="actions">
      <el-button
        type="success"
        :disabled="inspecting"
        :icon="VideoPlay"
        @click="$emit('start')"
      >
        开始检查
      </el-button>
      <el-button
        :disabled="!inspecting"
        :icon="VideoPause"
        @click="$emit('stop')"
      >
        停止
      </el-button>
    </div>

    <div class="status-row">
      <el-tag size="small" :type="bridgeStatus.hasBrowserAction ? 'success' : 'info'">
        BrowserAction {{ bridgeStatus.hasBrowserAction ? '可用' : '缺失' }}
      </el-tag>
      <el-tag size="small" :type="inspecting ? 'success' : 'info'">
        {{ inspecting ? '检查中' : '未开始' }}
      </el-tag>
      <el-tag
        v-if="inspecting && (forceMock || bridgeStatus.mockMode)"
        size="small"
        type="warning"
      >
        Mock 流
      </el-tag>
    </div>
  </section>
</template>

<script setup>
import { VideoPause, VideoPlay } from '@element-plus/icons-vue'

defineProps({
  leftUrl: { type: String, default: '' },
  rightUrl: { type: String, default: '' },
  inspecting: { type: Boolean, default: false },
  forceMock: { type: Boolean, default: false },
  bridgeStatus: {
    type: Object,
    default: () => ({
      hasBrowserAction: false,
      mockMode: true,
    }),
  },
})

defineEmits(['update:leftUrl', 'update:rightUrl', 'update:forceMock', 'start', 'stop'])
</script>

<style scoped>
.config-panel {
  padding: 12px;
  border-radius: 10px;
  background: #fafbfa;
  border: 1px solid var(--sg-border);
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #14533a;
}

.actions {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

:deep(.el-form-item) {
  margin-bottom: 10px;
}

:deep(.el-form-item__label) {
  font-size: 12px;
  color: var(--sg-muted);
}
</style>
