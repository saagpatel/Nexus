import { nanoid } from "nanoid";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useResponseStore } from "./response";

export type AssertionType = "status-equals" | "body-includes" | "header-exists";

export interface AssertionRule {
  id: string;
  type: AssertionType;
  expected: string;
}

export interface AssertionOutcome {
  id: string;
  passed: boolean;
  message: string;
}

function randomId(): string {
  return `assert-${nanoid(8)}`;
}

export const useAssertionsStore = defineStore("assertions", () => {
  const rules = ref<AssertionRule[]>([]);
  const results = ref<AssertionOutcome[]>([]);
  const responseStore = useResponseStore();

  function addRule(type: AssertionType = "status-equals"): void {
    const defaults: Record<AssertionType, string> = {
      "status-equals": "200",
      "body-includes": "",
      "header-exists": "content-type",
    };

    rules.value.push({
      id: randomId(),
      type,
      expected: defaults[type],
    });
  }

  function removeRule(id: string): void {
    rules.value = rules.value.filter((rule) => rule.id !== id);
    results.value = results.value.filter((result) => result.id !== id);
  }

  function evaluate(): void {
    const nextResults: AssertionOutcome[] = [];

    for (const rule of rules.value) {
      if (rule.type === "status-equals") {
        const expectedCode = Number.parseInt(rule.expected, 10);
        const passed = responseStore.statusCode === expectedCode;
        nextResults.push({
          id: rule.id,
          passed,
          message: passed
            ? `Status is ${expectedCode}`
            : `Expected ${expectedCode}, got ${responseStore.statusCode ?? "none"}`,
        });
        continue;
      }

      if (rule.type === "body-includes") {
        const expectedText = rule.expected;
        const passed =
          expectedText.length > 0 && responseStore.body.includes(expectedText);
        nextResults.push({
          id: rule.id,
          passed,
          message: passed
            ? "Body contains expected text"
            : "Body does not contain expected text",
        });
        continue;
      }

      const key = rule.expected.toLowerCase();
      const hasHeader = Object.keys(responseStore.headers).some(
        (header) => header.toLowerCase() === key,
      );
      nextResults.push({
        id: rule.id,
        passed: hasHeader,
        message: hasHeader
          ? `Header "${rule.expected}" is present`
          : `Header "${rule.expected}" is missing`,
      });
    }

    results.value = nextResults;
  }

  const summary = computed(() => {
    const passed = results.value.filter((result) => result.passed).length;
    const total = results.value.length;
    return {
      passed,
      failed: total - passed,
      total,
    };
  });

  return {
    rules,
    results,
    summary,
    addRule,
    removeRule,
    evaluate,
  };
});
