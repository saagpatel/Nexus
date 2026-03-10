<script setup lang="ts">
import { computed, ref } from 'vue'
import SplitPane from '@/components/ui/SplitPane.vue'
import TabBar from '@/components/ui/TabBar.vue'
import UrlBar from '@/components/request/UrlBar.vue'
import RequestEditor from '@/components/request/RequestEditor.vue'
import ResponseViewer from '@/components/response/ResponseViewer.vue'
import WebSocketPanel from '@/components/websocket/WebSocketPanel.vue'
import MockServerPanel from '@/components/mock/MockServerPanel.vue'
import { useProtocolStore } from '@/stores/protocol'

const emit = defineEmits<{
  'request-sent': []
}>()

interface ActionPanelHandle {
  focusPrimaryInput: () => void
  executePrimaryAction: () => Promise<void> | void
}

const protocolStore = useProtocolStore()
const urlBarRef = ref<InstanceType<typeof UrlBar> | null>(null)
const webSocketPanelRef = ref<ActionPanelHandle | null>(null)
const mockServerPanelRef = ref<ActionPanelHandle | null>(null)

const tabs = computed(() => [
  { id: 'http', label: 'HTTP' },
  { id: 'websocket', label: 'WebSocket' },
  { id: 'mock', label: 'Mock Server' },
])

function focusUrlInput() {
  if (protocolStore.mode === 'http') {
    urlBarRef.value?.focusUrlInput()
    return
  }

  if (protocolStore.mode === 'websocket') {
    webSocketPanelRef.value?.focusPrimaryInput()
    return
  }

  mockServerPanelRef.value?.focusPrimaryInput()
}

async function executeSend() {
  if (protocolStore.mode === 'http') {
    await urlBarRef.value?.executeSend()
    return
  }

  if (protocolStore.mode === 'websocket') {
    await webSocketPanelRef.value?.executePrimaryAction()
    return
  }

  await mockServerPanelRef.value?.executePrimaryAction()
}

defineExpose({ focusUrlInput, executeSend })
</script>

<template>
  <main class="overflow-hidden flex flex-col">
    <TabBar :tabs="tabs" v-model="protocolStore.mode" />

    <template v-if="protocolStore.mode === 'http'">
      <UrlBar ref="urlBarRef" @request-sent="emit('request-sent')" />
      <SplitPane class="flex-1" direction="vertical" :initial-split="50" :min-first="150" :min-second="150" storage-key="nexus:split:main">
        <template #first>
          <RequestEditor />
        </template>
        <template #second>
          <ResponseViewer />
        </template>
      </SplitPane>
    </template>

    <WebSocketPanel v-else-if="protocolStore.mode === 'websocket'" ref="webSocketPanelRef" class="flex-1" />
    <MockServerPanel v-else ref="mockServerPanelRef" class="flex-1" />
  </main>
</template>
