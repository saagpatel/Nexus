<script setup lang="ts">
import { ref } from 'vue'
import type { TreeNode } from '@/stores/collection'
import type { Collection, SavedRequest } from '@shared/ipc-types'
import { useCollectionStore } from '@/stores/collection'
import { useProtocolStore } from '@/stores/protocol'
import { useRequestStore } from '@/stores/request'
import { useWebSocketStore } from '@/stores/websocket'
import { useWorkspaceStore } from '@/stores/workspace'
import { isWebSocketRequest } from '@/utils/saved-request'
import MethodBadge from './MethodBadge.vue'

const props = defineProps<{
  node: TreeNode
  depth: number
}>()

const emit = defineEmits<{
  'request-selected': [id: string]
}>()

const collectionStore = useCollectionStore()
const protocolStore = useProtocolStore()
const requestStore = useRequestStore()
const webSocketStore = useWebSocketStore()
const workspaceStore = useWorkspaceStore()

const isExpanded = ref(true)
const isRenaming = ref(false)
const renameValue = ref('')
const renameInput = ref<HTMLInputElement | null>(null)
const isRunningCollection = ref(false)

const isCollection = props.node.type === 'collection'
const collection = isCollection ? props.node.data as Collection : null
const request = !isCollection ? props.node.data as SavedRequest : null

function toggleExpand() {
  if (isCollection) {
    isExpanded.value = !isExpanded.value
  }
}

async function loadRequest() {
  if (!request) return
  const result = await window.api.invoke('db:request:get', { id: request.id })
  if (result.success && result.data) {
    if (isWebSocketRequest(result.data)) {
      protocolStore.setMode('websocket')
      requestStore.setCurrentSelection(result.data.id, result.data.name)
      webSocketStore.loadFromSaved(result.data)
    } else {
      protocolStore.setMode('http')
      requestStore.loadFromSaved(result.data)
    }
    emit('request-selected', request.id)
  }
}

function startRename() {
  if (!collection) return
  isRenaming.value = true
  renameValue.value = collection.name
  setTimeout(() => renameInput.value?.focus(), 0)
}

async function finishRename() {
  if (!collection || !workspaceStore.currentWorkspace) return
  isRenaming.value = false
  const trimmed = renameValue.value.trim()
  if (trimmed && trimmed !== collection.name) {
    await collectionStore.updateCollection(collection.id, { name: trimmed }, workspaceStore.currentWorkspace.id)
  }
}

function cancelRename() {
  isRenaming.value = false
}

async function handleDelete() {
  if (!workspaceStore.currentWorkspace) return
  if (isCollection && collection) {
    await collectionStore.deleteCollection(collection.id, workspaceStore.currentWorkspace.id)
  } else if (request) {
    await collectionStore.deleteRequest(request.id, workspaceStore.currentWorkspace.id)
    if (requestStore.currentRequestId === request.id) {
      requestStore.reset()
    }
  }
}

async function handleNewSubCollection() {
  if (!collection || !workspaceStore.currentWorkspace) return
  await collectionStore.createCollection(workspaceStore.currentWorkspace.id, 'New Folder', collection.id)
}

async function handleRunCollection() {
  if (!collection || !workspaceStore.currentWorkspace || isRunningCollection.value) return
  isRunningCollection.value = true

  const result = await window.api.invoke('runner:collection', {
    workspaceId: workspaceStore.currentWorkspace.id,
    collectionId: collection.id,
    stopOnFailure: false,
  })

  isRunningCollection.value = false

  if (!result.success) {
    window.alert(`Collection run failed: ${result.error}`)
    return
  }

  const summary = `Run complete: ${result.data.passed}/${result.data.total} passed in ${result.data.durationMs} ms.`
  window.alert(summary)
}
</script>

<template>
  <div>
    <!-- Collection node -->
    <div
      v-if="isCollection"
      class="flex items-center gap-1 px-2 py-1 rounded text-left w-full transition-colors group cursor-pointer text-nexus-text-muted hover:bg-nexus-border/50 hover:text-nexus-text"
      :style="{ paddingLeft: `${depth * 12 + 8}px` }"
      @click="toggleExpand"
      @dblclick.stop="startRename"
    >
      <!-- Chevron -->
      <svg
        xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        class="flex-shrink-0 transition-transform"
        :class="{ 'rotate-90': isExpanded }"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>

      <!-- Folder icon -->
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
           class="flex-shrink-0 text-nexus-accent/70">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>

      <!-- Name or rename input -->
      <input
        v-if="isRenaming"
        ref="renameInput"
        v-model="renameValue"
        class="flex-1 bg-nexus-bg border border-nexus-accent rounded px-1 py-0 text-xs text-nexus-text focus:outline-none"
        @blur="finishRename"
        @keydown.enter="finishRename"
        @keydown.escape="cancelRename"
        @click.stop
      />
      <span v-else class="text-xs truncate flex-1">{{ collection?.name }}</span>

      <!-- Actions -->
      <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          class="p-0.5 rounded hover:bg-nexus-border"
          :title="isRunningCollection ? 'Running...' : 'Run Collection'"
          :disabled="isRunningCollection"
          @click.stop="handleRunCollection"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </button>
        <button class="p-0.5 rounded hover:bg-nexus-border" title="New Sub-folder" @click.stop="handleNewSubCollection">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button class="p-0.5 rounded hover:text-nexus-error" title="Delete" @click.stop="handleDelete">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Request node -->
    <button
      v-else
      class="flex items-center gap-2 px-2 py-1.5 rounded text-left w-full transition-colors group"
      :style="{ paddingLeft: `${depth * 12 + 8}px` }"
      :class="requestStore.currentRequestId === request?.id
        ? 'bg-nexus-accent/10 text-nexus-text'
        : 'text-nexus-text-muted hover:bg-nexus-border/50 hover:text-nexus-text'"
      @click="loadRequest"
    >
      <MethodBadge :method="request?.method || 'GET'" />
      <span class="text-xs truncate flex-1">{{ request?.name }}</span>
      <button
        class="p-0.5 rounded text-nexus-text-muted hover:text-nexus-error opacity-0 group-hover:opacity-100 transition-opacity"
        @click.stop="handleDelete"
        title="Delete"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </button>

    <!-- Children (recursive) -->
    <div v-if="isCollection && isExpanded && node.children.length > 0">
      <CollectionTreeNode
        v-for="child in node.children"
        :key="child.type === 'collection' ? (child.data as Collection).id : (child.data as SavedRequest).id"
        :node="child"
        :depth="depth + 1"
        @request-selected="(id: string) => emit('request-selected', id)"
      />
    </div>
  </div>
</template>
