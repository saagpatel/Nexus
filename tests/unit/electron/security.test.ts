// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  isAllowedAppNavigationUrl,
  isTrustedSenderUrl,
} from "../../../electron/main/security";

describe("electron security helpers", () => {
  it("trusts only the configured packaged renderer file in production mode", () => {
    const options = {
      appFileUrl:
        "file:///Applications/Nexus/resources/app/.vite/renderer/main_window/index.html",
    };

    expect(
      isTrustedSenderUrl(
        "file:///Applications/Nexus/resources/app/.vite/renderer/main_window/index.html",
        options,
      ),
    ).toBe(true);
    expect(
      isTrustedSenderUrl(
        "file:///Applications/Nexus/resources/app/other-window/index.html",
        options,
      ),
    ).toBe(false);
    expect(isTrustedSenderUrl("https://example.com", options)).toBe(false);
  });

  it("trusts only the configured dev server in development mode", () => {
    const options = { devServerUrl: "http://localhost:5173" };
    expect(
      isTrustedSenderUrl("http://localhost:5173/src/main.ts", options),
    ).toBe(true);
    expect(isTrustedSenderUrl("http://localhost:5173/", options)).toBe(true);
    expect(
      isTrustedSenderUrl("http://127.0.0.1:5173/src/main.ts", options),
    ).toBe(false);
    expect(
      isTrustedSenderUrl("file:///Applications/Nexus/index.html", options),
    ).toBe(false);
  });

  it("reuses the sender trust rules for navigation allowlisting", () => {
    const options = {
      appFileUrl:
        "file:///Applications/Nexus/resources/app/.vite/renderer/main_window/index.html",
    };

    expect(
      isAllowedAppNavigationUrl(
        "file:///Applications/Nexus/resources/app/.vite/renderer/main_window/index.html",
        options,
      ),
    ).toBe(true);
    expect(isAllowedAppNavigationUrl("https://openai.com", options)).toBe(
      false,
    );
  });
});
