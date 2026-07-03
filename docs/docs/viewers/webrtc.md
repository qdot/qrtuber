---
sidebar_position: 3
---

# Web Viewer and Device Mode

The web viewer runs in your browser at https://qrtuber.com/app/. It captures the stream video, decodes the QRTuber QR overlay, and sends haptic state to Intiface Central on your machine.

The same app also has Device mode at https://qrtuber.com/app/device/. It acts as a Lovense-compatible Intiface Central websocket device and turns Intiface commands into QT1 QR codes that can be used as a stream source.

Use this when you want to try QRTuber without installing the browser extension.

## Requirements

- [Intiface Central](https://intiface.com/central), with the server running.
- A browser that supports screen or tab capture.
- A stream that includes a QRTuber generator overlay, such as https://qrtuber.com/app/generator/.

The default viewer Intiface address is `ws://127.0.0.1:12345`.

## Setup

1. Start Intiface Central and connect your devices.
2. Open the stream you want to watch.
3. Open https://qrtuber.com/app/ in another tab.
4. Confirm the Intiface address, then select **Connect**.
5. Select **Start capture** and choose the stream source from the browser picker.

Browser capture differs by browser:

- **Chrome/Chromium:** choose the stream tab directly from the capture picker.
- **Firefox:** detach the stream into its own browser window, then capture that window. Firefox tab capture is less reliable for this workflow.

When capture is active, the preview shows the captured video and a bounding box when the QR code is found.

## Reading the Viewer

The status area reports decode attempts, found frames, accepted frames, duplicates, misses, and parse errors. A rising accepted-frame count means the viewer is receiving fresh QRTuber frames.

The nine channel meters show the current haptic vector:

- live values mirror the streamer's generated haptic channels;
- grey meters mean the haptics state is stale;
- stale haptics are zeroed after the viewer timeout.

Stopping capture also zeros connected devices.

## Emergency Stop

The **STOP** button is local and authoritative. It immediately zeros devices and latches the viewer into a stopped state. While stopped, newly decoded frames are ignored for haptic output.

Use **Resume** to allow haptic output again. Resume does not reconnect devices or restart capture by itself; it only clears the local stop latch.

## Device Mode

Device mode is for streamers who want another Intiface-compatible app to drive the QR overlay. It connects to Intiface Central's Device Websocket Server as a virtual Lovense-style device, then renders incoming vibration commands as QT1 frames. The QR sequence advances when a vibration command arrives, or when you manually start a new session or zero the output.

Setup:

1. In Intiface Central, enable **Device Websocket Server**.
2. Add a **Websocket Device** using protocol `lovense`. Use `qrtuber-lovense` as the websocket identifier/name, then either keep the generated device address from the web app or copy your chosen address into the app.
3. Start the engine.
4. Open https://qrtuber.com/app/device/.
5. Connect to `ws://127.0.0.1:54817`.

Use a URL like https://qrtuber.com/app/device/?overlay=1&connect=1&size=360&dark=000000&light=ffffff&id=qrtuber-lovense as the OBS browser source after the connection is working. Device mode overlay URLs support:

- `size=360` for QR size, clamped to 128-800 pixels.
- `ecc=M` for QR error correction, using `L`, `M`, `Q`, or `H`.
- `dark=000000` for the QR mark colour.
- `light=ffffff` for the QR background colour.
- `server=ws://127.0.0.1:54817` to override the Device Websocket Server address.
- `device=8A3D9FAC2A45` to override the Lovense websocket device address.
- `id=qrtuber-lovense` to override the websocket handshake identifier/name.
- `details=1` to show frame metadata under the QR code.

The normal Device mode page includes **Copy OBS URL** in the QR panel. Use it after setting the server, identifier, device address, QR size, error correction, and colour controls. The page warns when the selected colours may not scan reliably.
