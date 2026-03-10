import type {
  IpcResult,
  HttpRequest,
  HttpResponse,
  SavedRequest,
  Workspace,
  HistoryEntry,
  Collection,
  Environment,
  EnvVariable,
  DiscoveredEndpoint,
  DiscoveryResult,
  CollectionRunRequest,
  CollectionRunResult,
  WebSocketConnectRequest,
  WebSocketSendRequest,
  WebSocketState,
  MockServerConfig,
  MockServerState,
} from "./ipc-types";

export interface IpcChannelMap {
  // System
  "app:ping": { args: void; return: IpcResult<{ timestamp: number }> };

  // HTTP
  "http:execute": { args: HttpRequest; return: IpcResult<HttpResponse> };
  "http:cancel": { args: void; return: IpcResult<void> };
  "runner:collection": {
    args: CollectionRunRequest;
    return: IpcResult<CollectionRunResult>;
  };
  "ws:connect": {
    args: WebSocketConnectRequest;
    return: IpcResult<WebSocketState>;
  };
  "ws:disconnect": { args: void; return: IpcResult<WebSocketState> };
  "ws:send": { args: WebSocketSendRequest; return: IpcResult<void> };
  "ws:state": { args: void; return: IpcResult<WebSocketState> };
  "mock:start": { args: MockServerConfig; return: IpcResult<MockServerState> };
  "mock:stop": { args: void; return: IpcResult<MockServerState> };
  "mock:state": { args: void; return: IpcResult<MockServerState> };

  // Workspaces
  "db:workspace:list": { args: void; return: IpcResult<Workspace[]> };
  "db:workspace:get": {
    args: { id: string };
    return: IpcResult<Workspace | null>;
  };
  "db:workspace:getDefault": { args: void; return: IpcResult<Workspace> };

  // Collections
  "db:collection:list": {
    args: { workspaceId: string };
    return: IpcResult<Collection[]>;
  };
  "db:collection:create": {
    args: {
      workspaceId: string;
      parentId?: string | null;
      name: string;
      description?: string | null;
    };
    return: IpcResult<Collection>;
  };
  "db:collection:update": {
    args: {
      id: string;
      name?: string;
      parentId?: string | null;
      sortOrder?: number;
      description?: string | null;
    };
    return: IpcResult<Collection>;
  };
  "db:collection:delete": { args: { id: string }; return: IpcResult<void> };
  "db:collection:reorder": {
    args: {
      items: Array<{ id: string; sortOrder: number; parentId?: string | null }>;
    };
    return: IpcResult<void>;
  };

  // Requests
  "db:request:save": {
    args: Omit<SavedRequest, "createdAt" | "updatedAt">;
    return: IpcResult<SavedRequest>;
  };
  "db:request:get": {
    args: { id: string };
    return: IpcResult<SavedRequest | null>;
  };
  "db:request:list": {
    args: { workspaceId: string; collectionId?: string | null };
    return: IpcResult<SavedRequest[]>;
  };
  "db:request:delete": { args: { id: string }; return: IpcResult<void> };
  "db:request:reorder": {
    args: {
      items: Array<{
        id: string;
        sortOrder: number;
        collectionId?: string | null;
      }>;
    };
    return: IpcResult<void>;
  };

  // Environments
  "db:env:list": {
    args: { workspaceId: string };
    return: IpcResult<Environment[]>;
  };
  "db:env:create": {
    args: { workspaceId: string; name: string };
    return: IpcResult<Environment>;
  };
  "db:env:update": {
    args: { id: string; name: string };
    return: IpcResult<Environment>;
  };
  "db:env:delete": { args: { id: string }; return: IpcResult<void> };
  "db:env:setActive": {
    args: { workspaceId: string; environmentId: string | null };
    return: IpcResult<void>;
  };
  "db:env:getActive": {
    args: { workspaceId: string };
    return: IpcResult<Environment | null>;
  };
  "db:env:variables:list": {
    args: { environmentId: string };
    return: IpcResult<EnvVariable[]>;
  };
  "db:env:variables:set": {
    args: {
      environmentId: string;
      key: string;
      value: string;
      isSecret?: boolean;
    };
    return: IpcResult<EnvVariable>;
  };
  "db:env:variables:delete": { args: { id: string }; return: IpcResult<void> };
  "db:env:resolvedVariables": {
    args: { workspaceId: string };
    return: IpcResult<Record<string, string>>;
  };

  // History
  "db:history:save": {
    args: Omit<HistoryEntry, "id" | "executedAt">;
    return: IpcResult<HistoryEntry>;
  };
  "db:history:list": {
    args: { workspaceId: string; limit?: number };
    return: IpcResult<HistoryEntry[]>;
  };

  // Discovery
  "discovery:start": {
    args: { workspaceId: string; baseUrl: string };
    return: IpcResult<DiscoveryResult>;
  };
  "discovery:cancel": { args: void; return: IpcResult<void> };
  "db:discovery:list": {
    args: { workspaceId: string };
    return: IpcResult<DiscoveredEndpoint[]>;
  };
  "db:discovery:clear": {
    args: { workspaceId: string };
    return: IpcResult<void>;
  };

  // Import
  "import:postman": {
    args: { filePath: string; workspaceId: string };
    return: IpcResult<{ collections: number; requests: number }>;
  };
  "dialog:openFile": {
    args: { filters?: Array<{ name: string; extensions: string[] }> };
    return: IpcResult<string | null>;
  };
}
