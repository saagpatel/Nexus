import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";
import started from "electron-squirrel-startup";
import { initDatabase, closeDatabase } from "./database/connection";
import {
  getOrCreateDefaultWorkspace,
  listWorkspaces,
  getWorkspace,
} from "./database/queries/workspaces";
import {
  saveRequest,
  getRequest,
  listRequests,
  deleteRequest,
  reorderRequests,
} from "./database/queries/requests";
import { saveHistoryEntry, listHistory } from "./database/queries/history";
import {
  listCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  reorderCollections,
} from "./database/queries/collections";
import {
  listEnvironments,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
  setActiveEnvironment,
  getActiveEnvironment,
  listVariables,
  setVariable,
  deleteVariable,
  getResolvedVariables,
} from "./database/queries/environments";
import {
  listDiscoveredEndpoints,
  clearDiscoveredEndpoints,
} from "./database/queries/discovery";
import { executeRequest, cancelActiveRequest } from "./ipc/http-client";
import { importPostmanCollection } from "./services/postman-importer";
import { startDiscovery, cancelDiscovery } from "./services/discovery-engine";
import { runCollection } from "./services/collection-runner";
import {
  connectWebSocket,
  disconnectWebSocket,
  getWebSocketState,
  sendWebSocketMessage,
} from "./services/websocket-client";
import {
  getMockServerState,
  startMockServer,
  stopMockServer,
} from "./services/mock-server";
import {
  isAllowedAppNavigationUrl,
  isTrustedSenderUrl,
  type RendererTrustOptions,
} from "./security";
import { validateIpcArgs } from "@shared/ipc-validators";

if (started) app.quit();

if (process.env.E2E_DISABLE_SANDBOX === "1" && process.platform === "linux") {
  app.commandLine.appendSwitch("no-sandbox");
}

let mainWindow: BrowserWindow | null = null;

function getRendererTrustOptions(): RendererTrustOptions {
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    return {
      devServerUrl: MAIN_WINDOW_VITE_DEV_SERVER_URL,
    };
  }

  const rendererEntryPath = path.join(
    __dirname,
    `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`,
  );

  return {
    appFileUrl: pathToFileURL(rendererEntryPath).toString(),
  };
}

const createWindow = (): void => {
  const rendererEntryPath = path.join(
    __dirname,
    `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`,
  );

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "Nexus",
    backgroundColor: "#09090b",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-attach-webview", (event) => {
    event.preventDefault();
  });
  mainWindow.webContents.on("will-navigate", (event, targetUrl) => {
    if (!isAllowedAppNavigationUrl(targetUrl, getRendererTrustOptions())) {
      event.preventDefault();
    }
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(rendererEntryPath);
  }

  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }
};

function registerValidatedHandler<
  K extends keyof import("@shared/ipc-channels").IpcChannelMap,
>(
  channel: K,
  handler: (
    args: import("@shared/ipc-channels").IpcChannelMap[K]["args"],
  ) =>
    | Promise<
        import("@shared/ipc-channels").IpcChannelMap[K]["return"] extends
          | { success: true; data: infer T }
          | { success: false; error: string }
          ? T
          : never
      >
    | (import("@shared/ipc-channels").IpcChannelMap[K]["return"] extends
        | { success: true; data: infer T }
        | { success: false; error: string }
        ? T
        : never),
): void {
  ipcMain.handle(channel, async (event, rawArgs) => {
    if (!isTrustedSender(event)) {
      return { success: false as const, error: "Untrusted IPC sender" };
    }

    try {
      const safeArgs = validateIpcArgs(channel, rawArgs);
      const data = await handler(safeArgs);
      return { success: true as const, data };
    } catch (e) {
      return {
        success: false as const,
        error: e instanceof Error ? e.message : "Unknown error",
      };
    }
  });
}

function isTrustedSender(event: Electron.IpcMainInvokeEvent): boolean {
  if (!event.senderFrame) {
    return false;
  }

  return isTrustedSenderUrl(event.senderFrame.url, getRendererTrustOptions());
}

