# Update Branch Review Findings

Review of `origin/master...update` (33 commits, ~127 files), 2026-07-02. Four parallel
review passes: core/, extension/, webrtc/, and docs/infra. All test suites pass
(core 33/33, extension 8/8), typechecks clean, all three webrtc entry points build.

**Verdict: mergeable after the two major fixes below.**

## Major

### 1. Device mode starves the viewer staleness watchdog

- `webrtc/src/device/useDeviceFrameClock.ts:62` — frame (new seq) only advances when
  `frameUpdateId` changes.
- `webrtc/src/device/useLovenseWebsocketDevice.ts:196` — `frameUpdateId` only bumps on
  incoming haptics actions.

When the upstream Lovense sender sets a value once and holds it, the device QR stops
changing. The viewer's `lastDecodeAt` is only refreshed by newly-accepted new-seq frames
(`webrtc/src/viewer/useDecodeLoop.ts:151`), so after the 2s staleness timeout
(`webrtc/src/viewer/main.tsx:19`) the viewer zeroes the hardware while the vibration is
still intended.

The generator app re-emits continuously via its interval clock; the device app must do
the same. Note duplicate seqs are insufficient — dedup means duplicates do not refresh
`lastDecodeAt`. Emitters must produce fresh sequence numbers as a keepalive. This emitter
contract should also be stated explicitly in `docs/docs/developers/protocol.md`.

### 2. Extension `autoConnect` setting is non-functional

- `extension/utils/settings.ts:35` + options page read/write `local:autoConnect`.
- `Engine.#initialise()` (`extension/lib/engine/Engine.ts:125-159`) never loads it; no
  auto-connect path exists.

The options toggle silently does nothing. Either wire it into Engine initialisation or
remove the setting.

## Minor

### core/

- `core/src/adapters/IntifaceHapticsAdapter.ts:120-145` — `applyState` caches
  `#lastStateHex`/`#lastTopologySignature` before awaiting `feature.runOutput`. A
  transiently-failing actuator is never retried on repeated identical frames until the
  value changes or the watchdog fires.
- `core/src/protocol/HapticsState.ts:55-57` — `equals()` throws on a non-HapticsState
  argument instead of returning false.
- `core/test/adapters/IntifaceHapticsAdapter.test.ts` — several tests arm real-timer
  watchdogs (default 2000ms) never cleared in teardown; latent flakiness.
- Stale `core/dist/` build output references deleted `HttpForwarder`/`IntifaceClient`;
  rebuild.

### extension/

- `extension/lib/engine/Engine.ts:116-123` — failed initialisation is permanently
  memoized (`#initialisePromise` never nulled on rejection); a single storage-read
  failure bricks the Engine until context recreation.
- `extension/lib/engine/Engine.ts:72,370-379` — haptics master-off is in-memory only and
  resets to enabled when the offscreen document is rebuilt. Mitigated: connection state
  is also lost, so manual reconnect is required before any output.
- `extension/lib/engine/Engine.ts:225` — `#refreshDevices()` rebuilds the full device
  list on every accepted frame (~10fps); topology only changes on connect/disconnect.
- `extension/utils/messages.ts:139-148` — `frame/decode.dataUrl` validated only as
  non-empty string before being `fetch()`ed in the privileged Engine context; validate
  the `data:` scheme as defense-in-depth.
- `extension/lib/content/TrackingController.ts:120,144-161` — tracking binds one
  `<video>` at start and never re-evaluates; SPA soft-navigation can leave it capturing
  a detached element until error/emptied fires.
- `extension/lib/engine/channel-mapping.ts:47` — exported `resolveOutputs` is dead
  production code (only tests call it); drift from `resolveStateForAdapter` would not
  surface at runtime.

### webrtc/

- `webrtc/src/viewer/useDecodeLoop.ts:201` — `decodeRateHz` in effect deps tears down
  and rebuilds the worker on rate change, resetting decode stats and the
  SequenceTracker (one spurious accepted frame).
- `webrtc/src/device/DeviceApp.tsx:106-125` — auto-connect suppressed under
  React.StrictMode double-mount (dev only; production unaffected).
- `webrtc/src/viewer/useDecodeLoop.ts:94-96` (+ core `ContentVideoHandler`) — bounded
  object-URL churn; a burst of `updateImageData` during an in-flight decode can strand
  an unrevoked blob URL.

### docs / infra

- `docs/package.json` engines `node >=20.0` vs root `package.json` `>=24` and `.nvmrc`
  `24.18.0`; align the floor.
- `docs/docs/quickstart.md` and `docs/docs/viewers/webrtc.md` conflate the Lovense
  device *address* (`device=` URL param, random hex default) with the handshake
  *identifier* (defaults to `qrtuber-lovense`,
  `core/src/protocol/LovenseWebsocketDevice.ts:3`). Setup works; wording is imprecise.

## Verified clean

- QT1 round-trip: `encodeFrame` output always re-parses via `parseFrame`; malformed
  input cannot escape `parseFrameResult`. `docs/docs/developers/protocol.md` matches the
  implementation exactly (grammar, regexes, MAX_FRAME_LENGTH, seq bounds, worked hex
  example, sequencing model).
- Haptics safety across all consumers: emergency stop reaches hardware (`stopAll` +
  zero-state), intensity clamped at every boundary (0-255 state bytes, 0-1 adapter
  percent, Lovense 0-20), dual auto-stop layers (stale timer + adapter watchdog),
  stop-on-disconnect and unmount paths verified.
- Extension message protocol: every sent type has exactly one responder per browser
  build; no orphan senders or handlers; MV3 service-worker death absorbed by
  ensure/retry with idempotent frame decodes.
- Websocket lifecycle in `useIntiface`/`useLovenseWebsocketDevice`: operation-token
  pattern prevents stale handler clobbering; double-connect and unmount-mid-await
  handled.
- No XSS via URL params: colours regex-validated with fallback, server URLs restricted
  to ws/wss, all rendering React-escaped; OBS URL round-trips consistent between
  `obsUrl.ts` and parsers.
- Workspaces conversion coherent: globs cover all four packages; netlify.toml, GitHub
  workflows, and the nested `-w qrtuber-webrtc-viewer` docs build verified.
