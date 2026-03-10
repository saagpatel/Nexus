import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import StatusBar from "@/components/layout/StatusBar.vue";
import { useMockServerStore } from "@/stores/mock-server";
import { useProtocolStore } from "@/stores/protocol";
import { useResponseStore } from "@/stores/response";
import { useWebSocketStore } from "@/stores/websocket";

describe("StatusBar", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("shows HTTP request status, timing, and size", () => {
    const responseStore = useResponseStore();
    responseStore.statusCode = 200;
    responseStore.statusText = "OK";
    responseStore.size = 1536;
    responseStore.timing = {
      startTime: 0,
      dnsTime: 0,
      connectTime: 0,
      tlsTime: 0,
      firstByteTime: 0,
      totalTime: 123,
    };

    const wrapper = mount(StatusBar);

    expect(wrapper.text()).toContain("200 OK");
    expect(wrapper.text()).toContain("123 ms");
    expect(wrapper.text()).toContain("1.5 KB");
  });

  it("shows WebSocket connection status and event count", () => {
    const protocolStore = useProtocolStore();
    const webSocketStore = useWebSocketStore();

    protocolStore.mode = "websocket";
    webSocketStore.status = "connected";
    webSocketStore.messages = [
      {
        id: "1",
        type: "connected",
        text: "Connected",
        timestamp: new Date().toISOString(),
      },
      {
        id: "2",
        type: "message",
        text: "hello",
        timestamp: new Date().toISOString(),
      },
    ];

    const wrapper = mount(StatusBar);

    expect(wrapper.text()).toContain("WebSocket: Connected");
    expect(wrapper.text()).toContain("2 events");
  });

  it("shows mock server state and port", () => {
    const protocolStore = useProtocolStore();
    const mockServerStore = useMockServerStore();

    protocolStore.mode = "mock";
    mockServerStore.running = true;
    mockServerStore.baseUrl = "http://127.0.0.1:5050";
    mockServerStore.port = 5050;

    const wrapper = mount(StatusBar);

    expect(wrapper.text()).toContain(
      "Mock server running on http://127.0.0.1:5050",
    );
    expect(wrapper.text()).toContain("Port 5050");
  });
});
