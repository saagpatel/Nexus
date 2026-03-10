import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";
import WorkspaceView from "@/views/WorkspaceView.vue";
import { useProtocolStore } from "@/stores/protocol";

const urlFocusSpy = vi.fn();
const urlSendSpy = vi.fn();
const webSocketFocusSpy = vi.fn();
const webSocketActionSpy = vi.fn();
const mockFocusSpy = vi.fn();
const mockActionSpy = vi.fn();

const UrlBarStub = defineComponent({
  name: "UrlBar",
  emits: ["request-sent"],
  setup(_, { expose }) {
    expose({
      focusUrlInput: urlFocusSpy,
      executeSend: urlSendSpy,
    });

    return {};
  },
  template: '<div data-test="url-bar-stub" />',
});

const WebSocketPanelStub = defineComponent({
  name: "WebSocketPanel",
  setup(_, { expose }) {
    expose({
      focusPrimaryInput: webSocketFocusSpy,
      executePrimaryAction: webSocketActionSpy,
    });

    return {};
  },
  template: '<div data-test="websocket-panel-stub" />',
});

const MockServerPanelStub = defineComponent({
  name: "MockServerPanel",
  setup(_, { expose }) {
    expose({
      focusPrimaryInput: mockFocusSpy,
      executePrimaryAction: mockActionSpy,
    });

    return {};
  },
  template: '<div data-test="mock-panel-stub" />',
});

const SplitPaneStub = defineComponent({
  name: "SplitPane",
  template: `
    <div data-test="split-pane-stub">
      <slot name="first" />
      <slot name="second" />
    </div>
  `,
});

describe("WorkspaceView", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    urlFocusSpy.mockReset();
    urlSendSpy.mockReset();
    webSocketFocusSpy.mockReset();
    webSocketActionSpy.mockReset();
    mockFocusSpy.mockReset();
    mockActionSpy.mockReset();
  });

  function mountWorkspaceView() {
    return mount(WorkspaceView, {
      global: {
        stubs: {
          UrlBar: UrlBarStub,
          RequestEditor: {
            template: '<div data-test="request-editor-stub" />',
          },
          ResponseViewer: {
            template: '<div data-test="response-viewer-stub" />',
          },
          WebSocketPanel: WebSocketPanelStub,
          MockServerPanel: MockServerPanelStub,
          SplitPane: SplitPaneStub,
        },
      },
    });
  }

  it("shows the HTTP workspace by default and switches tabs", async () => {
    const wrapper = mountWorkspaceView();

    expect(wrapper.find('[data-test="url-bar-stub"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="websocket-panel-stub"]').exists()).toBe(
      false,
    );
    expect(wrapper.find('[data-test="mock-panel-stub"]').exists()).toBe(false);

    await wrapper.get("button:nth-child(2)").trigger("click");
    expect(wrapper.find('[data-test="websocket-panel-stub"]').exists()).toBe(
      true,
    );

    await wrapper.get("button:nth-child(3)").trigger("click");
    expect(wrapper.find('[data-test="mock-panel-stub"]').exists()).toBe(true);
  });

  it("routes focus and primary action to the active HTTP panel", async () => {
    const wrapper = mountWorkspaceView();
    const view = wrapper.vm as {
      focusUrlInput: () => void;
      executeSend: () => Promise<void>;
    };

    view.focusUrlInput();
    await view.executeSend();

    expect(urlFocusSpy).toHaveBeenCalledTimes(1);
    expect(urlSendSpy).toHaveBeenCalledTimes(1);
  });

  it("routes focus and primary action to the active WebSocket panel", async () => {
    const protocolStore = useProtocolStore();
    protocolStore.mode = "websocket";

    const wrapper = mountWorkspaceView();
    const view = wrapper.vm as {
      focusUrlInput: () => void;
      executeSend: () => Promise<void>;
    };

    view.focusUrlInput();
    await view.executeSend();

    expect(webSocketFocusSpy).toHaveBeenCalledTimes(1);
    expect(webSocketActionSpy).toHaveBeenCalledTimes(1);
  });

  it("routes focus and primary action to the active mock server panel", async () => {
    const protocolStore = useProtocolStore();
    protocolStore.mode = "mock";

    const wrapper = mountWorkspaceView();
    const view = wrapper.vm as {
      focusUrlInput: () => void;
      executeSend: () => Promise<void>;
    };

    view.focusUrlInput();
    await view.executeSend();

    expect(mockFocusSpy).toHaveBeenCalledTimes(1);
    expect(mockActionSpy).toHaveBeenCalledTimes(1);
  });
});
