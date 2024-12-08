---
sidebar_position: 3
---

# Using the In-Browser WebRTC System


- Install [Intiface Central](https://intiface.com/central)
  - If you're not familiar with how to use Intiface Central, check out the [Intiface Central Quickstart](https://docs.intiface.com/docs/intiface-central/quickstart)
- Start the Intiface Central Server
  - It's recommended you also get any devices connected during this step, using the `Devices` tab in
    Intiface Central.
- In a web browser tab, open the streamer's page on whatever service they are using
- In another tab, open https://qdot.github.io/obs-qrcode-video-sync/qrcodetracker
  - You should see _QRCode Tracking Client connected_ in the Intiface Central status UI.
- The next step depends on which browser you're using
  - On Chrome
    - Click on the Start Capture button, and select the tab with the stream you are watching
  - On Firefox
    - Detach the stream tab into its own window
    - Click on the Start Capture button, and select the window with the stream tab in it
- Any updates to the QRCode should cause any connected devices in Intiface Central to react