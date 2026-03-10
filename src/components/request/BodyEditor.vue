<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRequestStore } from '@/stores/request'
import { useMonaco } from '@/composables/useMonaco'

const requestStore = useRequestStore()

const bodyTypes = [
  { value: 'none' as const, label: 'None' },
  { value: 'json' as const, label: 'JSON' },
  { value: 'graphql' as const, label: 'GraphQL' },
  { value: 'text' as const, label: 'Text' },
  { value: 'form-urlencoded' as const, label: 'Form URL-Encoded' },
]

const editorContainer = ref<HTMLElement | null>(null)
const monacoLanguage = computed(() => {
  if (requestStore.bodyType === 'json') return 'json'
  if (requestStore.bodyType === 'graphql') return 'graphql'
  return 'plaintext'
})

const { value: editorValue, setLanguage } = useMonaco(editorContainer, {
  language: monacoLanguage.value,
  value: requestStore.bodyType === 'graphql' ? requestStore.graphqlQuery : requestStore.bodyContent,
})

// Sync editor -> store
watch(editorValue, (newVal) => {
  if (requestStore.bodyType === 'graphql') {
    requestStore.graphqlQuery = newVal
    return
  }
  requestStore.bodyContent = newVal
})

// Sync store -> editor (e.g. when loading a saved request)
watch([() => requestStore.bodyContent, () => requestStore.graphqlQuery, () => requestStore.bodyType], () => {
  const nextValue = requestStore.bodyType === 'graphql' ? requestStore.graphqlQuery : requestStore.bodyContent
  if (editorValue.value !== nextValue) {
    editorValue.value = nextValue
  }
})

watch(() => requestStore.graphqlVariables, (newVal) => {
  if (!newVal.trim()) {
    requestStore.graphqlVariables = '{}'
  }
})

watch(() => requestStore.bodyType, (newType, oldType) => {
  if (oldType !== 'graphql' && newType === 'graphql' && !requestStore.graphqlVariables.trim()) {
    requestStore.graphqlVariables = '{}'
  }
  const nextValue = newType === 'graphql' ? requestStore.graphqlQuery : requestStore.bodyContent
  if (editorValue.value !== nextValue) {
    editorValue.value = nextValue
  }
  setLanguage(monacoLanguage.value)
})

const showEditor = computed(() =>
  requestStore.bodyType === 'json' || requestStore.bodyType === 'text' || requestStore.bodyType === 'graphql'
)

const graphqlVariablesPlaceholder = '{\n  "limit": 10\n}'
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Body type selector -->
    <div class="flex items-center gap-1 px-3 py-1.5 border-b border-nexus-border">
      <button
        v-for="bt in bodyTypes"
        :key="bt.value"
        class="px-2 py-0.5 rounded text-[10px] font-medium transition-colors"
        :class="requestStore.bodyType === bt.value
          ? 'bg-nexus-accent/20 text-nexus-accent'
          : 'text-nexus-text-muted hover:text-nexus-text'"
        @click="requestStore.bodyType = bt.value"
      >
        {{ bt.label }}
      </button>
    </div>

    <!-- Body content -->
    <div class="flex-1 overflow-hidden">
      <div v-if="requestStore.bodyType === 'none'" class="flex items-center justify-center h-full text-xs text-nexus-text-muted">
        This request does not have a body
      </div>

      <div v-else-if="requestStore.bodyType === 'graphql'" class="h-full flex flex-col overflow-hidden">
        <div class="px-3 py-2 border-b border-nexus-border bg-nexus-bg/40 space-y-2">
          <label class="block text-[10px] uppercase tracking-wide text-nexus-text-muted">
            Operation Name (Optional)
          </label>
          <input
            v-model="requestStore.graphqlOperationName"
            type="text"
            placeholder="GetUsers"
            class="w-full bg-nexus-bg border border-nexus-border rounded px-2 py-1.5 text-xs text-nexus-text focus:outline-none focus:border-nexus-accent transition-colors"
          />
          <label class="block text-[10px] uppercase tracking-wide text-nexus-text-muted">
            Variables (JSON Object)
          </label>
          <textarea
            v-model="requestStore.graphqlVariables"
            class="w-full h-24 bg-nexus-bg border border-nexus-border rounded px-2 py-1.5 text-xs font-mono text-nexus-text resize-none focus:outline-none focus:border-nexus-accent transition-colors"
            spellcheck="false"
            :placeholder="graphqlVariablesPlaceholder"
          />
        </div>
        <div ref="editorContainer" class="flex-1 w-full" />
      </div>

      <div v-else-if="showEditor" ref="editorContainer" class="h-full w-full" />

      <textarea
        v-else-if="requestStore.bodyType === 'form-urlencoded'"
        v-model="requestStore.bodyContent"
        class="w-full h-full bg-transparent text-xs font-mono text-nexus-text p-3 resize-none focus:outline-none"
        placeholder="key1=value1&amp;key2=value2"
        spellcheck="false"
      />
    </div>
  </div>
</template>
