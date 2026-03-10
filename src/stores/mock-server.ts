import { defineStore } from "pinia";
import { ref } from "vue";
import { nanoid } from "nanoid";
import type { MockRequestLogEntry, MockRoute } from "@shared/ipc-types";

function createDefaultRoute(): MockRoute {
  return {
    id: nanoid(),
    method: "GET",
    path: "/health",
    statusCode: 200,
    body: '{"status":"ok"}',
    headers: [
      { key: "content-type", value: "application/json", enabled: true },
    ],
    enabled: true,
  };
}

function serializeRoutes(routes: MockRoute[]): MockRoute[] {
  return routes.map((route) => ({
    ...route,
    headers: route.headers.map((header) => ({ ...header })),
  }));
}

export const useMockServerStore = defineStore("mock-server", () => {
  const routes = ref<MockRoute[]>([createDefaultRoute()]);
  const requestLog = ref<MockRequestLogEntry[]>([]);
  const running = ref(false);
  const port = ref<number | null>(null);
  const requestedPort = ref("0");
  const baseUrl = ref<string | null>(null);
  const lastError = ref<string | null>(null);
  const initialized = ref(false);

  let removeStateListener: (() => void) | null = null;
  let removeRequestListener: (() => void) | null = null;

  function initialize(): void {
    if (initialized.value) return;

    removeStateListener = window.api.on(
      "mock:state-changed",
      (...args: unknown[]) => {
        const [payload] = args as [
          {
            running: boolean;
            port: number | null;
            baseUrl: string | null;
            routes: MockRoute[];
            requestLog: MockRequestLogEntry[];
          },
        ];
        routes.value =
          payload.routes.length > 0 ? payload.routes : [createDefaultRoute()];
        running.value = payload.running;
        port.value = payload.port;
        baseUrl.value = payload.baseUrl;
        requestedPort.value = payload.port
          ? String(payload.port)
          : requestedPort.value;
        requestLog.value = payload.requestLog;
        lastError.value = null;
      },
    );

    removeRequestListener = window.api.on(
      "mock:request",
      (...args: unknown[]) => {
        const [payload] = args as [MockRequestLogEntry];
        requestLog.value = [...requestLog.value, payload].slice(-100);
      },
    );

    initialized.value = true;
  }

  async function fetchState(): Promise<void> {
    initialize();
    const result = await window.api.invoke("mock:state");
    if (!result.success) {
      lastError.value = result.error;
      return;
    }

    routes.value =
      result.data.routes.length > 0
        ? result.data.routes
        : [createDefaultRoute()];
    running.value = result.data.running;
    port.value = result.data.port;
    baseUrl.value = result.data.baseUrl;
    requestLog.value = result.data.requestLog;
    requestedPort.value = result.data.port ? String(result.data.port) : "0";
    lastError.value = null;
  }

  async function startOrApply(): Promise<boolean> {
    initialize();
    const parsedPort = Number.parseInt(requestedPort.value, 10);
    const result = await window.api.invoke("mock:start", {
      routes: serializeRoutes(routes.value),
      port: Number.isNaN(parsedPort) ? 0 : parsedPort,
    });

    if (!result.success) {
      lastError.value = result.error;
      return false;
    }

    routes.value = result.data.routes;
    running.value = result.data.running;
    port.value = result.data.port;
    baseUrl.value = result.data.baseUrl;
    requestLog.value = result.data.requestLog;
    lastError.value = null;
    return true;
  }

  async function stop(): Promise<void> {
    initialize();
    const result = await window.api.invoke("mock:stop");
    if (!result.success) {
      lastError.value = result.error;
      return;
    }

    running.value = result.data.running;
    port.value = result.data.port;
    baseUrl.value = result.data.baseUrl;
    requestLog.value = result.data.requestLog;
    lastError.value = null;
  }

  function addRoute(): void {
    routes.value.push(createDefaultRoute());
  }

  function removeRoute(id: string): void {
    routes.value = routes.value.filter((route) => route.id !== id);
    if (routes.value.length === 0) {
      routes.value = [createDefaultRoute()];
    }
  }

  function dispose(): void {
    removeStateListener?.();
    removeRequestListener?.();
    removeStateListener = null;
    removeRequestListener = null;
    initialized.value = false;
  }

  return {
    routes,
    requestLog,
    running,
    port,
    requestedPort,
    baseUrl,
    lastError,
    fetchState,
    startOrApply,
    stop,
    addRoute,
    removeRoute,
    dispose,
  };
});
