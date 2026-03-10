import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

const makers: ForgeConfig["makers"] = [new MakerZIP({}, ["darwin", "linux"])];

if (process.env.RELEASE_INCLUDE_DMG === "1") {
  makers.push(new MakerDMG({}, ["darwin"]));
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: "*.{node,dylib,so,dll}",
    },
    name: "Nexus",
    osxSign:
      process.env.RELEASE_SIGN === "1"
        ? {
            identity: process.env.APPLE_SIGN_IDENTITY,
            hardenedRuntime: true,
            entitlements: "electron/build/entitlements.mac.plist",
            entitlementsInherit:
              "electron/build/entitlements.mac.inherit.plist",
          }
        : undefined,
    osxNotarize:
      process.env.RELEASE_NOTARIZE === "1"
        ? process.env.APPLE_KEYCHAIN_PROFILE
          ? {
              keychainProfile: process.env.APPLE_KEYCHAIN_PROFILE,
            }
          : {
              appleApiKey: process.env.APPLE_API_KEY_PATH,
              appleApiKeyId: process.env.APPLE_API_KEY_ID,
              appleApiIssuer: process.env.APPLE_API_ISSUER,
            }
        : undefined,
  },
  makers,
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "electron/main/index.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "electron/preload/index.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
