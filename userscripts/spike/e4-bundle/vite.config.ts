import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

export default defineConfig({
  build: {
    emptyOutDir: true,
    minify: true,
    outDir: "dist",
  },
  plugins: [
    monkey({
      entry: "src/main.ts",
      userscript: {
        name: "QRTuber E4 Bundle Probe",
        namespace: "https://qrtuber.com/",
        version: "0.1.0",
        description: "Minimal bundle-size probe importing qrtuber core.",
        match: ["*://*.twitch.tv/*"],
        grant: "none",
      },
    }),
  ],
});
