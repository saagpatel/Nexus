// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WebSocketServer } from "ws";
import {
  connectWebSocket,
  disconnectWebSocket,
  getWebSocketState,
  sendWebSocketMessage,
} from "../../../electron/main/services/websocket-client";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("websocket client service", () => {
  let server: WebSocketServer | null = null;
  const sendSpy = vi.fn();
  const windowStub = {
    webContents: {
      send: sendSpy,
    },
  } as never;

  beforeEach(() => {
    sendSpy.mockReset();
  });

  afterEach(async () => {
    await disconnectWebSocket();
    await new Promise<void>(
      (resolve) => server?.close(() => resolve()) ?? resolve(),
    );
    server = null;
  });

  it("connects, sends, and receives websocket messages", async () => {
    server = new WebSocketServer({ port: 0 });
    server.on("connection", (socket) => {
      socket.send("welcome");
      socket.on("message", (message) => {
        socket.send(`echo:${message.toString()}`);
      });
    });

    await new Promise<void>((resolve) =>
      server?.once("listening", () => resolve()),
    );
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    const state = await connectWebSocket(
      {
        url: `ws://127.0.0.1:${port}`,
        headers: {},
      },
      windowStub,
    );

    expect(state.status).toBe("connecting");

    await delay(100);
    expect(getWebSocketState().status).toBe("connected");

    await sendWebSocketMessage("ping");
    await delay(100);

    const wsEvents = sendSpy.mock.calls.filter(
      ([channel]) => channel === "ws:event",
    );
    const texts = wsEvents.map(
      ([, payload]) => (payload as { text: string }).text,
    );

    expect(texts).toContain("welcome");
    expect(texts).toContain("ping");
    expect(texts).toContain("echo:ping");
  });
});
