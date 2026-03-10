import { contextBridge, ipcRenderer } from "electron";
import type { IpcChannelMap } from "@shared/ipc-channels";
import type { EventChannelName, IpcEventMap } from "@shared/ipc-events";
import { isEventChannelName } from "@shared/ipc-events";

type ChannelName = keyof IpcChannelMap;

const api = {
  invoke: <K extends ChannelName>(
    channel: K,
    ...args: IpcChannelMap[K]["args"] extends void
      ? []
      : [IpcChannelMap[K]["args"]]
  ): Promise<IpcChannelMap[K]["return"]> => {
    return ipcRenderer.invoke(channel, ...args) as Promise<
      IpcChannelMap[K]["return"]
    >;
  },
  on: <K extends EventChannelName>(
    channel: K,
    callback: (...args: IpcEventMap[K]) => void,
  ): (() => void) => {
    if (!isEventChannelName(channel)) {
      throw new Error(
        `Blocked IPC event subscription for unknown channel: ${channel}`,
      );
    }

    const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => {
      callback(...(args as IpcEventMap[K]));
    };
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
};

contextBridge.exposeInMainWorld("api", api);

export type ElectronApi = typeof api;
