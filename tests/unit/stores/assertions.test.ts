import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useAssertionsStore } from "@/stores/assertions";
import { useResponseStore } from "@/stores/response";

describe("Assertions Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("evaluates status/body/header assertions", () => {
    const responseStore = useResponseStore();
    const assertionsStore = useAssertionsStore();

    responseStore.statusCode = 200;
    responseStore.body = '{"ok":true,"message":"success"}';
    responseStore.headers = {
      "content-type": "application/json",
    };

    assertionsStore.addRule("status-equals");
    assertionsStore.addRule("body-includes");
    assertionsStore.addRule("header-exists");

    assertionsStore.rules[1].expected = "success";
    assertionsStore.rules[2].expected = "content-type";

    assertionsStore.evaluate();

    expect(assertionsStore.summary.total).toBe(3);
    expect(assertionsStore.summary.failed).toBe(0);
  });

  it("marks failed assertions", () => {
    const responseStore = useResponseStore();
    const assertionsStore = useAssertionsStore();

    responseStore.statusCode = 404;
    responseStore.body = "not found";
    responseStore.headers = {};

    assertionsStore.addRule("status-equals");
    assertionsStore.rules[0].expected = "200";
    assertionsStore.evaluate();

    expect(assertionsStore.summary.passed).toBe(0);
    expect(assertionsStore.summary.failed).toBe(1);
  });
});
