---
sidebar_position: 2
---

# OBS Setup

Use the in-repo generator as an OBS browser source:

```text
https://qrtuber.com/app/generator/?overlay=1&size=360&ecc=M&dark=000000&light=ffffff&rate=5&ch1=180:sine
```

## Add the Browser Source

1. In OBS, add a new **Browser** source.
2. Open https://qrtuber.com/app/generator/ in a normal browser tab.
3. Set the generator values you want, then select **Copy OBS URL** in the QR panel.
4. Paste the copied URL into the OBS browser source.
5. Set the source width and height to match `size`.
6. Place the source above your video layers so the QR code is not occluded.
7. Confirm the QR code is visible in the final program output.

The overlay URL hides generator controls and renders only the QR output. You can use **Copy OBS URL** whenever you change the generator's QR size, error correction, colours, update rate, or channel pattern setup.

The QR panel warns when the selected colours may not scan reliably. Keep the marks darker than the background and keep the contrast warning clear before using the URL on stream.

You can also configure OBS overlays by editing URL parameters directly:

1. Set the browser source URL to the configured overlay URL.
2. Set the source width and height to match `size`.
3. Place the source above your video layers so the QR code is not occluded.
4. Confirm the QR code is visible in the final program output.

Common parameters:

- `size=360` sets the QR size, clamped to 128-800 pixels.
- `ecc=M` sets QR error correction to `L`, `M`, `Q`, or `H`.
- `dark=000000` sets the QR mark colour.
- `light=ffffff` sets the QR background colour.
- `rate=5` sets the generator update rate to `1`, `3`, `5`, or `10` Hz. Use `rate=paused` or `paused=1` for a static frame.
- `ch1=180:sine` configures channel 1. Channels use `ch1` through `ch9`; values are 0-255 and patterns are `constant`, `sine`, `pulse`, `ramp`, or `off`.
- `details=1` shows frame metadata under the QR code. Overlay mode hides this by default.
- `video=1` also renders the QR canvas as a video element for workflows that need a media stream.

Device mode can be used when another Intiface-compatible app should drive the overlay:

```text
https://qrtuber.com/app/device/?overlay=1&connect=1&size=360&dark=000000&light=ffffff&device=qrtuber-lovense
```

Device overlay parameters include `server=ws://127.0.0.1:54817`, `device=...`, and `id=...`.
Device mode also has **Copy OBS URL** in its QR panel, using the current server, identifier, device address, QR size, error correction, and colour settings.

## Testing

For local testing, open the generator controls and the web viewer at the same time:

1. Open a configured generator URL, such as https://qrtuber.com/app/generator/?overlay=1&size=360&dark=000000&light=ffffff&rate=5&ch1=180:sine.
2. Open https://qrtuber.com/app/.
3. Start capture in the viewer and select the generator tab or window.
4. Confirm the viewer's channel meters match the generator.

Once that loop works locally, test through your actual OBS scene and streaming platform. Real stream encoding can affect QR readability, so keep the code high contrast, unobstructed, and large enough to survive the platform's transcode.
