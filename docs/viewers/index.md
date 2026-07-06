---
sidebar_position: 1
---

# Viewer Overview

QRTuber has two usable viewer paths today: the browser extension and the web viewer. The userscript path is still a spike, not a supported viewer.

| Viewer | Status | Best fit | Tradeoffs |
| --- | --- | --- | --- |
| [Browser extension](./extension.md) | Implemented | Watching a supported page directly in the browser | Most integrated; supports popup/options and channel mapping; depends on extension pixel access to the page video. |
| [Web viewer](./webrtc.md) | Implemented | Quick testing, demos, gamepad rumble, and browser capture workflows | No extension install; requires manual tab/window capture; Gamepad haptics support varies by browser and controller. |
| [Userscript](./userscript.md) | Spike only | Future fallback if the browser matrix passes | No v1 viewer exists; Stage E2 is pending/no-go until real Twitch/YouTube validation passes. |

All current viewers consume the same [QT1 protocol](../developers/protocol.md): a stream-embedded state frame, not an out-of-band command channel.

For trust boundaries, third-party client concerns, and malware-risk framing, see
the [QRTuber security notes](../developers/security.md).

For a first test, use the web viewer at https://qrtuber.com/app/ with the generator at https://qrtuber.com/app/generator/.
