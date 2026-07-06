---
sidebar_position: 2
---

# Quickstart

QRTuber sends lightweight state through a QR overlay in the stream video. Streamers add a QR-producing source; viewers decode it with the web viewer or browser extension.

## For Streamers

1. Open https://qrtuber.com/app/generator/.
2. Set the QR size, error correction, colours, update rate, and channel patterns you want.
3. Select **Copy OBS URL** in the QR panel.
4. Add a browser source in OBS and paste the copied URL.
5. Keep the QR code visible in the final program output.

See the [OBS setup guide](./streamers/obs.md) for the longer setup flow.

To drive QR output from Intiface commands instead, use Device mode at https://qrtuber.com/app/device/. In Intiface Central, enable **Device Websocket Server**, add a **Websocket Device** with protocol `lovense`. Use `qrtuber-lovense` as the websocket identifier/name and either keep the generated device address from the app or pass your chosen address with `device=` in the OBS URL. Start the engine, then use an OBS browser source like https://qrtuber.com/app/device/?overlay=1&connect=1&size=360&dark=000000&light=ffffff&id=qrtuber-lovense.

## For Viewers

The fastest test path is the web viewer with a rumble-capable gamepad:

1. Connect a controller and press a button so the browser can see it.
2. Open the stream in one tab or window.
3. Open https://qrtuber.com/app/.
4. In the Gamepad section, select **Scan**, press a controller button while the scan is active, then select **Enable**.
5. Start capture and select the stream source.

Chrome users should capture the stream tab. Firefox users should detach the stream into its own window and capture that window.

For Intiface-compatible devices, start Intiface Central, connect your devices, then select **Connect** in the viewer's Intiface section instead of using Gamepad output.

For a more integrated browser flow, use the [browser extension](./viewers/extension.md). The extension adds popup controls, enable-on-page tracking, Intiface settings, and channel mapping.
