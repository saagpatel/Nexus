import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "../..");
const outReleaseDir = path.join(projectRoot, "out", "release");

function readJsonIfExists(fileName) {
  const fullPath = path.join(outReleaseDir, fileName);
  if (!existsSync(fullPath)) {
    return null;
  }
  return JSON.parse(readFileSync(fullPath, "utf8"));
}

mkdirSync(outReleaseDir, { recursive: true });

const preflight = readJsonIfExists("preflight.json");
const manifest = readJsonIfExists("release-manifest.json");
const checksumsPath = path.join(outReleaseDir, "checksums.txt");
const checksumsPresent = existsSync(checksumsPath);

const gates = [
  {
    id: "G1-preflight",
    status: preflight?.status === "pass" ? "pass" : "fail",
  },
  {
    id: "G2-manifest",
    status: manifest?.artifacts?.length > 0 ? "pass" : "fail",
  },
  { id: "G3-checksums", status: checksumsPresent ? "pass" : "fail" },
  {
    id: "G4-tests",
    status: process.env.RELEASE_TESTS_PASSED === "1" ? "pass" : "unknown",
  },
  {
    id: "G5-typecheck",
    status: process.env.RELEASE_TYPECHECK_PASSED === "1" ? "pass" : "unknown",
  },
  {
    id: "G6-e2e-smoke",
    status: process.env.RELEASE_E2E_PASSED === "1" ? "pass" : "unknown",
  },
];

const failed = gates
  .filter((gate) => gate.status === "fail")
  .map((gate) => gate.id);
const decision = failed.length === 0 ? "go" : "no-go";

const report = {
  decision,
  failedGates: failed,
  gates,
  generatedAt: new Date().toISOString(),
};

writeFileSync(
  path.join(outReleaseDir, "go-no-go.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(`Release decision: ${decision.toUpperCase()}`);
