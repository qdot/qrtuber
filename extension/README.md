# QRTuber Extension

## Development

Build the core package before typechecking or running the extension:

```sh
npm run compile -w qrtuber
npm run compile -w qrtuber-extension
npm test -w qrtuber-extension
```

Use the WebRTC generator as the local capture target:

```sh
npm run dev -w qrtuber-webrtc-viewer -- --host 127.0.0.1
```

Open `/app/generator/?video=1`, load the unpacked extension from
`extension/.output/chrome-mv3` or `extension/.output/firefox-mv2`, then use the
popup to enable the content script, connect Intiface, and start tracking.

## Permissions

The extension uses `storage` for settings, `activeTab` and `scripting` for
explicit per-page enablement, and Chrome `offscreen` for the engine document
that keeps QR decoding and the local Intiface WebSocket out of the service
worker lifetime. Firefox uses its persistent background page instead.

Content scripts are registered for Twitch, YouTube, localhost, and 127.0.0.1.
Other pages are opt-in through the popup.

## Capture Backend

The Stage C preflight recorded page-video pixel export as viable for the target
Chrome and Firefox paths. The content script therefore discovers the largest
visible video, captures frames with `ContentVideoHandler`, converts the captured
blob to a data URL, and sends that JSON-safe payload to the engine context.
If a platform starts tainting page-video canvas reads, replace
`TrackingController` with an extension-owned capture backend while preserving
the `frame/decode` message contract.
