import { describe, expect, it } from "vitest";
import { eventChannelNames, isEventChannelName } from "@shared/ipc-events";

describe("ipc event allowlist", () => {
  it("recognizes approved event channels", () => {
    for (const channel of eventChannelNames) {
      expect(isEventChannelName(channel)).toBe(true);
    }
  });

  it("rejects unknown event channels", () => {
    expect(isEventChannelName("db:request:get")).toBe(false);
    expect(isEventChannelName("totally:unknown")).toBe(false);
  });
});
