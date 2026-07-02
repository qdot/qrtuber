# QRTuber: Fill In The Rest — Implementation Plan

## Context

QRTuber embeds constantly-updating QR codes in video streams so viewers can sync local effects (haptics via Intiface/Buttplug, lights, etc.) with streamer state. The QT1 protocol design (`plans/qr-sidechannel-design.md`) is complete **as a document**, but the code hasn't caught up: the "newly defined generic protocol" exists only in the design doc (commit `b27b918` updated docs, not source; `QRCodeFinder.ts:53` still has the inline `parseInt(result.substring(2))/99` haptics parse with a TODO admitting it's wrong).

This plan fills in the rest of the project:
1. **Core protocol layer** (prerequisite discovered during planning — doesn't exist yet)
2. **Extension overhaul** with a proper UI (popup + options)
3. **WebRTC viewer app** (hosted static SPA at qrtuber.com/app/, replaces external obs-qrcode-video-sync tracker)
4. **Userscript spike**, build if viable (Twitch first)
5. Docs + tooling glue

## Verified Current State

| Area | Reality |
|---|---|
| `core/` | No protocol layer. Inline haptics parse in QRCodeFinder (verified by direct read). `IntifaceClient` single-scalar, connector `http://127.0.0.1:12345` (wrong scheme). `ContentVideoHandler` leaks video listeners on start/stop, broken `debugLog`, dead code, pending-decode-after-stop bug. `HttpForwarder` unused. Vendored zbar-wasm-inlined.cjs is **currently dead code** (import points at npm pkg; kept as escape hatch for a vite/buttplug/ws resolution conflict — leave both alone). Zero tests. |
| `extension/` | wxt starter shell. Cross-context blob bug (page-created `blob:` URL fetched in MV3 SW). SW idle-death kills buttplug websocket. `host_permissions: ["*://twitch.tv/*"]` misses `www.`. No storage/options/status/error surfacing. Popup = 4 vanilla buttons + starter CSS. Mixed core imports (bare vs deep `@/../core/src/`). Background decode path has no `.catch` — failures hang the loop. |
| `webrtc/` | Non-compiling copy-pasted star-rating stub. Raze and rebuild. |
| `userscripts/` | Doesn't exist. |
| Tooling | No root package.json/workspaces. No code CI. `deploy-pages.yml` targets `main` (repo is `master`) so it never fires; it deploys the deciduous graph viewer from raw `docs/`. qrtuber.com = docusaurus via **Netlify (user confirmed)**. `.nvmrc` 22.12.0. |
| `docs/` | Docusaurus 3.6.3. `quickstart.md` truncated mid-sentence; most viewer/developer pages title-only stubs. Working demo `DemoReactComponent.tsx` uses old core API. Navbar "Browser Extension" links to `/demo/` (wrong). |

## User Decisions (locked)

- Extension UI: **Proper UI** — popup (status/toggle/address) + options page (channel mapping).
- WebRTC: **hosted static SPA** in `webrtc/`, served at `qrtuber.com/app/` via existing Netlify docs deploy.
- Userscript: **spike, then build if viable** (Tampermonkey, Twitch first).
- **buttplug-js 5.x** (latest, protocol v4 era) for the new adapter.
- **Node 24 LTS** (.nvmrc) + **wxt 0.20.x** — latest stable everywhere.
- Netlify hosts qrtuber.com — confirmed.
- Implementation by **GPT-5 Codex** agents by default. Use lightweight GPT-5/Codex subagents only for tightly-scoped mechanical tasks where noted; the main GPT-5 Codex session orchestrates + reviews. One commit per phase; stage files explicitly by name (never `git add -A`/`.`). Deciduous logging at orchestration level.

## Toolchain (researched 2026-07-02)

| Package | Action |
|---|---|
| Node 24 LTS (24.18.0) | Bump .nvmrc; root engines `>=24` |
| buttplug-js 5.0.1 | Target in new adapter (behind local interface) |
| wxt 0.20.x + @wxt-dev/module-react | Extension rewrite target. Caution: storage/testing import paths moved vs 0.19 (`wxt/utils/storage`, `wxt/testing/vitest-plugin`) — verify against installed docs |
| vitest 4.x | core + extension pure-logic tests |
| Vite 8.x, React 19.2.x | webrtc + userscript packages |
| qrcode ^1.5.4 (+@types/qrcode) | Generator page (auto-selects QR alphanumeric mode for QT1 strings) |
| @undecaf/zbar-wasm 0.11.0 | Abandoned upstream (2024). Keep for now; `barcode-detector` polyfill (zxing-wasm) is the designated future replacement behind `visual/types.ts` — follow-up, not this round |
| Docusaurus 3.6.3 → 3.10.x | Minor bump, low risk (fold into docs stage) |

## Target Core API Contract (all consumers build against this)

```ts
// core/src/protocol/ — pure, exhaustively tested
parseFrame(text: string): QRTuberFrame | null          // never throws; null on ANY malformed input
parseFrameResult(text: string): FrameParseResult       // discriminated union w/ error reason (debug UIs)
encodeFrame(frame: QRTuberFrame): string               // throws TypeError/RangeError on bad programmer input
class HapticsState                                     // Uint8Array(9); fromHex (strict 18 uppercase hex) | toHex | get | toArray | equals | isAllZero; clamps 0-255
class SequenceTracker                                  // accept(frame): first=true; session change=true; same session+same seq=false; any different seq=true
interface HapticsFrame { type: "H"; session: string; seq: number; state: HapticsState }
type QRTuberFrame = HapticsFrame
// Grammar: QT1:<SESSION>:<SEQ>:<TYPE>:<PAYLOAD>[:K:<V>...] — session /^[0-9A-Z]{1,8}$/, seq u32 decimal,
// payload 18× [0-9A-F], ext tail = single-uppercase-letter keys w/ non-empty values (unknown keys ignored,
// malformed tail rejects frame), max frame length 256, full QR-alphanumeric charset check first.

// core/src/visual/types.ts
interface Point { x: number; y: number }
interface BoundingBox { minX: number; minY: number; maxX: number; maxY: number }
interface VisualDecodeResult { payload: string; boundingBox: BoundingBox }   // plain object — survives runtime messaging
function boundingBoxFromPoints(points: readonly Point[]): BoundingBox | null

// core/src/QRCodeFinder.ts (refactored)
QRCodeFinder.findQRCode(source?: Blob | ImageData): Promise<VisualDecodeResult | null>  // RAW payload, no parsing; no source staged → null (no crash)
QRCodeFinder.DETECTION_EVENT                            // emits VisualDecodeResult

// core/src/ContentVideoHandler.ts (cleaned)
startTrackingVideo(video?: HTMLVideoElement)            // explicit element for webrtc app; falls back to querySelector("video")
stopTrackingVideo()                                     // full reset: abort listeners, revoke blob URL, clear ROI state
get isTrackingVideo(): boolean
get currentRegion(): BoundingBox | null                 // ROI origin — consumers translate crop-relative boxes to full-frame coords (webrtc overlay needs this)
handleQRCodeFinderReturn(result: VisualDecodeResult | null)  // guards videoElem===null (kills pending-loop-after-stop bug)

// core/src/adapters/IntifaceHapticsAdapter.ts — targets buttplug-js 5.x
class IntifaceHapticsAdapter {
  constructor(options?: IntifaceHapticsAdapterOptions, client?: ButtplugClientLike)  // injectable for tests
  connect(); disconnect(); applyState(state: HapticsState); stopAll(); get connected()
}
// Defaults: ws://127.0.0.1:12345 (fixes http:// bug), clientName "QRTuber", sequentialChannelMap
// (global actuator ordinal % 9), frameTimeoutMs 2000 (watchdog zeroes devices; 0 disables).
// Dedupes identical consecutive states. Per-device try/catch (one failing device doesn't stop others).
// ButtplugClientLike/actuator interfaces defined locally, mirroring the INSTALLED buttplug 5.x API —
// implementer verifies member names against node_modules/buttplug dist types; qdot adjudicates API questions.
```

Deleted: `HttpForwarder.ts`, `IntifaceClient.ts` (`QRTuberIntifaceClient`), `QRCodeFinderResult` class, dead `attach`/`detach` background cases (popup never sent them).

---

## Stage A — Core protocol + foundation

### A0. Workspaces + vitest foundation — GPT-5 Codex
- NEW root `package.json`: `qrtuber-monorepo`, private, `workspaces: ["core","extension","docs","webrtc"]`, scripts `compile`/`test` via `--workspaces --if-present`, engines `>=24`. Single root lockfile; `git rm` the four per-package lockfiles.
- `core/package.json`: split `compile` (tsc -p tsconfig.build.json + copyfiles) / `typecheck` / `test: vitest run`; exports map `{ ".": { types: "./dist/index.d.ts", default: "./dist/index.js" } }`; copyfiles → devDeps; add vitest.
- `core/tsconfig.json`: strip junk paths aliases, `noEmit: true`, include src+test; NEW `core/tsconfig.build.json` (emit, declaration, src only). NEW `core/vitest.config.ts` (node env, `passWithNoTests: true`).
- `webrtc/package.json`: delete the failing placeholder `test` script.
- `.nvmrc` → latest Node 24 LTS patch (verify at impl time).
- Keep `"qrtuber": "file:../core"` deps (npm workspaces resolves to the link; fallback `"qrtuber": "0.0.1"` if npm copies instead of symlinks).
- Verify: `npm install`; `npm run compile -w qrtuber`; `npm test -w qrtuber`; `npm run compile -w qrtuber-extension` (wxt postinstall — if `.wxt/` missing run `npm run postinstall -w qrtuber-extension`); docs typecheck (watch for @types/react hoisting skew — fix before commit).
- Commit: `build: convert repo to npm workspaces and add vitest to core`

### A1. Protocol layer (TDD — tests first) — GPT-5 Codex
- NEW `core/src/protocol/`: `charset.ts` (QR_ALPHANUMERIC_REGEX `/^[0-9A-Z $%*+\-./:]*$/`), `HapticsState.ts`, `frames.ts` (PROTOCOL_VERSION "QT1", MAX_SEQ 4294967295, MAX_FRAME_LENGTH 256, SESSION_REGEX, HapticsFrame, FrameParseError union: EMPTY|TOO_LONG|NOT_ALPHANUMERIC|BAD_STRUCTURE|BAD_VERSION|BAD_SESSION|BAD_SEQ|UNKNOWN_TYPE|BAD_PAYLOAD|BAD_EXTENSION), `parseFrame.ts` (validation order = that error list; never throws), `encodeFrame.ts`, `SequenceTracker.ts`, `index.ts`; barrel export from `core/src/index.ts`. Intra-core imports use `.js` extensions (existing style).
- NEW `core/test/protocol/*.test.ts` — the full enumerated matrix (~50 cases): spec vector `QT1:A7F2:18422:H:00FF4080A010203040` decode table; clamping (NaN→0, 300→255, 12.6→13); fromHex strictness (lowercase/17/19 chars/GG → null); seq edge cases (`-1`,`+5`,`1.5` pass charset, die at BAD_SEQ; leading zeros ok; u32 max); session 1–8 chars; ext tail well-formed/odd/two-char-key/empty-value; garbage-never-throws loop; encode↔parse roundtrips; encode throws on bad session/seq; SequenceTracker accept/dup/restart/session-change/reset.
- Verify: `npm test -w qrtuber` green; compile clean.
- Commit: `feat(core): add QT1 protocol layer (parseFrame, encodeFrame, HapticsState, SequenceTracker)`

### A2. Multichannel Intiface adapter (buttplug 5.x, TDD) — GPT-5 Codex
- Bump core dep `buttplug` → `^5.0.1`. NEW `core/src/adapters/IntifaceHapticsAdapter.ts` per contract above. DELETE `core/src/HttpForwarder.ts` and legacy `core/src/IntifaceClient.ts` in this phase, not A3; otherwise the Buttplug 5.x bump leaves stale Buttplug 3.x API calls in `src/` and `tsc` fails. Update barrel.
- NEW `core/test/adapters/IntifaceHapticsAdapter.test.ts` (fake client + recording devices, `vi.useFakeTimers()`): defaults/address override; connect passes websocket connector; multi-device ordinal mapping (1+2 actuators → ch0 / ch1,ch2; 10th wraps to ch0); custom + out-of-range channelMap clamped; byte→[0,1] conversion; not-connected no-op; zero-actuator device skipped; dedupe (identical twice → one call; device-count change re-sends); watchdog arm/re-arm/fire→stopAll→cache cleared; timeout 0 disables; rejecting device doesn't block others; disconnect clears watchdog.
- Verify: `npm test -w qrtuber`; `npm run compile -w qrtuber`; `grep -rn "HttpForwarder\|QRTuberIntifaceClient" core/src extension docs/src webrtc/src` → no hits.
- Commit: `feat(core): add multichannel IntifaceHapticsAdapter on buttplug 5.x, remove legacy Intiface clients`

### A3. Raw-payload cutover (the one breaking commit — core + all consumers together) — GPT-5 Codex (consumer files: lightweight GPT-5/Codex subagent if useful)
- NEW `core/src/visual/types.ts` + `core/test/visual/boundingBox.test.ts` (empty→null, single point, 4-corner, unordered/negative).
- `QRCodeFinder.ts`: refactor per contract — delete QRCodeFinderResult + inline parse + TODO; keep zbar import + barbarian comment byte-for-byte; `findQRCode(source?)` accepts Blob|ImageData, guards missing source (return null, don't crash on `_currentBlob!`).
- `ContentVideoHandler.ts`: cleanup per contract — AbortController for all video listeners; full state reset on stop; `trackingBoundingBox: BoundingBox | null` (+10px border preserved); `currentRegion` getter; null-videoElem guard in handleQRCodeFinderReturn; delete debugLog/trackingInterval/commented code. Final barrel: ContentVideoHandler, QRCodeFinder, protocol, adapter, visual/types.
- `extension/entrypoints/background.ts`: bare `'qrtuber'` imports; DETECTION_EVENT → parseFrame → SequenceTracker.accept → adapter.applyState; drop dead attach/detach; keep blob_url + connect/disconnect routing (interim — Stage C replaces this file).
- `extension/entrypoints/content.ts`: replace deep import with bare `'qrtuber'`; delete commented header.
- `docs/.../DemoReactComponent.tsx`: `_finder` (QRCodeFinder) + `_seqTracker` (SequenceTracker) + `_adapter` (IntifaceHapticsAdapter); display raw payload as trackedValue; parse→accept→applyState pipeline.
- Verify: core tests; core/extension compile; docs typecheck + build; `grep -rn "QRTuberIntifaceClient\|QRCodeFinderResult\|intiface_command: \"speed\"" extension docs/src webrtc/src` → no hits. Manual smoke: docs /demo page against demovideo.mp4 (payload display; old video's payload format will no longer drive haptics — expected, new-format assets come in B1).
- Commit: `refactor(core)!: return raw payload from QRCodeFinder and route consumers through the protocol layer`

## Stage B — WebRTC scaffold + generator (the test asset everything else uses; needs A1 only)

### B0. Raze & scaffold webrtc/ — GPT-5 Codex
- DELETE `QRTuberWebRTC.tsx`. Rewrite package.json (private, type module; deps react/react-dom ^19, qrtuber, qrcode; devDeps vite 8, @vitejs/plugin-react, typescript, @types/*). Fresh tsconfig (strict, bundler, react-jsx, ES2022, DOM+WebWorker libs). `vite.config.ts`: `base: '/app/'`, multi-page inputs `{ main: index.html, generator: generator/index.html }` (static hosting — no SPA router).
- `src/shared/coreBridge.ts` — the ONLY file importing `qrtuber`; re-exports + `smokeTest()` calling `parseFrame("QT1:A7F2:18422:H:00FF4080A010203040")` logged from the placeholder app. **This smoke test is the early-warning for the known vite×zbar/buttplug resolution trap** (`optimizeDeps.exclude: ['@undecaf/zbar-wasm']` if needed; vendored-cjs escape hatch exists).
- Verify: build passes; dev server renders both placeholder pages; console shows parsed frame.
- Commit: `build: replace webrtc stub with vite react scaffold`

### B1. Generator/test page — GPT-5 Codex
- `src/generator/`: `GeneratorApp.tsx` (controls left, white-bg QR panel right), `useFrameClock.ts` (4-hex-char session + New Session; seq counter; rate 1/3/5/10 Hz + paused; tick → sample channels → `encodeFrame`), `patterns.ts` (pure `(tMs, channel) => number`: constant|sine|pulse|ramp|off), `ChannelControls.tsx` (9 rows: slider 0-255 + pattern select + readout; All Zero button), `QRCanvas.tsx` (`QRCode.toCanvas`, size presets 200/300/400+custom, ECC L/M/Q/H default M, margin 4 modules, no CSS scaling). Below QR: encoded string in monospace + frame counter.
- Query modes: `?overlay=1` hides controls (future OBS browser-source overlay); `?video=1` pipes the QR canvas through `captureStream(30)` into a `<video>` element — **the extension's content-script test target** (served on localhost dev server, matched by extension dev permissions).
- Verify: 5 Hz sine visibly updates; string matches `QT1:[0-9A-F]{4}:\d+:H:[0-9A-F]{18}`; phone-scan one frame; build passes.
- Commit: `feat: add QT1 generator test page to webrtc app`

## Stage C — Extension overhaul (needs A3; parallel-safe with Stage D)

**Architecture (settled):** decode + buttplug websocket live in an **engine context** — Chrome MV3 `chrome.offscreen` document (persists past SW idle-death; SW becomes a thin router owning only offscreen lifecycle), Firefox MV2 persistent background page hosts the same Engine module directly. Content-script WASM is a dead end (isolated world inherits page CSP). Frames ship as **data-URL strings** (JSON-safe on Chrome's JSON-only messaging): ROI crops as PNG (~10-40KB @ up to 10Hz), full-frame search as JPEG q0.92 throttled to 2Hz. Message ownership rule: every onMessage listener returns undefined for types it doesn't own; owners sendResponse + return true (never rely on returning a Promise with wxt's chrome API); fire-and-forget broadcasts get `.catch(() => {})`.

### C-preflight. Extension pixel-export viability spike — GPT-5 Codex, user-assisted where real streams are needed
- Before implementing the C3 content capture loop, verify the extension content-script path can actually export pixels from real platform video: draw the page `<video>` to canvas and call `convertToBlob`/`getImageData` on Twitch live, YouTube live, and YouTube VOD in Chrome + Firefox. The localhost generator is not enough because it cannot catch cross-origin canvas tainting.
- Record findings in `plans/extension-pixel-export-findings.md`: matrix {Chrome extension, Firefox extension} × {twitch live, yt live, yt VOD} × {drawImage, convertToBlob/getImageData, performance, failure mode}.
- Gate: if any target taints or blocks pixel export, revise C3 before implementation to use an extension-owned capture backend (`tabCapture`/offscreen document where available, or `captureVisibleTab` as a lower-rate fallback) instead of assuming page-video canvas export. Content scripts then become video/page discovery + command/status glue, not the pixel source.
- Commit: `chore: record extension pixel-export viability findings`

### C0. Build config, permissions, deps — GPT-5 Codex
- wxt → ^0.20, add @wxt-dev/module-react + react/react-dom/@types. Manifest-as-function: permissions `[storage, activeTab, scripting]` + `offscreen` when chrome; MV3 object CSP / MV2 string CSP (`script-src 'self' 'wasm-unsafe-eval'; object-src 'self';`); `minimum_chrome_version: '109'`; `browser_specific_settings.gecko` (id + strict_min_version 115); no host_permissions; delete stale commented config.
- Content-script matches: `*://twitch.tv/*`, `*://*.twitch.tv/*` (fixes www bug), `*://*.youtube.com/*`, `*://localhost/*`, `*://127.0.0.1/*`. Arbitrary sites: popup "Enable on this page" → activeTab + `scripting.executeScript`.
- Verify: both builds; inspect both `.output/*/manifest.json` for the above.
- Commit: `extension: fix manifest permissions/CSP, add React module, drop dead config`

### C1. Shared contracts — lightweight GPT-5/Codex subagent if useful (fully specified)
- NEW `extension/utils/messages.ts`: `EngineRequest` union — `frame/decode {seq, dataUrl, mode: 'search'|'roi', roiOrigin}`, `tracking/started`, `tracking/stopped {reason: 'user'|'no-video'|'navigation'}`, `intiface/connect|disconnect`, `intiface/devices/get`, `haptics/set-enabled`, `status/get`; `EnsureEngineRequest {type:'engine/ensure'}`; `FrameDecodeResponse {found, boundingBox|error}`; `DeviceInfo/DeviceActuator`; `ContentCommand` (ping/start/stop); `StatusBroadcast`. Also export runtime validators/type guards for every externally-received message shape (`isEngineRequest`, `isEnsureEngineRequest`, `isContentCommand`, `isStatusBroadcast`) because Chrome extension messaging is an untyped boundary.
- NEW `utils/status.ts`: `QRTuberStatus { intiface: {state, deviceCount, address, error}, tracking: {state: idle|searching|tracking|no-video, tabId, lastDecode: {session, seq, at}|null}, hapticsEnabled, lastError }`.
- NEW `utils/settings.ts` (wxt storage items, `local:`): intifaceAddress (fallback `ws://127.0.0.1:12345`), autoConnect (true), mappingMode `'simple'|'mapped'` (simple = channel 0 → all vibrators), channelMap `(ChannelMapping|null)[9]` (`{deviceName, actuatorIndex, scale}` — keyed by device NAME, buttplug indices aren't session-stable; unresolved → silently unmapped), decodeStaleTimeoutMs (1500). 0.20 import path: `wxt/utils/storage`.
- NEW `utils/engine-client.ts`: `ensureEngine()`, `sendToEngine<T>()` (ensure-then-send, one retry), `broadcastSafe()`.
- Commit: `extension: add typed message protocol, status model, and settings storage`

### C2. Engine + background router + offscreen entrypoint — GPT-5 Codex
- NEW `lib/engine/Engine.ts` (imports only from `qrtuber`): owns QRTuberStatus; decode path = fetch(dataUrl) → findQRCode → parseFrame → decode-gate → channel mapping → adapter.applyState; staleness timer (belt over core's watchdog); watches intifaceAddress (reconnect if changed while connected); single tracking session (second tab refused via status error); status broadcasts throttled 4/s; every handler validates inbound messages with the C1 runtime guards, then try/catch → lastError + broadcast (errors stop being console.log here).
- NEW `lib/engine/decode-gate.ts`, `lib/engine/channel-mapping.ts` — pure functions (`resolveOutputs(state, map, devices, mode)`), unit-testable.
- NEW `entrypoints/offscreen/` (html has `<meta name="manifest.include" content="['chrome']">`): instantiates Engine.
- REWRITE `background.ts`: Chrome — owns `engine/ensure` only (`chrome.offscreen.createDocument({url:'/offscreen.html', reasons:['WORKERS'], justification:'Runs WebAssembly QR decoding and maintains the local Intiface device WebSocket'})`, guarded by getContexts check + in-flight dedupe). Firefox (`import.meta.env.FIREFOX`) — Engine runs inline.
- Verify: SW console → ensure + status/get round-trip; offscreen doc visible in inspect views; connect Intiface, kill SW in chrome://serviceworker-internals, websocket survives 5+ min; Firefox via about:debugging.
- Commit: `extension: add engine context (offscreen/background page) hosting decode and intiface`

### C3. Content script rework — GPT-5 Codex
- REWRITE `content.ts` (owns ContentCommand only; validates messages with C1 guards; `ctx.onInvalidated` → stop('navigation')) + NEW `lib/content/TrackingController.ts`: wraps core ContentVideoHandler (largest visible `<video>`) if C-preflight proves page-video pixel export works; capture → `convertToBlob` (PNG roi / JPEG 0.92 search) → FileReader dataURL → `sendToEngine(frame/decode)` → apply response → self-schedule via `ctx.setTimeout` (100ms tracking / 500ms searching — natural backpressure, no unbounded recursion). If C-preflight selects tab-capture fallback, implement the same scheduling/decode response contract with extension-owned capture frames and keep the content script limited to page/video discovery + lifecycle commands. One AbortController for all page listeners. 5 consecutive send failures → stop + report no-video; send failure → re-ensureEngine once then surface.
- Test target: Stage B generator page in `?video=1` mode on the vite dev server (localhost match) — no separate test asset needed.
- Verify: start via SW console on generator page; status walks searching→tracking; Intiface device responds; navigate away mid-tracking → no errors, haptics zero within timeout; Firefox pass; twitch.tv www sanity check.
- Commit: `extension: rework content frame loop with data-URL shipping and teardown`

### C4. Popup (React) — GPT-5 Codex (CSS purge: lightweight GPT-5/Codex subagent if useful)
- REPLACE popup: `App.tsx` → ErrorBanner (dismissible lastError) / ConnectionCard (status dot, device count, address readout, Connect/Disconnect, gear → openOptionsPage) / TrackingCard (state label incl. no-video; Start/Stop; "Enable on this page" when ping fails; master haptics toggle) / DecodeIndicator (session/seq + age: green <1s, amber <3s, red stale). Hooks: `useEngineStatus` (ensure → status/get → subscribe status/update), `useActiveTab` (ping → hasContentScript; inject via scripting.executeScript). Kill all starter CSS; 320px compact layout.
- Verify (mouse-only loop, both browsers): Enable → Connect → Start → tracking + decode age ticking → haptics toggle stops device → Stop. Kill Intiface mid-session → error banner.
- Commit: `extension: React popup with status, tracking, and connection controls`

### C5. Options page (React) — GPT-5 Codex
- NEW `entrypoints/options/`: AddressForm (validate `^wss?://`, autoConnect, decodeStaleTimeoutMs), ChannelMapTable (mappingMode radio; mapped → 9 rows: device select from `intiface/devices/get` + Refresh-needs-connection hint, actuator select, scale slider 0-1). wxt auto-registers options_ui.
- Verify: map channel 1 → device B only; drive generator hot on ch1 → only B moves; browser restart persists; unplugged device shows unresolved without throwing.
- Commit: `extension: options page with intiface address and channel mapping`

### C6. Tests + docs + polish — lightweight GPT-5/Codex subagent for tests-from-spec if useful / GPT-5 Codex for README
- Vitest via wxt 0.20 `WxtVitest` plugin, ONLY for pure logic: decode-gate, channel-mapping, message runtime validators/type guards. Add `test` script. NEW extension/README.md (dev workflow: compile core first, generator-page testing, load steps, permissions rationale, and the C-preflight capture backend decision). Sweep remaining console.logs.
- Commit: `extension: vitest for pure logic, dev docs`

## Stage D — WebRTC viewer (needs A3 + B1; parallel-safe with Stage C)

### D1. Capture + decode loop + preview overlay — GPT-5 Codex
- `src/shared/browser.ts` (isFirefox; getDisplayMedia constraints w/ Chrome-only hints `selfBrowserSurface:'exclude'`, `surfaceSwitching:'include'` behind a local type extension), `src/viewer/useDisplayCapture.ts` (start/stop/track-ended cleanup), **`src/viewer/tickWorker.ts` — dedicated Web Worker setInterval ticks the decode loop; rAF/main-thread timers throttle when the viewer tab is backgrounded while the user watches the stream tab. Correctness requirement, not polish.** `useDecodeLoop.ts` (owns ContentVideoHandler w/ explicit video element + QRCodeFinder; dedupes via SequenceTracker; exposes lastFrame/hapticsState/boundingBox/stats/decodeError; full-frame overlay coords via `currentRegion` + crop-relative box). `CapturePreview.tsx` (video + scaled bounding-box overlay div), `StatusBar.tsx`, `ViewerApp.tsx` (+ Firefox notice: detach stream tab to a window, capture the window).
- Verify (canonical two-tab loop): tab1 generator @3Hz sine, tab2 viewer captures it; box tracks QR; decodesPerSec ≥ 3; **background the viewer tab 60s → seq gaps must not explode (worker-tick check)**; browser Stop-sharing → idle. Firefox window-capture pass.
- Commit: `feat: webrtc viewer capture and QT1 decode loop`

### D2. Intiface output, channel meters, emergency stop — GPT-5 Codex
- `useIntiface.ts` (wraps IntifaceHapticsAdapter; address persisted to localStorage; zero-on-timeout 2000ms), `IntifacePanel.tsx`, `ChannelMeters.tsx` (9 vertical meters, grey when stale), `EmergencyStop.tsx` (latching STOP → zero + suppress until Resume; stop-capture also zeroes). Priority: e-stop > timeout-zero > decoded state.
- Verify: meters mirror generator sliders; pause generator → grey + devices zero after 2s; e-stop mid-sine → instant stop, stays stopped through Resume; Intiface reconnect cycles clean.
- Commit: `feat: intiface output, channel meters, emergency stop in webrtc viewer`

### D3. Hosting glue — GPT-5 Codex (small)
- docs build gains pre-step: `npm run build -w qrtuber-webrtc-viewer -- --outDir ../docs/static/app --emptyOutDir`; add `docs/static/app` to gitignore. Add root `netlify.toml` so Netlify builds from the repo root with `npm run build -w qrtuber-docs` and publishes `docs/build`; otherwise the new root workspace lockfile and cross-workspace webapp prebuild can be bypassed if Netlify is still configured with `docs/` as its base directory. Navbar: fix "Browser Extension" mislink; add `{ href: '/app/', label: 'Web Viewer' }` (href not to — outside the SPA). `deploy-pages.yml`: `branches: [main]` → `[master]`, add `exclude_assets: '.docusaurus,build,static/app,node_modules'` (gh-pages stays deciduous-viewer-only; Netlify serves the site + app — user confirmed). Also fix `cleanup-decision-graphs.yml`: `--base main` → `--base master`, and replace `git add -A` with explicit staging of the discovered PNG/DOT cleanup files.
- Verify from repo root: `npm run build -w qrtuber-docs` → `docs/build/app/index.html` + `docs/build/app/generator/index.html` exist; `npm run serve -w qrtuber-docs` + two-tab loop against served build; git status clean of static/app noise; inspect `netlify.toml` for root build command and `docs/build` publish directory.
- Commit: `build: serve webrtc viewer from docs site at /app, fix pages workflow branch`

## Stage E — Userscript spike → conditional build

### E1. Spike (GPT-5 Codex writes artifacts; experiments are USER-ASSISTED — real Twitch/YouTube sessions)
Committed experiment scripts in `userscripts/spike/`:
- `e1-taint.user.js` — userscript-specific drawImage + getImageData on twitch live / youtube live / youtube VOD in page world and sandbox modes. This complements, but does not replace, C-preflight's extension content-script pixel-export check.
- `e2-decoders.user.js` — matrix: inline-WASM CSP probe, zbar-wasm scanImageData, `BarcodeDetector` presence + detect, jsQR decode + timing; run in both `@grant none` (page world) and default-grants (sandbox) modes.
- `e3-ws.user.js` — `new WebSocket('ws://127.0.0.1:12345')` from https pages (Chrome + Firefox both carve out localhost mixed-content — verify empirically).
- E4 bundle test — minimal vite-plugin-monkey build importing core; record .user.js size; Tampermonkey accepts + executes on Twitch (watch: Greasyfork 2MB limit, editor sluggishness >1MB).
- `plans/userscript-spike-findings.md` — results matrix {Chrome+TM, Firefox+VM} × {twitch live, yt live, yt VOD} × {taint, wasm, BarcodeDetector, jsQR, ws, bundle} + go/no-go. Gates: taint fails → hard no-go for that platform; only jsQR works → go iff ROI decode <50ms @1080p; all decode paths blocked → no-go; bundle >2MB → retry jsQR-only first. End-to-end live-stream validation needs qdot to OBS-stream the generator to a test Twitch channel — schedule; not needed for the gates.
- Commit: `chore: userscript viability spike scripts and findings`

### E2. Userscript v1, Twitch-first (CONDITIONAL on E1 go) — GPT-5 Codex
- NEW `userscripts/` package (add to root workspaces): vite-plugin-monkey (verify vite peer range), entry `src/main.ts` (video discovery w/ MutationObserver retry; ContentVideoHandler explicit element; decode backend behind `src/decoder.ts` per spike findings; parseFrame → SequenceTracker → adapter; zero-on-timeout + e-stop semantics identical to D2), `src/ui.ts` (shadow-DOM fixed panel: start/stop, address, status, e-stop; persistence per granted APIs), output `qrtuber.twitch.user.js` with `@match *://*.twitch.tv/*`.
- Verify: install in Tampermonkey; against test stream: panel appears, decode drives Intiface; Twitch SPA channel-nav doesn't duplicate panels/loops.
- Commit: `feat: twitch userscript viewer`

## Stage F — Docs (last; GPT-5 Codex, mechanical doc swaps may use lightweight GPT-5/Codex subagent)
- `viewers/webrtc.md` rewrite for qrtuber.com/app/ (replace external obs-qrcode-video-sync URLs; keep Chrome-tab vs Firefox-window guidance; meters/e-stop walkthrough). `viewers/userscript.md` from spike findings (or honest not-viable). `viewers/extension.md` + `viewers/index.md` (trade-off comparison). NEW `developers/protocol.md` distilled from `plans/qr-sidechannel-design.md` (QT1 syntax/field table/haptics payload/state-not-events/safety model; resequence sidebar positions). Finish truncated `quickstart.md` (streamer: OBS browser source → `/app/generator/?overlay=1`; viewer: `/app/`). `streamers/obs.md` URL swap. Docusaurus 3.6.3 → 3.10.x while in here.
- Verify: docs build (`onBrokenLinks: 'throw'` is the link checker); sidebar order spot-check.
- Commits: `docs: rewrite viewer guides for in-repo webrtc app`; `docs: add protocol page, finish quickstart and obs setup`

---

## Execution Model

- Orchestrator (GPT-5 Codex, this session): dispatches GPT-5/Codex implementation subagents only when a phase is independently scoped, reviews diffs, runs verification, makes commits, logs deciduous nodes (goal → options → decision → actions → outcomes) and links commits with `--commit HEAD`.
- Implementers: **GPT-5 Codex** default. Use lightweight GPT-5/Codex subagents where marked for mechanical or fully-specified work (C1 schemas, C4 CSS purge, C6 tests-from-spec, A3 consumer files, F mechanical swaps).
- Every phase = one commit, staged file-by-file. RED-GREEN for bug-fix tests where applicable (revert fix → test fails → restore → passes).
- Stage order: A0→A1→A2→A3 → B0→B1 → C-preflight before C0/C3 → C and D in either order (independent after C-preflight) → E → F. B0/B1 may run after A1 (only need protocol encode/parse).

## End-to-End Verification

1. Core: `npm test -w qrtuber` (protocol + adapter + bbox suites green).
2. Generator two-tab loop (canonical): generator tab @3Hz sine → viewer tab captures → meters mirror sliders → Intiface Central device responds; pause → zeros in 2s; e-stop honoured.
3. Extension loop: generator `?video=1` on localhost dev server → popup Enable/Connect/Start → tracking status + decode age live → device responds → SPA-nav teardown clean. Chrome + Firefox.
4. Hosting: docs build serves `/app/` + `/app/generator/`; served build passes the two-tab loop.
5. Spike: findings matrix complete; go/no-go recorded; if go, userscript passes the test-stream check.
6. Real-world validation (qdot-assisted, post-plan): OBS-stream the generator overlay to a test Twitch channel; verify extension + webrtc app + (if built) userscript decode from the live stream and a VOD.

## Risks

- **buttplug 5.x API drift**: adapter typed against local ButtplugClientLike; one assignment site to fix; qdot adjudicates.
- **vite × zbar/buttplug/ws resolution** (documented prior pain): B0 smoke test surfaces it before UI investment; vendored-cjs escape hatch retained.
- **Offscreen `reasons` enum has no honest WASM/WebSocket fit** (`WORKERS` + truthful justification = store-review risk). Fallback: SW-hosted engine w/ websocket-activity keepalive (Chrome 116+); message protocol is transport-agnostic so the swap touches background.ts/offscreen only.
- **Frame shipping size** on 1440p/4K search frames: mitigated by 2Hz search cadence; constants tunable in TrackingController; downscale-then-confirm if profiling demands.
- **Workspace hoisting version skew** (docs react vs webrtc react 19): A0 gates on docs typecheck; fallback = align or temporarily drop webrtc from workspaces.
- **wxt 0.20 / node 24 latest-stable choice** (user-directed): import paths verified against installed docs at C0/C1; fall back is documented 0.19 idioms if 0.20 surprises.
- **Spike needs qdot** for real platform sessions + a test stream — schedule around it; gates don't block other stages.
- **Multiple QR codes in frame**: `symbols[0]` taken blindly (decoy risk). Follow-up: prefer the symbol whose payload parses as a valid QT1 frame.

## Follow-ups (explicitly out of scope this round)

- Replace abandoned @undecaf/zbar-wasm with `barcode-detector` polyfill (zxing-wasm) behind `visual/types.ts` — likely deletes the vendored-cjs escape hatch too.
- Real CI (build + test workflow for core/extension/webrtc).
- Visual validation harness measurements (design-doc Milestone 4 metrics: decode success rates across platform encodes/VODs at various sizes/rates).
- Alternate visual codecs (Data Matrix/Aztec/fiducial hybrid) — blocked on QR baseline measurements.

## Plan Archival

This plan already lives in the repo at `plans/fill-in-the-rest-implementation.md`. On approval, keep it tracked with the implementation branch before Stage A begins.
