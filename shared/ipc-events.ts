import type {
  DiscoveryProgress,
  MockRequestLogEntry,
  MockServerState,
  WebSocketEvent,
  WebSocketState,
} from "./ipc-types";

export interface IpcEventMap {
  "discovery:progress": [DiscoveryProgress];
  "ws:event": [WebSocketEvent];
  "ws:state-changed": [WebSocketState];
  "mock:state-changed": [MockServerState];
  "mock:request": [MockRequestLogEntry];
}

export type EventChannelName = keyof IpcEventMap;

export const eventChannelNames = [
  "discovery:progress",
  "ws:event",
  "ws:state-changed",
  "mock:state-changed",
  "mock:request",
] as const satisfies readonly EventChannelName[];

export function isEventChannelName(
  channel: string,
): channel is EventChannelName {
  return (eventChannelNames as readonly string[]).includes(channel);
}
