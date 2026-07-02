---
sidebar_position: 2
---

# Quickstart

QRTuber sends lightweight state through a QR overlay in the stream video. Streamers add the generator overlay; viewers decode it with the web viewer or browser extension.

## For Streamers

1. Open https://qrtuber.com/app/generator/?overlay=1.
2. Add it to OBS as a browser source.
3. Keep the QR code visible in the final program output.
4. Use the generator controls at https://qrtuber.com/app/generator/ when you need to test sessions, update rates, QR size, or channel patterns.

See the [OBS setup guide](./streamers/obs.md) for the longer setup flow.

## For Viewers

The fastest test path is the web viewer:

1. Start Intiface Central and connect your devices.
2. Open the stream in one tab or window.
3. Open https://qrtuber.com/app/.
4. Connect to Intiface.
5. Start capture and select the stream source.

Chrome users should capture the stream tab. Firefox users should detach the stream into its own window and capture that window.

For a more integrated browser flow, use the [browser extension](./viewers/extension.md). The extension adds popup controls, enable-on-page tracking, Intiface settings, and channel mapping.
