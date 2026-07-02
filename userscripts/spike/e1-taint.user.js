// ==UserScript==
// @name         QRTuber Spike E1 Pixel Export Probe
// @namespace    https://qrtuber.com/
// @version      0.1.0
// @description  Probe userscript video canvas tainting on Twitch and YouTube.
// @match        *://*.twitch.tv/*
// @match        *://*.youtube.com/*
// @run-at       document-idle
// @grant        GM_info
// ==/UserScript==

(() => {
  "use strict";

  const state = {
    rows: [],
  };

  function modeLabel() {
    return typeof GM_info === "undefined"
      ? "page world (@grant none)"
      : `userscript sandbox (${GM_info.scriptHandler})`;
  }

  function createPanel() {
    const panel = document.createElement("section");
    panel.id = "qrtuber-spike-panel";
    panel.style.cssText = [
      "position:fixed",
      "z-index:2147483647",
      "right:12px",
      "bottom:12px",
      "width:360px",
      "max-height:60vh",
      "overflow:auto",
      "background:#111",
      "color:#f6f6f6",
      "font:12px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      "border:1px solid #666",
      "border-radius:6px",
      "padding:10px",
    ].join(";");
    panel.innerHTML = `
      <strong>QRTuber E1 pixel export</strong>
      <div>${modeLabel()}</div>
      <button id="qrtuber-e1-run" type="button">Run probe</button>
      <pre id="qrtuber-e1-output"></pre>
    `;
    document.documentElement.append(panel);
    panel.querySelector("#qrtuber-e1-run").addEventListener("click", () => {
      void runProbe();
    });
    return panel;
  }

  function output() {
    let pre = document.querySelector("#qrtuber-e1-output");
    if (pre === null) {
      createPanel();
      pre = document.querySelector("#qrtuber-e1-output");
    }
    pre.textContent = state.rows
      .map((row) => `${row.name}: ${row.ok ? "ok" : "fail"} ${row.detail}`)
      .join("\n");
  }

  function record(name, ok, detail) {
    state.rows.push({ name, ok, detail });
    output();
  }

  function largestVisibleVideo() {
    let best = null;
    let bestArea = 0;
    for (const video of document.querySelectorAll("video")) {
      const rect = video.getBoundingClientRect();
      const area =
        Math.max(0, Math.min(innerWidth, rect.right) - Math.max(0, rect.left)) *
        Math.max(0, Math.min(innerHeight, rect.bottom) - Math.max(0, rect.top));
      if (area > bestArea && video.videoWidth > 0 && video.videoHeight > 0) {
        best = video;
        bestArea = area;
      }
    }
    return best;
  }

  function canvasFor(video) {
    const width = Math.min(640, video.videoWidth);
    const height = Math.max(1, Math.round((width / video.videoWidth) * video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  async function blobFromCanvas(canvas) {
    if (typeof canvas.convertToBlob === "function") {
      return await canvas.convertToBlob();
    }
    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob === null) {
          reject(new Error("toBlob returned null"));
          return;
        }
        resolve(blob);
      }, "image/png");
    });
  }

  async function runProbe() {
    state.rows = [];
    output();

    const video = largestVisibleVideo();
    if (video === null) {
      record("video", false, "no visible video with metadata");
      return;
    }

    record("video", true, `${video.videoWidth}x${video.videoHeight}`);
    const canvas = canvasFor(video);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (context === null) {
      record("2d-context", false, "no canvas 2d context");
      return;
    }

    const drawStart = performance.now();
    try {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      record("drawImage", true, `${(performance.now() - drawStart).toFixed(1)}ms`);
    } catch (error) {
      record("drawImage", false, error instanceof Error ? error.message : String(error));
      return;
    }

    const readStart = performance.now();
    try {
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      record(
        "getImageData",
        true,
        `${imageData.data.byteLength} bytes in ${(performance.now() - readStart).toFixed(1)}ms`
      );
    } catch (error) {
      record("getImageData", false, error instanceof Error ? error.message : String(error));
    }

    const blobStart = performance.now();
    try {
      const blob = await blobFromCanvas(canvas);
      record("toBlob/convertToBlob", true, `${blob.size} bytes in ${(performance.now() - blobStart).toFixed(1)}ms`);
    } catch (error) {
      record("toBlob/convertToBlob", false, error instanceof Error ? error.message : String(error));
    }
  }

  createPanel();
})();
