import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useMockServerStore } from "@/stores/mock-server";

const mockOn = vi.fn(
  (_channel: string, _callback: (...args: unknown[]) => void) => () =>
    undefined,
);
const mockInvoke = vi.fn(async (channel: string): Promise<any> => {
  if (channel === "mock:state") {
    return {
      success: true,
      data: {
        running: false,
        port: null,
        baseUrl: null,
        routes: [],
        requestLog: [],
      },
    };
  }

  return { success: true, data: undefined };
});

vi.stubGlobal("window", {
  api: {
    invoke: mockInvoke,
    on: mockOn,
  },
});

describe("Mock Server Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockInvoke.mockReset();
    mockOn.mockClear();
    mockInvoke.mockImplementation(async (channel: string): Promise<any> => {
      if (channel === "mock:state") {
        return {
          success: true,
          data: {
            running: false,
            port: null,
            baseUrl: null,
            routes: [],
            requestLog: [],
          },
        };
      }

      return { success: true, data: undefined };
    });
  });

  it("hydrates a default route when the server is empty", async () => {
    const store = useMockServerStore();
    await store.fetchState();

    expect(store.routes).toHaveLength(1);
    expect(store.routes[0]?.path).toBe("/health");
  });

  it("starts the mock server with current routes", async () => {
    mockInvoke.mockImplementation(
      async (channel: string, args?: unknown): Promise<any> => {
        if (channel === "mock:start") {
          return {
            success: true,
            data: {
              running: true,
              port: 8787,
              baseUrl: "http://127.0.0.1:8787",
              routes: (args as { routes: unknown[] }).routes,
              requestLog: [],
            },
          };
        }

        if (channel === "mock:state") {
          return {
            success: true,
            data: {
              running: false,
              port: null,
              baseUrl: null,
              routes: [],
              requestLog: [],
            },
          };
        }

        return { success: true, data: undefined };
      },
    );

    const store = useMockServerStore();
    const started = await store.startOrApply();

    expect(started).toBe(true);
    expect(store.running).toBe(true);
    expect(store.baseUrl).toBe("http://127.0.0.1:8787");
  });

  it("subscribes once and appends request-log events", async () => {
    let requestListener: ((payload: unknown) => void) | null = null;
    mockOn.mockImplementation(
      (channel: string, callback: (...args: unknown[]) => void) => {
        if (channel === "mock:request") {
          requestListener = (payload: unknown) => callback(payload);
        }
        return () => undefined;
      },
    );

    const store = useMockServerStore();
    await store.fetchState();
    await store.fetchState();

    expect(mockOn).toHaveBeenCalledTimes(2);

    expect(requestListener).not.toBeNull();
    if (!requestListener) {
      throw new Error("request listener was not registered");
    }

    const emitRequest: (payload: unknown) => void = requestListener;

    emitRequest({
      id: "entry-1",
      method: "POST",
      path: "/users",
      matchedRouteId: "route-1",
      statusCode: 201,
      requestBody: '{"name":"Taylor"}',
      timestamp: new Date().toISOString(),
    });

    expect(store.requestLog).toHaveLength(1);
    expect(store.requestLog[0]?.path).toBe("/users");
  });
});
