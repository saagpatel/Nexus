import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const outputDir = path.join(rootDir, ".vite", "preload");

await mkdir(outputDir, { recursive: true });

await build({
  root: rootDir,
  configFile: path.join(rootDir, "vite.preload.config.ts"),
  build: {
    emptyOutDir: false,
    minify: false,
    outDir: outputDir,
    rollupOptions: {
      external: ["electron"],
      output: {
        entryFileNames: "index.js",
        format: "cjs",
      },
    },
    sourcemap: true,
    ssr: path.join(rootDir, "electron/preload/index.ts"),
    target: "node20",
  },
});
