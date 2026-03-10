import { mkdirSync, writeFileSync } from "node:fs";

mkdirSync(".perf-results", { recursive: true });
writeFileSync(
  ".perf-results/lhci.json",
  `${JSON.stringify(
    {
      status: "skipped",
      reason:
        "Lighthouse checks are not configured for this desktop build target.",
      capturedAt: new Date().toISOString(),
    },
    null,
    2,
  )}\n`,
);

console.log("Skipping Lighthouse check for desktop build target.");
