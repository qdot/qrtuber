---
sidebar_position: 2
---

# OBS Setup

- Install [Intiface Central](https://intiface.com/central)
  - If you're not familiar with how to use Intiface Central, check out the [Intiface Central Quickstart](https://docs.intiface.com/docs/intiface-central/quickstart)
- In Intiface Central, set up a Websocket Device
  - Under the `App Modes` tab
    - Set `Mode` to `Engine` 
    - Turn `Show Advanced/Experimental Settings` on
    - Turn `Device Websocket Server` (under `Advanced Device Managers`) on
  - Under the `Devices` tab, scroll down to `Websocket Devices (Advanced)`. Add a device of protocol
    type `lovense` with name `LVS-Test`. 
- Start the engine by hitting the large play button on the top bar
- This step should only be done AFTER starting the engine. Open a web browser on the same machine
  that Intiface is running on, and go to https://qdot.github.io/obs-qrcode-video-sync/obsdevice/
  In Intiface Central, a new device should show as connected on the devices tab. Moving the slider
  should update the graph on the webpage. If this doesn't work, check the browser console to see
  if any errors were printed.
- Close the web browser tab with the obs-qrcode-video-sync page in it, make sure Intiface Central
  says no device is connected.
- Add a new browser source to OBS, with https://qdot.github.io/obs-qrcode-video-sync/obsdevice/ as
  the URL
- Place the QRCode on a top layer so it is not occluded