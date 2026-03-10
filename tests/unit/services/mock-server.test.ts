// @vitest-environment node

import { afterEach, describe, expect, it } from "vitest";
import { request } from "undici";
import {
  getMockServerState,
  startMockServer,
  stopMockServer,
} from "../../../electron/main/services/mock-server";

describe("mock server service", () => {
  afterEach(async () => {
    await stopMockServer();
  });

  it("serves configured routes over localhost", async () => {
    const state = await startMockServer({
      port: 0,
      routes: [
        {
          id: "route-1",
          method: "GET",
          path: "/health",
          statusCode: 200,
          body: '{"status":"ok"}',
          headers: [
            { key: "content-type", value: "application/json", enabled: true },
          ],
          enabled: true,
        },
      ],
    });

    expect(state.running).toBe(true);
    expect(state.baseUrl).toContain("http://127.0.0.1:");

    const response = await request(`${state.baseUrl}/health`);
    expect(response.statusCode).toBe(200);
    await expect(response.body.text()).resolves.toBe('{"status":"ok"}');
    expect(getMockServerState().requestLog).toHaveLength(1);
    expect(getMockServerState().requestLog[0]).toMatchObject({
      method: "GET",
      path: "/health",
      matchedRouteId: "route-1",
      statusCode: 200,
    });

    const stopped = await stopMockServer();
    expect(stopped.running).toBe(false);
    expect(getMockServerState().running).toBe(false);
  });

  it("returns 404 and records unmatched requests", async () => {
    const state = await startMockServer({
      port: 0,
      routes: [],
    });

    const response = await request(`${state.baseUrl}/missing`, {
      method: "POST",
      body: '{"hello":"world"}',
      headers: {
        "content-type": "application/json",
      },
    });

    expect(response.statusCode).toBe(404);
    expect(getMockServerState().requestLog[0]).toMatchObject({
      method: "POST",
      path: "/missing",
      matchedRouteId: null,
      statusCode: 404,
      requestBody: '{"hello":"world"}',
    });
  });
});
