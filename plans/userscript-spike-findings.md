# Userscript Viability Spike Findings

Date: 2026-07-02

## Status

Current decision: no-go for Stage E2 until the user-assisted browser matrix is
run on real Twitch and YouTube video pages. The bundle-size gate passed for the
minimal E4 import probe.

The spike artifacts are committed under `userscripts/spike/`:

- `e1-taint.user.js`: page-video canvas draw/read/export probe.
- `e2-decoders.user.js`: inline WASM, BarcodeDetector, jsQR, and zbar-wasm probe.
- `e3-ws.user.js`: localhost Intiface WebSocket probe.
- `e4-bundle/`: minimal `vite-plugin-monkey` bundle probe importing `qrtuber`.

For E1 and E2, run once with the checked-in `@grant GM_info` sandbox metadata
and once in page-world mode by changing the metadata to `@grant none`.

## Matrix

| Browser + manager | Page | E1 taint | E2 WASM | E2 BarcodeDetector | E2 jsQR | E2 zbar-wasm | E3 ws://127.0.0.1 | E4 bundle | Result |
|---|---|---|---|---|---|---|---|---|---|
| Chrome + Tampermonkey | Twitch live | Pending | Pending | Pending | Pending | Pending | Pending | 34,010 bytes build-only | Pending |
| Chrome + Tampermonkey | YouTube live | Pending | Pending | Pending | Pending | Pending | Pending | 34,010 bytes build-only | Pending |
| Chrome + Tampermonkey | YouTube VOD | Pending | Pending | Pending | Pending | Pending | Pending | 34,010 bytes build-only | Pending |
| Firefox + Violentmonkey | Twitch live | Pending | Pending | Pending | Pending | Pending | Pending | 34,010 bytes build-only | Pending |
| Firefox + Violentmonkey | YouTube live | Pending | Pending | Pending | Pending | Pending | Pending | 34,010 bytes build-only | Pending |
| Firefox + Violentmonkey | YouTube VOD | Pending | Pending | Pending | Pending | Pending | Pending | 34,010 bytes build-only | Pending |

## Gates

- If E1 canvas read/export fails on a platform, that platform is no-go for a
  page-video userscript viewer.
- If only jsQR works, proceed only if ROI decode is consistently under 50 ms at
  1080p.
- If all decoder paths are blocked, userscript viewer is no-go.
- If the E4 bundle output is over 2 MB, retry with a jsQR-only bundle before
  deciding.
- End-to-end live-stream validation still requires streaming the generator to a
  test Twitch channel.

## E4 Bundle Instructions

```sh
cd userscripts/spike/e4-bundle
npm install
npm run build
wc -c dist/*.user.js
```

Install the generated `.user.js` in Tampermonkey and confirm that Twitch accepts
and executes it.
