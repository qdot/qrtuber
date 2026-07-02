// ==UserScript==
// @name         QRTuber Spike E2 Decoder Probe
// @namespace    https://qrtuber.com/
// @version      0.1.0
// @description  Probe userscript decoder options on Twitch and YouTube.
// @match        *://*.twitch.tv/*
// @match        *://*.youtube.com/*
// @run-at       document-idle
// @grant        GM_info
// ==/UserScript==

(() => {
  "use strict";

  const rows = [];

  function render() {
    let panel = document.querySelector("#qrtuber-e2-panel");
    if (panel === null) {
      panel = document.createElement("section");
      panel.id = "qrtuber-e2-panel";
      panel.style.cssText = [
        "position:fixed",
        "z-index:2147483647",
        "right:12px",
        "bottom:12px",
        "width:420px",
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
        <strong>QRTuber E2 decoder probe</strong>
        <div>${typeof GM_info === "undefined" ? "@grant none" : GM_info.scriptHandler}</div>
        <button id="qrtuber-e2-run" type="button">Run probe</button>
        <pre id="qrtuber-e2-output"></pre>
      `;
      document.documentElement.append(panel);
      panel.querySelector("#qrtuber-e2-run").addEventListener("click", () => {
        void runProbe();
      });
    }

    panel.querySelector("#qrtuber-e2-output").textContent = rows
      .map((row) => `${row.name}: ${row.ok ? "ok" : "fail"} ${row.detail}`)
      .join("\n");
  }

  function record(name, ok, detail) {
    rows.push({ name, ok, detail });
    render();
  }

  function captureFrame() {
    const video = Array.from(document.querySelectorAll("video")).find(
      (candidate) => candidate.videoWidth > 0 && candidate.videoHeight > 0
    );
    if (video === undefined) {
      throw new Error("no video with metadata");
    }

    const width = Math.min(640, video.videoWidth);
    const height = Math.max(1, Math.round((width / video.videoWidth) * video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (context === null) {
      throw new Error("no canvas context");
    }
    context.drawImage(video, 0, 0, width, height);
    return {
      canvas,
      imageData: context.getImageData(0, 0, width, height),
    };
  }

  async function probeInlineWasm() {
    const emptyModule = new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
    ]);
    const start = performance.now();
    await WebAssembly.compile(emptyModule);
    record("inline-wasm", true, `${(performance.now() - start).toFixed(1)}ms`);
  }

  async function probeBarcodeDetector(canvas) {
    if (!("BarcodeDetector" in globalThis)) {
      record("BarcodeDetector", false, "not present");
      return;
    }

    const Detector = globalThis.BarcodeDetector;
    const start = performance.now();
    const detector = new Detector({ formats: ["qr_code"] });
    const result = await detector.detect(canvas);
    record("BarcodeDetector", true, `${result.length} result(s) in ${(performance.now() - start).toFixed(1)}ms`);
  }

  async function probeJsQr(imageData) {
    const start = performance.now();
    const module = await import("https://cdn.jsdelivr.net/npm/jsqr@1.4.0/+esm");
    const jsQR = module.default ?? module;
    const result = jsQR(imageData.data, imageData.width, imageData.height);
    record("jsQR", true, `${result === null ? 0 : 1} result(s) in ${(performance.now() - start).toFixed(1)}ms`);
  }

  async function probeZbar(imageData) {
    const start = performance.now();
    const module = await import("https://esm.sh/@undecaf/zbar-wasm@0.11.0");
    const result = await module.scanImageData(imageData);
    record("zbar-wasm", true, `${result.length} result(s) in ${(performance.now() - start).toFixed(1)}ms`);
  }

  async function runProbe() {
    rows.length = 0;
    render();

    let frame;
    try {
      frame = captureFrame();
      record("capture", true, `${frame.imageData.width}x${frame.imageData.height}`);
    } catch (error) {
      record("capture", false, error instanceof Error ? error.message : String(error));
      return;
    }

    for (const [name, probe] of [
      ["inline-wasm", () => probeInlineWasm()],
      ["BarcodeDetector", () => probeBarcodeDetector(frame.canvas)],
      ["jsQR", () => probeJsQr(frame.imageData)],
      ["zbar-wasm", () => probeZbar(frame.imageData)],
    ]) {
      try {
        await probe();
      } catch (error) {
        record(name, false, error instanceof Error ? error.message : String(error));
      }
    }
  }

  render();
})();
