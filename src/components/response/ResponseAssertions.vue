<script setup lang="ts">
import { watch } from 'vue'
import { useAssertionsStore } from '@/stores/assertions'
import { useResponseStore } from '@/stores/response'

const assertionsStore = useAssertionsStore()
const responseStore = useResponseStore()

if (assertionsStore.rules.length === 0) {
  assertionsStore.addRule('status-equals')
}

watch(
  () => [responseStore.statusCode, responseStore.body, responseStore.headers],
  () => {
    if (responseStore.statusCode !== null) {
      assertionsStore.evaluate()
    }
  },
  { deep: true }
)
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <div class="px-3 py-2 border-b border-nexus-border flex items-center justify-between">
      <div class="text-xs text-nexus-text-muted">
        {{ assertionsStore.summary.passed }}/{{ assertionsStore.summary.total }} passing
      </div>
      <button
        class="px-2 py-1 text-[10px] rounded bg-nexus-border hover:bg-nexus-border/70 text-nexus-text"
        @click="assertionsStore.addRule('status-equals')"
      >
        Add Rule
      </button>
    </div>

    <div class="flex-1 overflow-auto p-3 space-y-3">
      <div
        v-for="rule in assertionsStore.rules"
        :key="rule.id"
        class="border border-nexus-border rounded p-2 space-y-2 bg-nexus-bg/40"
      >
        <div class="flex items-center gap-2">
          <select
            v-model="rule.type"
            class="bg-nexus-bg border border-nexus-border rounded px-2 py-1 text-xs text-nexus-text"
          >
            <option value="status-equals">Status Equals</option>
            <option value="body-includes">Body Includes</option>
            <option value="header-exists">Header Exists</option>
          </select>

          <input
            v-model="rule.expected"
            type="text"
            class="flex-1 bg-nexus-bg border border-nexus-border rounded px-2 py-1 text-xs text-nexus-text"
            :placeholder="rule.type === 'status-equals' ? '200' : rule.type === 'body-includes' ? 'success' : 'content-type'"
          />

          <button
            class="px-2 py-1 text-[10px] rounded border border-nexus-border text-nexus-text-muted hover:text-nexus-error"
            @click="assertionsStore.removeRule(rule.id)"
          >
            Remove
          </button>
        </div>

        <div
          v-if="assertionsStore.results.find(r => r.id === rule.id)"
          class="text-[11px]"
          :class="assertionsStore.results.find(r => r.id === rule.id)?.passed ? 'text-nexus-success' : 'text-nexus-error'"
        >
          {{ assertionsStore.results.find(r => r.id === rule.id)?.message }}
        </div>
      </div>
    </div>
  </div>
</template>
