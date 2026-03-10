<script setup lang="ts">
import { useWorkspaceStore } from '@/stores/workspace'
import EnvSelector from '@/components/environment/EnvSelector.vue'

const props = defineProps<{
  mode: 'http' | 'websocket' | 'mock'
}>()

const emit = defineEmits<{
  'update:mode': [mode: 'http' | 'websocket' | 'mock']
}>()

const workspaceStore = useWorkspaceStore()

const modes = [
  { id: 'http' as const, label: 'HTTP' },
  { id: 'websocket' as const, label: 'Socket' },
  { id: 'mock' as const, label: 'Mocks' },
]
</script>

<template>
  <header class="flex items-center justify-between px-4 bg-nexus-surface border-b border-nexus-border select-none"
          style="-webkit-app-region: drag">
    <div class="font-semibold text-sm tracking-wide" style="-webkit-app-region: no-drag">
      Nexus
    </div>
    <div class="flex items-center gap-3" style="-webkit-app-region: no-drag">
      <div class="text-xs text-nexus-text-muted">
        {{ workspaceStore.currentWorkspace?.name || 'Default Workspace' }}
      </div>
      <div class="flex items-center rounded-full border border-nexus-border bg-nexus-bg/70 p-1">
        <button
          v-for="modeOption in modes"
          :key="modeOption.id"
          class="px-3 py-1 rounded-full text-[10px] uppercase tracking-wide transition-colors"
          :class="props.mode === modeOption.id
            ? 'bg-nexus-accent text-white'
            : 'text-nexus-text-muted hover:text-nexus-text'"
          @click="emit('update:mode', modeOption.id)"
        >
          {{ modeOption.label }}
        </button>
      </div>
    </div>
    <div style="-webkit-app-region: no-drag">
      <EnvSelector />
    </div>
  </header>
</template>
