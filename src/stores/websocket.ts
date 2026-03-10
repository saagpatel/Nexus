import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { SavedRequest, WebSocketEvent } from "@shared/ipc-types";
import { parseSavedWebSocketProtocols } from "@/utils/saved-request";

export const useWebSocketStore = defineStore("websocket", () => {
  const url = ref("ws://127.0.0.1:8787");
  const protocols = ref("");
  const headers = ref<Array<{ key: string; value: string; enabled: boolean }>>(
    [],
  );
  const outboundMessage = ref("");
  const messages = ref<WebSocketEvent[]>([]);
  const status = ref<"disconnected" | "connecting" | "connected" | "error">(
    "disconnected",
  );
  const lastError = ref<string | null>(null);
  const initialized = ref(false);

  let removeEventListener: (() => void) | null = null;
  let removeStateListener: (() => void) | null = null;

  const statusLabel = computed(() => {
    if (status.value === "connecting") return "Connecting";
    if (status.value === "connected") return "Connected";
    if (status.value === "error") return "Error";
    return "Disconnected";
  });

  function normalizedHeaders(): Record<string, string> {
    return headers.value.reduce<Record<string, string>>((acc, header) => {
      if (header.enabled && header.key.trim()) {
        acc[header.key] = header.value;
      }
      return acc;
    }, {});
  }

  function initialize(): void {
    if (initialized.value) return;

    removeEventListener = window.api.on("ws:event", (...args: unknown[]) => {
      const [payload] = args as [WebSocketEvent];
      messages.value.push(payload);
      if (payload.type === "error") {
        lastError.value = payload.text;
      }
    });

    removeStateListener = window.api.on(
      "ws:state-changed",
      (...args: unknown[]) => {
        const [payload] = args as [
          {
            status: typeof status.value;
            url: string | null;
            lastError: string | null;
          },
        ];
        status.value = payload.status;
        if (payload.url) {
          url.value = payload.url;
        }
        lastError.value = payload.lastError;
      },
    );

    initialized.value = true;
  }

  async function fetchState(): Promise<void> {
    initialize();
    const result = await window.api.invoke("ws:state");
    if (!result.success) return;

    status.value = result.data.status;
    lastError.value = result.data.lastError;
    if (result.data.url) {
      url.value = result.data.url;
    }
  }

  async function connect(variables?: Record<string, string>): Promise<boolean> {
    initialize();
    const protocolList = protocols.value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const result = await window.api.invoke("ws:connect", {
      url: url.value,
      headers: normalizedHeaders(),
      protocols: protocolList,
      variables,
    });

    if (!result.success) {
      status.value = "error";
      lastError.value = result.error;
      messages.value.push({
        id: `ws-local-${Date.now()}`,
        type: "error",
        text: result.error,
        timestamp: new Date().toISOString(),
      });
      return false;
    }

    status.value = result.data.status;
    lastError.value = result.data.lastError;
    return true;
  }

  async function disconnect(): Promise<void> {
    const result = await window.api.invoke("ws:disconnect");
    if (!result.success) {
      lastError.value = result.error;
      return;
    }
    status.value = result.data.status;
    lastError.value = result.data.lastError;
  }

  async function send(): Promise<boolean> {
    if (!outboundMessage.value.trim()) {
      return false;
    }

    const result = await window.api.invoke("ws:send", {
      message: outboundMessage.value,
    });

    if (!result.success) {
      lastError.value = result.error;
      messages.value.push({
        id: `ws-local-${Date.now()}`,
        type: "error",
        text: result.error,
        timestamp: new Date().toISOString(),
      });
      return false;
    }

    outboundMessage.value = "";
    return true;
  }

  function resetMessages(): void {
    messages.value = [];
  }

  function loadFromSaved(
    saved: Pick<SavedRequest, "url" | "headers" | "bodyContent">,
  ): void {
    url.value = saved.url;
    headers.value = [...saved.headers];
    protocols.value = parseSavedWebSocketProtocols(saved.bodyContent);
    outboundMessage.value = "";
    lastError.value = null;
    messages.value = [];
  }

  function dispose(): void {
    removeEventListener?.();
    removeStateListener?.();
    removeEventListener = null;
    removeStateListener = null;
    initialized.value = false;
  }

  return {
    url,
    protocols,
    headers,
    outboundMessage,
    messages,
    status,
    statusLabel,
    lastError,
    fetchState,
    connect,
    disconnect,
    send,
    resetMessages,
    loadFromSaved,
    dispose,
  };
});
