// ==UserScript==
// @name         QRTuber Spike E3 Local WebSocket Probe
// @namespace    https://qrtuber.com/
// @version      0.1.0
// @description  Probe localhost WebSocket access from stream pages.
// @match        *://*.twitch.tv/*
// @match        *://*.youtube.com/*
// @run-at       document-idle
// @grant        GM_info
// ==/UserScript==

(() => {
  "use strict";

  const DEFAULT_ADDRESS = "ws://127.0.0.1:12345";

  function render(message) {
    let panel = document.querySelector("#qrtuber-e3-panel");
    if (panel === null) {
      panel = document.createElement("section");
      panel.id = "qrtuber-e3-panel";
      panel.style.cssText = [
        "position:fixed",
        "z-index:2147483647",
        "right:12px",
        "bottom:12px",
        "width:380px",
        "background:#111",
        "color:#f6f6f6",
        "font:12px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        "border:1px solid #666",
        "border-radius:6px",
        "padding:10px",
      ].join(";");
      panel.innerHTML = `
        <strong>QRTuber E3 WebSocket probe</strong>
        <input id="qrtuber-e3-address" type="text" value="${DEFAULT_ADDRESS}" />
        <button id="qrtuber-e3-run" type="button">Connect</button>
        <pre id="qrtuber-e3-output"></pre>
      `;
      document.documentElement.append(panel);
      panel.querySelector("#qrtuber-e3-run").addEventListener("click", () => {
        runProbe(panel.querySelector("#qrtuber-e3-address").value);
      });
    }
    panel.querySelector("#qrtuber-e3-output").textContent = message;
  }

  function runProbe(address) {
    const startedAt = performance.now();
    render(`connecting to ${address}`);

    let socket;
    try {
      socket = new WebSocket(address);
    } catch (error) {
      render(`constructor failed: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }

    const timeout = window.setTimeout(() => {
      socket.close();
      render(`timeout after ${(performance.now() - startedAt).toFixed(1)}ms`);
    }, 5000);

    socket.addEventListener("open", () => {
      window.clearTimeout(timeout);
      render(`open in ${(performance.now() - startedAt).toFixed(1)}ms`);
      socket.close();
    });
    socket.addEventListener("error", () => {
      window.clearTimeout(timeout);
      render(`error after ${(performance.now() - startedAt).toFixed(1)}ms`);
    });
    socket.addEventListener("close", (event) => {
      window.clearTimeout(timeout);
      if (event.wasClean) {
        return;
      }
      render(`closed code=${event.code} clean=${event.wasClean}`);
    });
  }

  render("idle");
})();
