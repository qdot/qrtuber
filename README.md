# QRTuber

[![Patreon donate button](https://img.shields.io/badge/patreon-donate-yellow.svg)](https://www.patreon.com/qdot)
[![Github donate button](https://img.shields.io/badge/github-donate-ff69b4.svg)](https://www.github.com/sponsors/qdot)
[![Discord](https://img.shields.io/discord/738080600032018443.svg?logo=discord)](https://discord.gg/NsCeMNxk)

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/qdot/qrtuber/master/docs/static/img/logo-social-card.png">
  </picture>
</p>

QRTuber is a strategy for data transfer and synchronization for video streaming contexts. tl;dr show a constantly updating QR code on your twitch/youtube/fansly/of/whatever stream, and viewers can synchronize their devices (haptics, lights, etc...) with events on your stream.

## Documentation

Project documentation can be found at https://qrtuber.com

## Repo Layout

- **docs**
  - Project usage and development documentation, the content source for https://qrtuber.com
- **core**
  - Core library, code used across all project packages
- **extension**
  - Web extension for Chrome and Firefox, using [wxt](https://wxt.dev)
- **webrtc**
  - WebRTC based screen capture system, for those not wanting to install a web extension
- **userscripts**
  - Userscripts for Grease/Tampermonkey/etc.

## License

All code is BSD 3-Clause licensed. See [LICENSE.md](LICENSE.md) for more info.