---
sidebar_position: 2
---

# OBS Setup

Use the in-repo generator as an OBS browser source:

```text
https://qrtuber.com/app/generator/?overlay=1
```

## Add the Browser Source

1. In OBS, add a new **Browser** source.
2. Set the URL to `https://qrtuber.com/app/generator/?overlay=1`.
3. Set the source size large enough for the QR code you want to show.
4. Place the source above your video layers so the QR code is not occluded.
5. Confirm the QR code is visible in the final program output.

The overlay URL hides generator controls and renders only the QR output. Use https://qrtuber.com/app/generator/ in a normal browser tab when you need the controls.

## Testing

For local testing, open the generator controls and the web viewer at the same time:

1. Open https://qrtuber.com/app/generator/ and set a visible channel pattern.
2. Open https://qrtuber.com/app/.
3. Start capture in the viewer and select the generator tab or window.
4. Confirm the viewer's channel meters match the generator.

Once that loop works locally, test through your actual OBS scene and streaming platform. Real stream encoding can affect QR readability, so keep the code high contrast, unobstructed, and large enough to survive the platform's transcode.
