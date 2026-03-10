import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useWebSocketStore } from "@/stores/websocket";

const mockInvoke = vi.fn();
const listeners = new Map<string, (...args: unknown[]) => void>();

vi.stubGlobal("window", {
  api: {
    invoke: mockInvoke,
    on: vi.fn((channel: string, callback: (...args: unknown[]) => void) => {
      listeners.set(channel, callback);
      return () => listeners.delete(channel);
    }),
  },
});

describe("WebSocket Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockInvoke.mockReset();
    listeners.clear();
  });

  it("fetches initial socket state", async () => {
    mockInvoke.mockResolvedValueOnce({
      success: true,
      data: {
        status: "disconnected",
        url: "ws://127.0.0.1:8787",
        lastError: null,
      },
    });

    const store = useWebSocketStore();
    await store.fetchState();

    expect(store.url).toBe("ws://127.0.0.1:8787");
    expect(store.status).toBe("disconnected");
    expect(mockInvoke).toHaveBeenCalledWith("ws:state");
  });

  it("connects with normalized protocols and headers", async () => {
    mockInvoke.mockResolvedValueOnce({
      success: true,
      data: {
        status: "connected",
        url: "ws://127.0.0.1:8787",
        lastError: null,
      },
    });

    const store = useWebSocketStore();
    store.url = "ws://127.0.0.1:8787";
    store.protocols = "json, chat";
    store.headers = [
      { key: "Authorization", value: "Bearer token", enabled: true },
      { key: "X-Skip", value: "nope", enabled: false },
    ];

    const connected = await store.connect({ env: "dev" });

    expect(connected).toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith("ws:connect", {
      url: "ws://127.0.0.1:8787",
      headers: { Authorization: "Bearer token" },
      protocols: ["json", "chat"],
      variables: { env: "dev" },
    });
  });

  it("reacts to socket events and state updates", async () => {
    mockInvoke.mockResolvedValueOnce({
      success: true,
      data: {
        status: "disconnected",
        url: null,
        lastError: null,
      },
    });

    const store = useWebSocketStore();
    await store.fetchState();

    listeners.get("ws:event")?.({
      id: "evt-1",
      type: "message",
      text: '{"ok":true}',
      timestamp: "2026-03-09T10:00:00.000Z",
    });
    listeners.get("ws:state-changed")?.({
      status: "connected",
      url: "ws://127.0.0.1:8787",
      lastError: null,
    });

    expect(store.messages).toHaveLength(1);
    expect(store.status).toBe("connected");
    expect(store.url).toBe("ws://127.0.0.1:8787");
  });

  it("hydrates saved websocket requests without touching protocol mode state elsewhere", () => {
    const store = useWebSocketStore();
    store.loadFromSaved({
      url: "wss://example.com/socket",
      headers: [{ key: "X-Env", value: "staging", enabled: true }],
      bodyContent: '{"protocols":"graphql-ws, chat"}',
    });

    expect(store.url).toBe("wss://example.com/socket");
    expect(store.headers).toEqual([
      { key: "X-Env", value: "staging", enabled: true },
    ]);
    expect(store.protocols).toBe("graphql-ws, chat");
    expect(store.messages).toEqual([]);
    expect(store.lastError).toBeNull();
  });
});
