---
sidebar_position: 3
---

# Web Viewer

The web viewer runs in your browser at https://qrtuber.com/app/. It captures the stream video, decodes the QRTuber QR overlay, and sends haptic state to Intiface Central on your machine.

Use this when you want to try QRTuber without installing the browser extension.

## Requirements

- [Intiface Central](https://intiface.com/central), with the server running.
- A browser that supports screen or tab capture.
- A stream that includes a QRTuber generator overlay, such as https://qrtuber.com/app/generator/.

The default Intiface address is `ws://127.0.0.1:12345`.

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
