import { statSync } from "node:fs";
import path from "node:path";

const expectedMainEntry =
  process.env.NEXUS_MAIN_ENTRY ?? ".vite/build/index.js";
const resolvedPath = path.resolve(process.cwd(), expectedMainEntry);

try {
  const stats = statSync(resolvedPath);
  if (!stats.isFile() || stats.size === 0) {
    throw new Error("entry file is empty or not a regular file");
  }
  console.log(`Verified main entry: ${expectedMainEntry}`);
} catch (error) {
  const message = error instanceof Error ? error.message : "unknown error";
  console.error(
    `Prepackage check failed. Missing or invalid main entry at ${expectedMainEntry}.`,
  );
  console.error(
    `Resolution hint: run "pnpm build:main" and verify Forge/Vite output paths.`,
  );
  console.error(`Details: ${message}`);
  process.exit(1);
}
