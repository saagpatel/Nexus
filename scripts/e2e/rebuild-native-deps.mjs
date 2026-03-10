import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { rebuild } from "@electron/rebuild";

const require = createRequire(import.meta.url);
const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const electronVersion = require("electron/package.json").version;

await rebuild({
  buildPath: rootDir,
  electronVersion,
  force: true,
  onlyModules: ["better-sqlite3"],
  projectRootPath: rootDir,
  types: ["prod", "optional"],
});
