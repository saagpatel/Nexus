import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const outputDir = path.join(rootDir, ".vite", "renderer", "main_window");

await mkdir(outputDir, { recursive: true });

await build({
  root: rootDir,
  configFile: path.join(rootDir, "vite.renderer.config.ts"),
  base: "./",
  build: {
    emptyOutDir: false,
    outDir: outputDir,
    sourcemap: true,
  },
});
