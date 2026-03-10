const path = require("node:path");
const { test, expect } = require("@playwright/test");
const { _electron: electron } = require("playwright");
const { request: httpRequest } = require("undici");

const repoRoot = path.resolve(__dirname, "../..");
const mainEntry = path.join(repoRoot, ".vite", "build", "index.js");
const shouldDisableSandbox =
  process.platform === "linux" && process.env.CI === "true";
const launchArgs = shouldDisableSandbox
  ? ["--no-sandbox", mainEntry]
  : [mainEntry];

test("desktop critical path smoke", async () => {
  const app = await electron.launch({
    args: launchArgs,
    cwd: repoRoot,
    env: {
      ...process.env,
      E2E_DISABLE_SANDBOX: shouldDisableSandbox ? "1" : "0",
      NODE_ENV: "test",
    },
  });

  try {
    await expect
      .poll(async () => (await app.windows()).length, {
        message: "waiting for Electron to open its first window",
      })
      .toBeGreaterThan(0);

    const [page] = await app.windows();

    await expect(page.getByText("Nexus")).toBeVisible();
    await expect(page.getByRole("button", { name: "Send" })).toBeVisible();

    await page.getByRole("button", { name: "Mocks" }).click();
    await expect(
      page.getByRole("button", { name: "Start Server" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Start Server" }).click();

    const baseUrlLocator = page
      .locator("text=/http:\\/\\/127\\.0\\.0\\.1:\\d+/")
      .first();
    await expect(baseUrlLocator).toBeVisible();

    const baseUrlText = await baseUrlLocator.textContent();
    const baseUrl =
      baseUrlText && (baseUrlText.match(/http:\/\/127\.0\.0\.1:\d+/) || [])[0];
    expect(baseUrl).toBeTruthy();

    const response = await httpRequest(`${baseUrl}/health`);
    expect(response.statusCode).toBe(200);
    await expect(page.getByText("1 captured request")).toBeVisible();
    await expect(page.getByText("Matched")).toBeVisible();

    await page
      .getByRole("button", { name: "Socket", exact: true })
      .first()
      .click();
    await expect(page.getByRole("button", { name: "Connect" })).toBeVisible();

    await page
      .getByRole("button", { name: "HTTP", exact: true })
      .first()
      .click();
    await expect(page.getByRole("button", { name: "Send" })).toBeVisible();
  } finally {
    await app.close();
  }
});
