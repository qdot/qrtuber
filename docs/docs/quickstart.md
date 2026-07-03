---
sidebar_position: 2
---

# Quickstart

QRTuber sends lightweight state through a QR overlay in the stream video. Streamers add a QR-producing source; viewers decode it with the web viewer or browser extension.

## For Streamers

1. Open https://qrtuber.com/app/generator/.
2. Set the QR size, error correction, update rate, and channel patterns you want.
3. Select **Copy OBS URL** in the QR panel.
4. Add a browser source in OBS and paste the copied URL.
5. Keep the QR code visible in the final program output.

See the [OBS setup guide](./streamers/obs.md) for the longer setup flow.

To drive QR output from Intiface commands instead, use Device mode at https://qrtuber.com/app/device/. In Intiface Central, enable **Device Websocket Server**, add a **Websocket Device** with protocol `lovense` and device address/name `qrtuber-lovense`, start the engine, then use an OBS browser source like https://qrtuber.com/app/device/?overlay=1&connect=1&size=360&device=qrtuber-lovense.

## For Viewers

The fastest test path is the web viewer:

1. Start Intiface Central and connect your devices.
2. Open the stream in one tab or window.
3. Open https://qrtuber.com/app/.
4. Connect to Intiface.
5. Start capture and select the stream source.

Chrome users should capture the stream tab. Firefox users should detach the stream into its own window and capture that window.

For a more integrated browser flow, use the [browser extension](./viewers/extension.md). The extension adds popup controls, enable-on-page tracking, Intiface settings, and channel mapping.
