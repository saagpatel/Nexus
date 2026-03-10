import type { IpcChannelMap } from "./ipc-channels";
import type { EventChannelName, IpcEventMap } from "./ipc-events";

type ChannelName = keyof IpcChannelMap;

export interface ElectronApi {
  invoke: <K extends ChannelName>(
    channel: K,
    ...args: IpcChannelMap[K]["args"] extends void
      ? []
      : [IpcChannelMap[K]["args"]]
  ) => Promise<IpcChannelMap[K]["return"]>;
  on: <K extends EventChannelName>(
    channel: K,
    callback: (...args: IpcEventMap[K]) => void,
  ) => () => void;
}
