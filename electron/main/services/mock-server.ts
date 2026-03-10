import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { BrowserWindow } from "electron";
import type {
  MockRequestLogEntry,
  MockRoute,
  MockServerConfig,
  MockServerState,
} from "@shared/ipc-types";

let server: ReturnType<typeof createServer> | null = null;
let routes: MockRoute[] = [];
let activeWindow: BrowserWindow | null = null;

const MAX_REQUEST_LOG = 100;

let currentState: MockServerState = {
  running: false,
  port: null,
  baseUrl: null,
  routes: [],
  requestLog: [],
};

function nextRequestId(): string {
  return `mock-${randomUUID()}`;
}

function readRequestBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    request.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    request.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    request.on("error", reject);
  });
}

function toEnabledHeaders(route: MockRoute): Record<string, string> {
  return route.headers.reduce<Record<string, string>>((acc, header) => {
    if (header.enabled && header.key.trim()) {
      acc[header.key] = header.value;
    }
    return acc;
  }, {});
}

function matchRoute(request: IncomingMessage): MockRoute | undefined {
  const url = new URL(request.url || "/", "http://127.0.0.1");
  return routes.find(
    (route) =>
      route.enabled &&
      route.method.toUpperCase() === (request.method || "GET").toUpperCase() &&
      route.path === url.pathname,
  );
}

function emitRequest(payload: MockRequestLogEntry): void {
  activeWindow?.webContents.send("mock:request", payload);
}

function appendRequestLog(entry: MockRequestLogEntry): void {
  currentState = {
    ...currentState,
    requestLog: [...currentState.requestLog, entry].slice(-MAX_REQUEST_LOG),
  };
  emitRequest(entry);
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const url = new URL(request.url || "/", "http://127.0.0.1");
  const route = matchRoute(request);
  const requestBody = await readRequestBody(request);

  if (!route) {
    appendRequestLog({
      id: nextRequestId(),
      method: (request.method || "GET").toUpperCase(),
      path: url.pathname,
      matchedRouteId: null,
      statusCode: 404,
      requestBody,
      timestamp: new Date().toISOString(),
    });
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Mock route not found" }));
    return;
  }

  const headers = {
    "content-type": "application/json",
    ...toEnabledHeaders(route),
  };

  appendRequestLog({
    id: nextRequestId(),
    method: (request.method || "GET").toUpperCase(),
    path: url.pathname,
    matchedRouteId: route.id,
    statusCode: route.statusCode,
    requestBody,
    timestamp: new Date().toISOString(),
  });
  response.writeHead(route.statusCode, headers);
  response.end(route.body);
}

function setState(nextState: MockServerState): void {
  currentState = nextState;
  activeWindow?.webContents.send("mock:state-changed", getMockServerState());
}

export function getMockServerState(): MockServerState {
  return {
    ...currentState,
    routes: currentState.routes.map((route) => ({
      ...route,
      headers: route.headers.map((header) => ({ ...header })),
    })),
    requestLog: currentState.requestLog.map((entry) => ({ ...entry })),
  };
}

export async function startMockServer(
  config: MockServerConfig,
  window?: BrowserWindow,
): Promise<MockServerState> {
  if (window) {
    activeWindow = window;
  }

  routes = config.routes.map((route) => ({
    ...route,
    path: route.path.startsWith("/") ? route.path : `/${route.path}`,
    headers: route.headers.map((header) => ({ ...header })),
  }));

  if (server && currentState.running) {
    if (config.port && currentState.port !== config.port) {
      await stopMockServer();
    } else {
      setState({
        ...currentState,
        routes,
      });
      return getMockServerState();
    }
  }

  server = createServer(handleRequest);

  await new Promise<void>((resolve, reject) => {
    server!.once("error", reject);
    server!.listen(config.port ?? 0, "127.0.0.1", () => resolve());
  });

  const address = server.address() as AddressInfo;
  setState({
    running: true,
    port: address.port,
    baseUrl: `http://127.0.0.1:${address.port}`,
    routes,
    requestLog: [],
  });

  return getMockServerState();
}

export async function stopMockServer(): Promise<MockServerState> {
  if (!server) {
    setState({
      running: false,
      port: null,
      baseUrl: null,
      routes,
      requestLog: currentState.requestLog,
    });
    return getMockServerState();
  }

  const currentServer = server;
  server = null;

  await new Promise<void>((resolve, reject) => {
    currentServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  setState({
    running: false,
    port: null,
    baseUrl: null,
    routes,
    requestLog: currentState.requestLog,
  });

  return getMockServerState();
}
