<script setup lang="ts">
import { ref, computed } from 'vue'
import { useResponseStore } from '@/stores/response'
import TabBar from '@/components/ui/TabBar.vue'
import ResponseBody from './ResponseBody.vue'
import ResponseHeaders from './ResponseHeaders.vue'
import ResponseTimeline from './ResponseTimeline.vue'
import ResponseAssertions from './ResponseAssertions.vue'
import { useAssertionsStore } from '@/stores/assertions'

const responseStore = useResponseStore()
const assertionsStore = useAssertionsStore()
const activeTab = ref('body')

const tabs = computed(() => [
  { id: 'body', label: 'Body' },
  { id: 'headers', label: 'Headers', badge: String(Object.keys(responseStore.headers).length || '') },
  { id: 'timeline', label: 'Timeline' },
  { id: 'assertions', label: 'Assertions', badge: assertionsStore.summary.total ? `${assertionsStore.summary.passed}/${assertionsStore.summary.total}` : '' },
])

const hasResponse = computed(() => responseStore.statusCode !== null || responseStore.error !== null)

const statusColorClass = computed(() => {
  const code = responseStore.statusCode
  if (!code) return ''
  if (code < 300) return 'bg-nexus-success/20 text-nexus-success'
  if (code < 400) return 'bg-nexus-warning/20 text-nexus-warning'
  if (code < 500) return 'bg-orange-500/20 text-orange-400'
  return 'bg-nexus-error/20 text-nexus-error'
})

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Loading State -->
    <div v-if="responseStore.isLoading" class="flex-1 flex items-center justify-center">
      <div class="flex flex-col items-center gap-2 text-nexus-text-muted">
        <div class="w-6 h-6 border-2 border-nexus-accent border-t-transparent rounded-full animate-spin" />
        <span class="text-xs">Sending request...</span>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!hasResponse" class="flex-1 flex items-center justify-center">
      <div class="text-center text-nexus-text-muted">
        <p class="text-sm">Send a request to see the response</p>
        <p class="text-xs mt-1 text-nexus-text-muted/60">Cmd + Enter</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="responseStore.error" class="flex-1 flex items-center justify-center p-4">
      <div class="text-center max-w-md">
        <div class="inline-block px-3 py-1 rounded bg-nexus-error/20 text-nexus-error text-sm font-medium mb-2">
          Error
        </div>
        <p class="text-sm text-nexus-text">{{ responseStore.error }}</p>
      </div>
    </div>

    <!-- Response Content -->
    <template v-else>
      <!-- Status Bar -->
      <div class="flex items-center gap-3 px-3 py-1.5 border-b border-nexus-border text-xs">
        <span class="px-2 py-0.5 rounded font-semibold" :class="statusColorClass">
          {{ responseStore.statusCode }} {{ responseStore.statusText }}
        </span>
        <span v-if="responseStore.timing" class="text-nexus-text-muted">
          {{ responseStore.timing.totalTime }} ms
        </span>
        <span v-if="responseStore.size" class="text-nexus-text-muted">
          {{ formatSize(responseStore.size) }}
        </span>
        <span v-if="responseStore.isTruncated" class="text-nexus-warning text-[10px]">
          Truncated
        </span>
      </div>

      <!-- Tabs -->
      <TabBar :tabs="tabs" v-model="activeTab" />

      <!-- Tab Content -->
      <div class="flex-1 overflow-hidden">
        <ResponseBody v-if="activeTab === 'body'" />
        <ResponseHeaders v-else-if="activeTab === 'headers'" />
        <ResponseTimeline v-else-if="activeTab === 'timeline'" />
        <ResponseAssertions v-else-if="activeTab === 'assertions'" />
      </div>
    </template>
  </div>
</template>
