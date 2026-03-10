import { defineStore } from "pinia";
import { ref } from "vue";

export type WorkspaceMode = "http" | "websocket" | "mock";

export const useProtocolStore = defineStore("protocol", () => {
  const mode = ref<WorkspaceMode>("http");

  function setMode(nextMode: WorkspaceMode): void {
    mode.value = nextMode;
  }

  return {
    mode,
    setMode,
  };
});