function registerIpcHandlers(): void {
  // System
  registerValidatedHandler("app:ping", async () => ({ timestamp: Date.now() }));

  // Workspaces
  registerValidatedHandler("db:workspace:list", async () => listWorkspaces());
  registerValidatedHandler("db:workspace:get", async (args) =>
    getWorkspace(args.id),
  );
  registerValidatedHandler("db:workspace:getDefault", async () =>
    getOrCreateDefaultWorkspace(),
  );

  // Collections
  registerValidatedHandler("db:collection:list", async (args) =>
    listCollections(args.workspaceId),
  );
  registerValidatedHandler("db:collection:create", async (args) =>
    createCollection(args),
  );
  registerValidatedHandler("db:collection:update", async (args) =>
    updateCollection(args.id, args),
  );
  registerValidatedHandler("db:collection:delete", async (args) =>
    deleteCollection(args.id),
  );
  registerValidatedHandler("db:collection:reorder", async (args) =>
    reorderCollections(args.items),
  );

  // Requests
  registerValidatedHandler("db:request:save", async (args) =>
    saveRequest(args),
  );
  registerValidatedHandler("db:request:get", async (args) =>
    getRequest(args.id),
  );
  registerValidatedHandler("db:request:list", async (args) =>
    listRequests(args.workspaceId, args.collectionId),
  );
  registerValidatedHandler("db:request:delete", async (args) =>
    deleteRequest(args.id),
  );
  registerValidatedHandler("db:request:reorder", async (args) =>
    reorderRequests(args.items),
  );

  // Environments
  registerValidatedHandler("db:env:list", async (args) =>
    listEnvironments(args.workspaceId),
  );
  registerValidatedHandler("db:env:create", async (args) =>
    createEnvironment(args),
  );
  registerValidatedHandler("db:env:update", async (args) =>
    updateEnvironment(args.id, { name: args.name }),
  );
  registerValidatedHandler("db:env:delete", async (args) =>
    deleteEnvironment(args.id),
  );
  registerValidatedHandler("db:env:setActive", async (args) =>
    setActiveEnvironment(args.workspaceId, args.environmentId),
  );
  registerValidatedHandler("db:env:getActive", async (args) =>
    getActiveEnvironment(args.workspaceId),
  );
  registerValidatedHandler("db:env:variables:list", async (args) =>
    listVariables(args.environmentId),
  );
  registerValidatedHandler("db:env:variables:set", async (args) =>
    setVariable(args.environmentId, args.key, args.value, args.isSecret),
  );
  registerValidatedHandler("db:env:variables:delete", async (args) =>
    deleteVariable(args.id),
  );
  registerValidatedHandler("db:env:resolvedVariables", async (args) =>
    getResolvedVariables(args.workspaceId),
  );

  // HTTP
  registerValidatedHandler("http:execute", async (args) => {
    const result = await executeRequest(args);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  });
  registerValidatedHandler("http:cancel", async () => {
    cancelActiveRequest();
  });
  registerValidatedHandler("runner:collection", async (args) =>
    runCollection(args),
  );
  registerValidatedHandler("ws:connect", async (args) =>
    connectWebSocket(args, mainWindow!),
  );
  registerValidatedHandler("ws:disconnect", async () => disconnectWebSocket());
  registerValidatedHandler("ws:send", async (args) => {
    await sendWebSocketMessage(args.message);
  });
  registerValidatedHandler("ws:state", async () => getWebSocketState());
  registerValidatedHandler("mock:start", async (args) =>
    startMockServer(args, mainWindow!),
  );
  registerValidatedHandler("mock:stop", async () => stopMockServer());
  registerValidatedHandler("mock:state", async () => getMockServerState());

  // History
  registerValidatedHandler("db:history:save", async (args) =>
    saveHistoryEntry(args),
  );
  registerValidatedHandler("db:history:list", async (args) =>
    listHistory(args.workspaceId, args.limit),
  );

  // Discovery
  registerValidatedHandler("discovery:start", async (args) => {
    const result = await startDiscovery(
      args.workspaceId,
      args.baseUrl,
      mainWindow!,
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  });
  registerValidatedHandler("discovery:cancel", async () => {
    cancelDiscovery();
  });
  registerValidatedHandler("db:discovery:list", async (args) =>
    listDiscoveredEndpoints(args.workspaceId),
  );
  registerValidatedHandler("db:discovery:clear", async (args) =>
    clearDiscoveredEndpoints(args.workspaceId),
  );

  // Import
  registerValidatedHandler("import:postman", async (args) =>
    importPostmanCollection(args.filePath, args.workspaceId),
  );
  registerValidatedHandler("dialog:openFile", async (args) => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ["openFile"],
      filters: args.filters || [{ name: "All Files", extensions: ["*"] }],
    });
    return result.canceled ? null : (result.filePaths[0] ?? null);
  });
}

app.whenReady().then(() => {
  initDatabase();
  registerIpcHandlers();
  createWindow();
});

app.on("before-quit", () => {
  void disconnectWebSocket();
  void stopMockServer();
  closeDatabase();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
