import { randomUUID } from "node:crypto";
import type { BrowserWindow } from "electron";
import WebSocket from "ws";
import type {
  WebSocketConnectRequest,
  WebSocketEvent,
  WebSocketState,
} from "@shared/ipc-types";
import { resolveRequestVariables } from "./variable-resolver";

let activeSocket: WebSocket | null = null;
let activeWindow: BrowserWindow | null = null;

let currentState: WebSocketState = {
  status: "disconnected",
  url: null,
  lastError: null,
};

function nextEventId(): string {
  return `ws-${randomUUID()}`;
}

function emitWebSocketEvent(
  event: Omit<WebSocketEvent, "id" | "timestamp">,
): void {
  const payload: WebSocketEvent = {
    id: nextEventId(),
    timestamp: new Date().toISOString(),
    ...event,
  };

  activeWindow?.webContents.send("ws:event", payload);
}

function setState(nextState: WebSocketState): void {
  currentState = nextState;
  activeWindow?.webContents.send("ws:state-changed", currentState);
}

export function getWebSocketState(): WebSocketState {
  return { ...currentState };
}

export async function connectWebSocket(
  request: WebSocketConnectRequest,
  window: BrowserWindow,
): Promise<WebSocketState> {
  await disconnectWebSocket();

  activeWindow = window;
  const resolved = request.variables
    ? resolveRequestVariables(
        { url: request.url, headers: request.headers },
        request.variables,
      )
    : { url: request.url, headers: request.headers };

  setState({
    status: "connecting",
    url: resolved.url,
    lastError: null,
  });
  emitWebSocketEvent({
    type: "connecting",
    text: `Connecting to ${resolved.url}`,
  });

  const socket = new WebSocket(resolved.url, request.protocols, {
    headers: resolved.headers,
  });

  activeSocket = socket;

  socket.on("open", () => {
    if (activeSocket !== socket) return;

    setState({
      status: "connected",
      url: resolved.url,
      lastError: null,
    });
    emitWebSocketEvent({
      type: "connected",
      text: "Connection established",
    });
  });

  socket.on("message", (data, isBinary) => {
    if (activeSocket !== socket) return;

    emitWebSocketEvent({
      type: "message",
      text: isBinary ? data.toString("base64") : data.toString(),
    });
  });

  socket.on("error", (error) => {
    if (activeSocket !== socket) return;

    setState({
      status: "error",
      url: resolved.url,
      lastError: error.message,
    });
    emitWebSocketEvent({
      type: "error",
      text: error.message,
    });
  });

  socket.on("close", (code, reason) => {
    if (activeSocket !== socket) return;

    activeSocket = null;
    setState({
      status: "disconnected",
      url: null,
      lastError: null,
    });
    emitWebSocketEvent({
      type: "disconnected",
      text: `Connection closed (${code})${reason.length > 0 ? ` ${reason.toString()}` : ""}`,
    });
  });

  return getWebSocketState();
}

export async function disconnectWebSocket(): Promise<WebSocketState> {
  if (!activeSocket) {
    setState({
      status: "disconnected",
      url: null,
      lastError: null,
    });
    return getWebSocketState();
  }

  const socket = activeSocket;
  activeSocket = null;

  await new Promise<void>((resolve) => {
    socket.once("close", () => resolve());
    socket.close();
  });

  setState({
    status: "disconnected",
    url: null,
    lastError: null,
  });

  return getWebSocketState();
}

export async function sendWebSocketMessage(message: string): Promise<void> {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    throw new Error("WebSocket is not connected");
  }

  activeSocket.send(message);
  emitWebSocketEvent({
    type: "sent",
    text: message,
  });
}
