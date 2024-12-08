import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: 'chrome',
  manifest: {
    name: "QRTuber",
    version: "0.0.1",
    short_name: "QRTuber",
    description: "Pick up QRCodes in video streams for data relay and device control.",
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
    },
    host_permissions: [
      "*://twitch.tv/*",
    ]
  },
/*
  vite: (env) => ({
    resolve: {
      // Condition for zbar-wasm to pack the WASM file in as a base64 asset. Makes asset loading
      // within the extension context much easier.
      conditions: ["zbar-inlined"]
    }
  })
    */
});
