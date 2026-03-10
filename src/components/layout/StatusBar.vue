<script setup lang="ts">
import { computed } from 'vue'
import { useResponseStore } from '@/stores/response'
import { useProtocolStore } from '@/stores/protocol'
import { useWebSocketStore } from '@/stores/websocket'
import { useMockServerStore } from '@/stores/mock-server'

const responseStore = useResponseStore()
const protocolStore = useProtocolStore()
const webSocketStore = useWebSocketStore()
const mockServerStore = useMockServerStore()

const statusText = computed(() => {
  if (protocolStore.mode === 'websocket') {
    return `WebSocket: ${webSocketStore.statusLabel}`
  }
  if (protocolStore.mode === 'mock') {
    return mockServerStore.running
      ? `Mock server running on ${mockServerStore.baseUrl}`
      : 'Mock server offline'
  }
  if (responseStore.isLoading) return 'Sending...'
  if (responseStore.error) return 'Error'
  if (responseStore.statusCode) return `${responseStore.statusCode} ${responseStore.statusText}`
  return 'Ready'
})

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <footer class="flex items-center justify-between px-3 bg-nexus-bg border-t border-nexus-border text-[11px] text-nexus-text-muted">
    <span>{{ statusText }}</span>
    <div class="flex items-center gap-3">
      <span v-if="protocolStore.mode === 'http' && responseStore.timing">{{ responseStore.timing.totalTime }} ms</span>
      <span v-if="protocolStore.mode === 'http' && responseStore.size">{{ formatSize(responseStore.size) }}</span>
      <span v-if="protocolStore.mode === 'websocket'">{{ webSocketStore.messages.length }} events</span>
      <span v-if="protocolStore.mode === 'mock' && mockServerStore.port">Port {{ mockServerStore.port }}</span>
    </div>
  </footer>
</template>
