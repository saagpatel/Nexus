import { describe, expect, it } from "vitest";
import { validateIpcArgs } from "@shared/ipc-validators";

describe("validateIpcArgs", () => {
  it("accepts a valid HTTP execute payload", () => {
    const result = validateIpcArgs("http:execute", {
      method: "POST",
      url: "https://api.example.com/v1/health",
      headers: {
        authorization: "Bearer token",
      },
      body: '{"ok":true}',
      timeout: 5_000,
      variables: {
        workspace: "default",
      },
    });

    expect(result.method).toBe("POST");
    expect(result.timeout).toBe(5_000);
  });

  it("rejects extra fields on privileged channels", () => {
    expect(() =>
      validateIpcArgs("ws:send", {
        message: "hello",
        unexpected: true,
      }),
    ).toThrow(/unsupported field/i);
  });

  it("rejects malformed mock route payloads", () => {
    expect(() =>
      validateIpcArgs("mock:start", {
        port: 8787,
        routes: [
          {
            id: "route-1",
            method: "GET",
            path: "/health",
            statusCode: "200",
            headers: [],
            body: "",
            enabled: true,
          },
        ],
      }),
    ).toThrow(/statusCode must be a finite number/i);
  });

  it("rejects arguments for no-arg channels", () => {
    expect(() => validateIpcArgs("app:ping", { now: true })).toThrow(
      /does not accept arguments/i,
    );
  });

  it("accepts saved request payloads with supported unions", () => {
    const result = validateIpcArgs("db:request:save", {
      id: "req-1",
      collectionId: null,
      workspaceId: "ws-1",
      name: "GraphQL sample",
      method: "POST",
      url: "https://api.example.com/graphql",
      headers: [
        { key: "content-type", value: "application/json", enabled: true },
      ],
      queryParams: [],
      bodyType: "graphql",
      bodyContent: '{"query":"{ viewer { id } }"}',
      authType: "bearer",
      authConfig: { token: "secret" },
      sortOrder: 0,
    });

    expect(result.bodyType).toBe("graphql");
    expect(result.authType).toBe("bearer");
  });
});
