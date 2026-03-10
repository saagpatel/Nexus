<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useWebSocketStore } from '@/stores/websocket'
import { useWorkspaceStore } from '@/stores/workspace'
import { useEnvironmentStore } from '@/stores/environment'
import KeyValueEditor from '@/components/ui/KeyValueEditor.vue'

const webSocketStore = useWebSocketStore()
const workspaceStore = useWorkspaceStore()
const environmentStore = useEnvironmentStore()
const urlInput = ref<HTMLInputElement | null>(null)

const statusClass = computed(() => {
  if (webSocketStore.status === 'connected') return 'bg-nexus-success/20 text-nexus-success'
  if (webSocketStore.status === 'connecting') return 'bg-nexus-warning/20 text-nexus-warning'
  if (webSocketStore.status === 'error') return 'bg-nexus-error/20 text-nexus-error'
  return 'bg-nexus-border text-nexus-text-muted'
})

onMounted(() => {
  webSocketStore.fetchState().catch(() => undefined)
})

async function connect(): Promise<void> {
  const variables = workspaceStore.currentWorkspace
    ? await environmentStore.getResolvedVariablesFromDb(workspaceStore.currentWorkspace.id)
    : {}
  await webSocketStore.connect(variables)
}

async function executePrimaryAction(): Promise<void> {
  if (webSocketStore.status === 'connected') {
    await webSocketStore.send()
    return
  }

  await connect()
}

function focusPrimaryInput(): void {
  urlInput.value?.focus()
  urlInput.value?.select()
}

defineExpose({ executePrimaryAction, focusPrimaryInput })
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <div class="flex items-center gap-2 p-2 border-b border-nexus-border">
      <input
        ref="urlInput"
        v-model="webSocketStore.url"
        type="text"
        placeholder="ws://localhost:8787"
        class="flex-1 bg-nexus-bg border border-nexus-border rounded px-3 py-1.5 text-sm font-mono text-nexus-text placeholder-nexus-text-muted focus:outline-none focus:border-nexus-accent"
      />
      <span class="px-2 py-1 rounded text-[11px] font-medium" :class="statusClass">
        {{ webSocketStore.statusLabel }}
      </span>
      <button
        v-if="webSocketStore.status !== 'connected'"
        class="px-3 py-1.5 rounded text-sm font-medium bg-nexus-accent hover:bg-nexus-accent/80 text-white"
        @click="connect"
      >
        Connect
      </button>
      <button
        v-else
        class="px-3 py-1.5 rounded text-sm font-medium bg-nexus-error hover:bg-nexus-error/80 text-white"
        @click="webSocketStore.disconnect"
      >
        Disconnect
      </button>
    </div>

    <div class="grid grid-cols-[320px_1fr] flex-1 overflow-hidden">
      <div class="border-r border-nexus-border overflow-auto">
        <div class="p-3 space-y-4">
          <section>
            <label class="block text-[10px] uppercase tracking-wide text-nexus-text-muted mb-2">
              Protocols (comma separated)
            </label>
            <input
              v-model="webSocketStore.protocols"
              type="text"
              placeholder="graphql-ws, chat"
              class="w-full bg-nexus-bg border border-nexus-border rounded px-2 py-1.5 text-xs text-nexus-text focus:outline-none focus:border-nexus-accent"
            />
          </section>

          <section>
            <div class="text-[10px] uppercase tracking-wide text-nexus-text-muted mb-2">Headers</div>
            <div class="border border-nexus-border rounded bg-nexus-bg/30">
              <KeyValueEditor
                v-model="webSocketStore.headers"
                key-placeholder="Header"
                value-placeholder="Value"
              />
            </div>
          </section>

          <section v-if="webSocketStore.lastError" class="text-xs text-nexus-error">
            {{ webSocketStore.lastError }}
          </section>
        </div>
      </div>

      <div class="flex flex-col overflow-hidden">
        <div class="flex items-center justify-between px-3 py-2 border-b border-nexus-border">
          <div class="text-xs text-nexus-text-muted">
            {{ webSocketStore.messages.length }} event{{ webSocketStore.messages.length === 1 ? '' : 's' }}
          </div>
          <button
            class="px-2 py-1 rounded text-[10px] bg-nexus-border hover:bg-nexus-border/80 text-nexus-text"
            @click="webSocketStore.resetMessages"
          >
            Clear
          </button>
        </div>

        <div class="flex-1 overflow-auto p-3 space-y-2">
          <div
            v-for="message in webSocketStore.messages"
            :key="message.id"
            class="rounded border px-3 py-2 text-xs"
            :class="message.type === 'message'
              ? 'border-nexus-success/40 bg-nexus-success/10 text-nexus-text'
              : message.type === 'sent'
                ? 'border-nexus-accent/40 bg-nexus-accent/10 text-nexus-text'
                : message.type === 'error'
                  ? 'border-nexus-error/40 bg-nexus-error/10 text-nexus-text'
                  : 'border-nexus-border bg-nexus-bg/40 text-nexus-text-muted'"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="uppercase tracking-wide text-[10px]">{{ message.type }}</span>
              <span class="text-[10px] opacity-70">{{ new Date(message.timestamp).toLocaleTimeString() }}</span>
            </div>
            <pre class="whitespace-pre-wrap break-words font-mono">{{ message.text }}</pre>
          </div>

          <div v-if="webSocketStore.messages.length === 0" class="h-full flex items-center justify-center text-xs text-nexus-text-muted">
            Connect to a socket to start the live timeline.
          </div>
        </div>

        <div class="border-t border-nexus-border p-3 space-y-2">
          <label class="block text-[10px] uppercase tracking-wide text-nexus-text-muted">
            Outbound Message
          </label>
          <textarea
            v-model="webSocketStore.outboundMessage"
            class="w-full h-28 bg-nexus-bg border border-nexus-border rounded px-3 py-2 text-xs font-mono text-nexus-text resize-none focus:outline-none focus:border-nexus-accent"
            placeholder='{"type":"ping"}'
            spellcheck="false"
          />
          <div class="flex justify-end">
            <button
              class="px-3 py-1.5 rounded text-sm font-medium bg-nexus-accent hover:bg-nexus-accent/80 text-white disabled:opacity-50"
              :disabled="webSocketStore.status !== 'connected'"
              @click="webSocketStore.send"
            >
              Send Message
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
