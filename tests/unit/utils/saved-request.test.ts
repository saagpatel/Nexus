import { describe, expect, it } from "vitest";
import {
  isWebSocketRequest,
  parseSavedGraphqlBody,
  parseSavedWebSocketProtocols,
} from "@/utils/saved-request";

describe("saved request utils", () => {
  it("detects websocket requests from method or URL", () => {
    expect(
      isWebSocketRequest({ method: "WS", url: "https://example.com" }),
    ).toBe(true);
    expect(
      isWebSocketRequest({ method: "GET", url: "ws://localhost:8787" }),
    ).toBe(true);
    expect(
      isWebSocketRequest({ method: "GET", url: "https://example.com" }),
    ).toBe(false);
  });

  it("parses saved websocket protocols from persisted body content", () => {
    expect(
      parseSavedWebSocketProtocols('{"protocols":"graphql-ws, chat"}'),
    ).toBe("graphql-ws, chat");
    expect(parseSavedWebSocketProtocols("not-json")).toBe("");
  });

  it("parses graphql payloads into editor-friendly state", () => {
    expect(
      parseSavedGraphqlBody({
        method: "POST",
        url: "https://example.com/graphql",
        bodyContent: JSON.stringify({
          query: "query Ping { ping }",
          variables: { env: "dev" },
          operationName: "Ping",
        }),
      }),
    ).toEqual({
      query: "query Ping { ping }",
      variables: JSON.stringify({ env: "dev" }, null, 2),
      operationName: "Ping",
    });
  });
});
