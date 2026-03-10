<script setup lang="ts">
import { computed } from 'vue'
import { useRequestStore } from '@/stores/request'
import { generateAxios, generateCurl, generateFetch } from '@/utils/codegen'

const requestStore = useRequestStore()

const httpRequest = computed(() => requestStore.buildHttpRequest())
const snippets = computed(() => ({
  curl: generateCurl(httpRequest.value),
  fetch: generateFetch(httpRequest.value),
  axios: generateAxios(httpRequest.value),
}))

async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}
</script>

<template>
  <div class="h-full overflow-auto p-3 space-y-4">
    <section class="space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-xs font-semibold text-nexus-text uppercase tracking-wide">cURL</h3>
        <button class="px-2 py-1 text-[10px] rounded bg-nexus-border hover:bg-nexus-border/70 text-nexus-text" @click="copyText(snippets.curl)">
          Copy
        </button>
      </div>
      <pre class="text-xs font-mono bg-nexus-bg border border-nexus-border rounded p-2 overflow-x-auto text-nexus-text">{{ snippets.curl }}</pre>
    </section>

    <section class="space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-xs font-semibold text-nexus-text uppercase tracking-wide">fetch</h3>
        <button class="px-2 py-1 text-[10px] rounded bg-nexus-border hover:bg-nexus-border/70 text-nexus-text" @click="copyText(snippets.fetch)">
          Copy
        </button>
      </div>
      <pre class="text-xs font-mono bg-nexus-bg border border-nexus-border rounded p-2 overflow-x-auto text-nexus-text">{{ snippets.fetch }}</pre>
    </section>

    <section class="space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-xs font-semibold text-nexus-text uppercase tracking-wide">axios</h3>
        <button class="px-2 py-1 text-[10px] rounded bg-nexus-border hover:bg-nexus-border/70 text-nexus-text" @click="copyText(snippets.axios)">
          Copy
        </button>
      </div>
      <pre class="text-xs font-mono bg-nexus-bg border border-nexus-border rounded p-2 overflow-x-auto text-nexus-text">{{ snippets.axios }}</pre>
    </section>
  </div>
</template>
