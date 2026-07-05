import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const MATOMO_URL = "https://metrics.nonpolynomial.com/";
const MATOMO_SITE_ID = "13";

const matomoScript = `
var localHostnames = ["localhost", "127.0.0.1", "::1"];
if (!localHostnames.includes(window.location.hostname) && window.location.protocol !== "file:") {
  var _paq = window._paq = window._paq || [];
  _paq.push(["setCustomUrl", window.location.origin + window.location.pathname]);
  _paq.push(["setDocumentTitle", document.title]);
  _paq.push(["trackPageView"]);
  _paq.push(["enableLinkTracking"]);
  (function() {
    var u = "${MATOMO_URL}";
    _paq.push(["setTrackerUrl", u + "matomo.php"]);
    _paq.push(["setSiteId", "${MATOMO_SITE_ID}"]);
    var d = document;
    var g = d.createElement("script");
    var s = d.getElementsByTagName("script")[0];
    g.async = true;
    g.referrerPolicy = "strict-origin-when-cross-origin";
    g.src = u + "matomo.js";
    s.parentNode.insertBefore(g, s);
  })();
}
`.trim();

function matomoPlugin(): Plugin {
  return {
    name: "qrtuber-matomo",
    transformIndexHtml() {
      return [
        {
          tag: "meta",
          attrs: {
            name: "referrer",
            content: "strict-origin-when-cross-origin"
          },
          injectTo: "head"
        },
        {
          tag: "script",
          children: matomoScript,
          injectTo: "head"
        }
      ];
    }
  };
}

export default defineConfig({
  base: "/app/",
  plugins: [react(), matomoPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        generator: resolve(__dirname, "generator/index.html"),
        device: resolve(__dirname, "device/index.html")
      }
    }
  }
});
