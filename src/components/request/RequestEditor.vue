<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRequestStore } from '@/stores/request'
import TabBar from '@/components/ui/TabBar.vue'
import ParamsEditor from './ParamsEditor.vue'
import HeadersEditor from './HeadersEditor.vue'
import BodyEditor from './BodyEditor.vue'
import AuthEditor from './AuthEditor.vue'
import CodeGenPanel from './CodeGenPanel.vue'

const requestStore = useRequestStore()
const activeTab = ref('params')

const tabs = computed(() => {
  const paramsCount = requestStore.queryParams.filter(p => p.enabled && p.key.trim()).length
  const headersCount = requestStore.headers.filter(h => h.enabled && h.key.trim()).length

  return [
    { id: 'params', label: 'Params', badge: paramsCount > 0 ? String(paramsCount) : '' },
    { id: 'headers', label: 'Headers', badge: headersCount > 0 ? String(headersCount) : '' },
    { id: 'body', label: 'Body', badge: requestStore.bodyType !== 'none' ? '1' : '' },
    { id: 'auth', label: 'Auth', badge: requestStore.authType !== 'none' ? '1' : '' },
    { id: 'codegen', label: 'Code' },
  ]
})
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <TabBar :tabs="tabs" v-model="activeTab" />
    <div class="flex-1 overflow-hidden">
      <ParamsEditor v-if="activeTab === 'params'" />
      <HeadersEditor v-else-if="activeTab === 'headers'" />
      <BodyEditor v-else-if="activeTab === 'body'" />
      <AuthEditor v-else-if="activeTab === 'auth'" />
      <CodeGenPanel v-else-if="activeTab === 'codegen'" />
    </div>
  </div>
</template>
