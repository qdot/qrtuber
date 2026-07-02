---
sidebar_position: 2
---

# Browser Extension

The QRTuber browser extension watches a page's video element, decodes QRTuber QR frames, and sends haptic state to Intiface Central. It is the most integrated viewer path because it can run from the page you are already watching.

## Basic Flow

1. Start Intiface Central and connect your devices.
2. Open the stream page.
3. Open the QRTuber extension popup.
4. If the popup shows **Enable on this page**, select it to inject the content script for the current tab.
5. Select **Connect** in the Intiface section.
6. Select **Start** in the Tracking section.

The popup shows connection state, device count, Intiface address, tracking state, and the most recent decoded session/sequence when frames are being read.

Use **Stop** to stop tracking the page. Use the **Haptics** toggle as a master output enable/disable while tracking continues.

## Intiface Settings

Open the extension options page from the popup gear button.

The Intiface section controls:

- **Address:** default `ws://127.0.0.1:12345`.
- **Auto-connect:** saved preference exposed in options; the normal popup flow still provides explicit **Connect** and **Disconnect** controls.
- **Decode stale timeout:** how long decoded state remains fresh before output is treated as stale.

Changing the address while connected reconnects the extension engine with the new address.

## Channel Mapping

QRTuber frames carry nine abstract haptic channels. The options page maps those channels to your local device actuators.

Mapping modes:

- **Simple:** channel 0 drives all resolved vibrators.
- **Mapped:** each channel can target a device, actuator, and scale value.

Select **Refresh** in the channel mapping panel after connecting to Intiface so the options page can list current devices. Device names are used for mapping, so unplugged or renamed devices may show as unresolved until refreshed or remapped.

## Browser Behaviour

Chrome and Firefox host the extension engine differently:

- **Chrome:** QR decoding and the Intiface WebSocket run in an offscreen extension document so they can survive service-worker idle shutdowns.
- **Firefox:** QR decoding and the Intiface WebSocket run in the persistent background context.

This is an implementation detail, but it affects troubleshooting: in Chrome, inspect the offscreen document when debugging decode or Intiface issues; in Firefox, inspect the background page.

## Limitations

The extension still depends on the browser allowing video frames to be read from the page. The current implementation is intended for pages where extension-side pixel export works, including the in-repo generator test page at https://qrtuber.com/app/generator/?video=1. Real streaming-site behaviour can vary by browser, page, DRM, and platform changes.
