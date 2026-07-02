---
sidebar_position: 4
---

# Userscript Viewer

There is no supported QRTuber userscript viewer yet.

Stage E1 produced spike scripts under `userscripts/spike/` to test whether a userscript can safely and reliably read video pixels, run a QR decoder, and connect to local Intiface. Stage E2, the actual Twitch-first userscript viewer, is pending and currently no-go until the user-assisted browser matrix passes on real Twitch and YouTube pages.

The working viewer choices today are the [browser extension](./extension.md) and the [web viewer](./webrtc.md).

## Current Spike Status

The spike includes:

- `e1-taint.user.js`: checks whether page video can be drawn to canvas and read back.
- `e2-decoders.user.js`: checks inline WASM, `BarcodeDetector`, jsQR, and zbar-wasm decoder viability.
- `e3-ws.user.js`: checks localhost WebSocket access for Intiface.
- `e4-bundle/`: checks whether a minimal bundled userscript importing QRTuber core is accepted by a userscript manager.

The current findings are recorded in `plans/userscript-spike-findings.md`. The docs here stand on the same status: the E4 bundle-size probe passed, but the real browser/page matrix is still pending.

## Go/No-Go Gates

The userscript viewer should not be documented or shipped as v1 until these gates pass:

- page-video canvas read/export works on the target platform;
- at least one decoder path works in the userscript environment;
- ROI decode performance is fast enough for 1080p playback;
- localhost Intiface WebSocket access works from the page;
- the final userscript bundle remains practical for Tampermonkey or Violentmonkey;
- an end-to-end test stream confirms QR decode and haptic output.

If those gates pass, the intended first target is Twitch. Until then, use the extension or web viewer.
