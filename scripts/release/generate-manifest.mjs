import { createHash } from "node:crypto";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "../..");
const outReleaseDir = path.join(projectRoot, "out", "release");
const makeDir = path.join(projectRoot, "out", "make");
const packageJsonPath = path.join(projectRoot, "package.json");

function walk(dir) {
  const results = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      results.push(...walk(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

function sha256(filePath) {
  const contents = readFileSync(filePath);
  return createHash("sha256").update(contents).digest("hex");
}

mkdirSync(outReleaseDir, { recursive: true });

let artifactPaths = [];
try {
  artifactPaths = walk(makeDir).filter(
    (file) => file.endsWith(".zip") || file.endsWith(".dmg"),
  );
} catch {
  artifactPaths = [];
}

const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const gitSha =
  process.env.GITHUB_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "local";

const artifacts = artifactPaths.map((filePath) => {
  const size = statSync(filePath).size;
  const fileName = path.basename(filePath);
  let arch = "unknown";
  if (/arm64/.test(fileName)) arch = "arm64";
  if (/(x64|amd64)/.test(fileName)) arch = "x64";

  return {
    file: fileName,
    path: path.relative(projectRoot, filePath),
    arch,
    bytes: size,
    sha256: sha256(filePath),
  };
});

const manifest = {
  name: pkg.productName ?? pkg.name,
  version: pkg.version,
  gitSha,
  generatedAt: new Date().toISOString(),
  artifacts,
};

const checksums = artifacts
  .map((item) => `${item.sha256}  ${item.path}`)
  .join("\n");

writeFileSync(
  path.join(outReleaseDir, "release-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
writeFileSync(
  path.join(outReleaseDir, "checksums.txt"),
  checksums ? `${checksums}\n` : "",
);

console.log(`Wrote release manifest with ${artifacts.length} artifacts.`);
