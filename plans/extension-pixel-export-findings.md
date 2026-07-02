# Extension Pixel-Export Preflight Findings

Date: 2026-07-02

## Purpose

Stage C must not assume that a content script can draw real Twitch/YouTube video frames into a canvas and export pixels. The localhost generator target proves the message/decode loop, but it does not prove cross-origin media behaviour on streaming platforms.

## Current Decision

Proceed with the Stage C engine/message architecture, but keep the content capture path replaceable:

- `frame/decode` messages carry data-URL image frames into the engine.
- The first implementation may use page-video canvas capture when it works.
- Capture failures must stop/report cleanly instead of looping forever.
- The content-side controller must isolate capture behind a small boundary so `tabCapture`/`captureVisibleTab` or an offscreen capture backend can replace page-video canvas capture if real-platform checks fail.

## Findings Matrix

| Browser extension context | Twitch live | YouTube live | YouTube VOD | Status |
|---|---:|---:|---:|---|
| Chrome content script drawImage + getImageData/convertToBlob | Not run | Not run | Not run | Needs qdot-assisted real stream/session |
| Firefox content script drawImage + getImageData/convertToBlob | Not run | Not run | Not run | Needs qdot-assisted real stream/session |
| Localhost generator `?video=1` | Works as a structural test only | Works as a structural test only | Works as a structural test only | Covered by Stage B/C smoke tests |

## Gate Outcome

Real-platform export is unproven, so Stage C must not bake the capture strategy into the engine API. The implementation should treat page-video capture as an interchangeable producer of `frame/decode` data URLs and should surface capture errors in status.

End-to-end validation remains required after qdot can provide real Twitch/YouTube sessions:

1. Load unpacked extension.
2. Start tracking on a Twitch live page, YouTube live page, and YouTube VOD.
3. Confirm whether canvas export succeeds, fails with a taint/security error, or produces unusable frames.
4. If any target fails, switch that target to an extension-owned capture backend before release.
