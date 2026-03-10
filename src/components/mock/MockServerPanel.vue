<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useMockServerStore } from '@/stores/mock-server'
import KeyValueEditor from '@/components/ui/KeyValueEditor.vue'

const mockServerStore = useMockServerStore()
const portInput = ref<HTMLInputElement | null>(null)

onMounted(() => {
  mockServerStore.fetchState().catch(() => undefined)
})

function focusPrimaryInput(): void {
  portInput.value?.focus()
  portInput.value?.select()
}

async function executePrimaryAction(): Promise<void> {
  await mockServerStore.startOrApply()
}

defineExpose({ focusPrimaryInput, executePrimaryAction })
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <div class="flex items-center gap-3 p-3 border-b border-nexus-border">
      <div class="flex items-center gap-2">
        <label class="text-[10px] uppercase tracking-wide text-nexus-text-muted">Port</label>
        <input
          ref="portInput"
          v-model="mockServerStore.requestedPort"
          type="text"
          class="w-24 bg-nexus-bg border border-nexus-border rounded px-2 py-1.5 text-xs font-mono text-nexus-text focus:outline-none focus:border-nexus-accent"
        />
      </div>
      <button
        class="px-3 py-1.5 rounded text-sm font-medium bg-nexus-accent hover:bg-nexus-accent/80 text-white"
        @click="mockServerStore.startOrApply"
      >
        {{ mockServerStore.running ? 'Apply Routes' : 'Start Server' }}
      </button>
      <button
        class="px-3 py-1.5 rounded text-sm font-medium bg-nexus-border hover:bg-nexus-border/80 text-nexus-text"
        :disabled="!mockServerStore.running"
        @click="mockServerStore.stop"
      >
        Stop
      </button>
      <div class="text-xs text-nexus-text-muted">
        <span v-if="mockServerStore.baseUrl">{{ mockServerStore.baseUrl }}</span>
        <span v-else>Server offline</span>
      </div>
      <div class="ml-auto">
        <button
          class="px-2 py-1 rounded text-[10px] bg-nexus-border hover:bg-nexus-border/80 text-nexus-text"
          @click="mockServerStore.addRoute"
        >
          Add Route
        </button>
      </div>
    </div>

    <div v-if="mockServerStore.lastError" class="px-3 py-2 text-xs text-nexus-error border-b border-nexus-border">
      {{ mockServerStore.lastError }}
    </div>

    <div class="flex-1 overflow-auto p-3 space-y-4">
      <div
        v-for="route in mockServerStore.routes"
        :key="route.id"
        class="border border-nexus-border rounded-lg bg-nexus-bg/30 overflow-hidden"
      >
        <div class="grid grid-cols-[110px_1fr_120px_90px_auto] gap-2 p-3 border-b border-nexus-border items-center">
          <select
            v-model="route.method"
            class="bg-nexus-bg border border-nexus-border rounded px-2 py-1.5 text-xs text-nexus-text"
          >
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>PATCH</option>
            <option>DELETE</option>
          </select>
          <input
            v-model="route.path"
            type="text"
            class="bg-nexus-bg border border-nexus-border rounded px-2 py-1.5 text-xs font-mono text-nexus-text"
            placeholder="/users"
          />
          <input
            v-model.number="route.statusCode"
            type="number"
            class="bg-nexus-bg border border-nexus-border rounded px-2 py-1.5 text-xs font-mono text-nexus-text"
          />
          <label class="flex items-center gap-2 text-xs text-nexus-text-muted">
            <input v-model="route.enabled" type="checkbox" class="accent-nexus-accent" />
            Enabled
          </label>
          <button
            class="px-2 py-1 rounded text-[10px] border border-nexus-border text-nexus-text-muted hover:text-nexus-error"
            @click="mockServerStore.removeRoute(route.id)"
          >
            Remove
          </button>
        </div>

        <div class="grid grid-cols-2 gap-0">
          <div class="p-3 border-r border-nexus-border">
            <label class="block text-[10px] uppercase tracking-wide text-nexus-text-muted mb-2">
              Response Body
            </label>
            <textarea
              v-model="route.body"
              class="w-full h-40 bg-nexus-bg border border-nexus-border rounded px-3 py-2 text-xs font-mono text-nexus-text resize-none focus:outline-none focus:border-nexus-accent"
              spellcheck="false"
            />
          </div>

          <div class="p-3">
            <label class="block text-[10px] uppercase tracking-wide text-nexus-text-muted mb-2">
              Response Headers
            </label>
            <div class="border border-nexus-border rounded bg-nexus-bg/20">
              <KeyValueEditor
                v-model="route.headers"
                key-placeholder="Header"
                value-placeholder="Value"
              />
            </div>
          </div>
        </div>
      </div>

      <section class="border border-nexus-border rounded-lg bg-nexus-bg/20 overflow-hidden">
        <div class="flex items-center justify-between px-3 py-2 border-b border-nexus-border">
          <div>
            <div class="text-[10px] uppercase tracking-wide text-nexus-text-muted">Request Log</div>
            <div class="text-xs text-nexus-text-muted">
              {{ mockServerStore.requestLog.length }} captured request{{ mockServerStore.requestLog.length === 1 ? '' : 's' }}
            </div>
          </div>
        </div>

        <div v-if="mockServerStore.requestLog.length === 0" class="px-3 py-8 text-xs text-center text-nexus-text-muted">
          Requests sent to this mock server will appear here once the server is running.
        </div>

        <div v-else class="divide-y divide-nexus-border">
          <div
            v-for="entry in [...mockServerStore.requestLog].reverse()"
            :key="entry.id"
            class="px-3 py-3 space-y-2"
          >
            <div class="flex items-center justify-between gap-3 text-xs">
              <div class="flex items-center gap-2 min-w-0">
                <span class="px-1.5 py-0.5 rounded bg-nexus-accent/15 text-nexus-accent font-medium">
                  {{ entry.method }}
                </span>
                <span class="font-mono text-nexus-text truncate">{{ entry.path }}</span>
                <span
                  class="px-1.5 py-0.5 rounded text-[10px]"
                  :class="entry.matchedRouteId
                    ? 'bg-nexus-success/15 text-nexus-success'
                    : 'bg-nexus-warning/15 text-nexus-warning'"
                >
                  {{ entry.matchedRouteId ? 'Matched' : 'Unmatched' }}
                </span>
              </div>
              <div class="flex items-center gap-2 text-nexus-text-muted">
                <span>Status {{ entry.statusCode }}</span>
                <span>{{ new Date(entry.timestamp).toLocaleTimeString() }}</span>
              </div>
            </div>

            <pre
              v-if="entry.requestBody"
              class="bg-nexus-bg border border-nexus-border rounded px-3 py-2 text-[11px] font-mono text-nexus-text whitespace-pre-wrap break-words"
            >{{ entry.requestBody }}</pre>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
