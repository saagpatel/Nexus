import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const outputDir = path.join(rootDir, ".vite", "build");

await mkdir(outputDir, { recursive: true });

await build({
  root: rootDir,
  configFile: path.join(rootDir, "vite.main.config.ts"),
  define: {
    MAIN_WINDOW_VITE_DEV_SERVER_URL: JSON.stringify(""),
    MAIN_WINDOW_VITE_NAME: JSON.stringify("main_window"),
  },
  build: {
    emptyOutDir: false,
    minify: false,
    outDir: outputDir,
    rollupOptions: {
      external: ["electron", "better-sqlite3", "undici"],
      output: {
        entryFileNames: "index.js",
        format: "cjs",
      },
    },
    sourcemap: true,
    ssr: path.join(rootDir, "electron/main/index.ts"),
    target: "node20",
  },
});
