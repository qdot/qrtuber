# QRTuber QR/Visual Sidechannel Design

## Status

Draft design note for validating and evolving QRTuber's core idea: video-embedded visual metadata for lightweight viewer-side effects.

This document captures the current concept, design assumptions, validation risks, a proposed protocol shape, and how the design fits the current codebase.

## Summary

QRTuber uses a visual code composited into a streamer's video as an in-band metadata channel. The first implementation uses QR codes, but the semantic protocol should be independent of QR so future visual codecs can be evaluated without changing the meaning of messages.

The intended channel is:

- public
- low-bandwidth
- lossy-tolerant
- in-band with the video timeline
- opt-in on the viewer side
- suitable for small effects such as haptics, lights, or simple synchronized state

It is not intended to be:

- a secure communication protocol
- a secret-bearing channel
- bidirectional communication
- a general-purpose high-bandwidth data layer
- a wall-clock low-latency command channel independent of video

The strongest framing is:

> QRTuber is a video-embedded metadata channel for synchronizing lightweight viewer-side effects with streamer-controlled state, requiring no platform integration.

## Core Concept

A streamer renders a visual code into their video output before the video is encoded and sent to Twitch, YouTube, or another platform. Viewers decode that visual code from the received video and use the decoded metadata to drive local effects.

Conceptual flow:

```text
Streamer state source
  -> QRTuber protocol frame
  -> visual encoder, initially QR
  -> OBS/browser/video composition
  -> streaming platform encode/transcode/VOD
  -> viewer video playback
  -> visual decoder, initially QR
  -> QRTuber protocol parser
  -> local effect adapters
```

Because the visual code is composited into the streamer's video, platform/network latency applies equally to the visible scene and the metadata. The QR signal should therefore be treated as in-band timeline metadata, not out-of-band realtime control.

The remaining timing concern is local decode/action delay after a frame is available to the viewer client:

```text
video frame available
  -> frame capture
  -> visual decode
  -> protocol parse
  -> local effect update
```

Initial tests suggest localized code decoding can resolve in under 50 ms once the code position is known. Full 4K scans to find the code can take 300+ ms, so decoder architecture should avoid full-frame scans during normal operation.

## Assumptions and Constraints

### In-band timeline semantics

The protocol should describe state at the stream/video timeline position where the visual code appears. It does not need to compensate for Twitch/YouTube platform latency as if it were separate from the video.

### Public, untrusted input

The visual channel is public. Anyone watching the stream can decode it. Viewer clients must treat decoded frames as untrusted input.

The v1 threat model is intentionally modest:

- small opt-in effects only
- no secrets in payloads
- no privileged remote control
- local clients clamp/scalemap output
- local emergency stop/disconnect remains authoritative

Spoofing is not a protocol-security blocker for v1. It is primarily an abuse/UX resilience concern.

### Low bandwidth

The channel should assume small payloads. Payload size directly affects visual code size, readability, update rate, and aesthetic cost.

### Loss tolerance

Viewer clients may miss frames due to compression artifacts, decode failures, CPU load, page visibility, resizing, or temporary occlusion. The protocol should recover cleanly from missed frames.

### Target update rate

The initial target update rate is approximately 3-10 Hz. Higher rates may be limited by video compression and visual-code stability.

### VOD preservation

Because the visual code is part of the video, successful live readability may also preserve metadata in platform VODs and archived recordings. This is a major benefit of the approach, but it should be empirically validated.

## Validation Questions

The most important early validation work is empirical rather than architectural.

### 1. Minimum viable visual size

How small can the code be after real platform encoding/transcoding and still decode reliably?

Test dimensions:

- Twitch live
- YouTube live
- Twitch VOD
- YouTube VOD
- local recording baseline
- 720p, 1080p, 1440p/4K where relevant
- low/medium/high bitrate
- multiple code sizes as a percentage of frame

### 2. Dynamic update readability

Static code readability may not predict dynamic readability. A rapidly changing QR region may be compressed differently from a static code.

Test update rates:

- static
- 1 Hz
- 3 Hz
- 5 Hz
- 10 Hz
- above 10 Hz only as a stress test

### 3. Visual acceptability

Streamers decide whether the overlay is acceptable. QRTuber should provide options, but the product cannot assume all streamers will tolerate a large visible QR code.

Useful configuration:

- overlay size
- position
- quiet zone/margin
- contrast mode
- debug mode
- visual codec choice later

### 4. Decoder cost

Decoder architecture should optimize for localized scanning.

Suggested state machine:

```text
SEARCHING
  scan full frame or coarse grid
  if found -> TRACKING

TRACKING
  scan known bounding box + margin
  if found -> update ROI
  if missed N times -> WIDENING

WIDENING
  scan expanded region
  if found -> TRACKING
  if missed M times -> SEARCHING
```

### 5. Payload/protocol expressiveness

The first use case is translating haptic state across a stream, but the protocol should remain extensible for lights, avatar state, simple events, or other viewer-side effects.

## Visual Code Strategy

QRTuber should separate the semantic protocol from the visual codec.

```text
QRTuber protocol
  defines message semantics

Visual codec
  defines how protocol bytes/text appear in video
```

The first implementation can use QR because it is mature and easy to decode, but the project should not name all internal abstractions as if QR is the only possible carrier.

### QR Code

Pros:

- mature
- widely understood
- robust error correction
- browser/WASM decoder support exists
- good baseline for validation

Cons:

- visually loud
- needs quiet zone
- high-frequency square pattern may suffer under streaming compression
- payload changes can alter much of the code each frame

Recommendation: use QR as the baseline v1 visual codec.

### Data Matrix

Potentially more compact for some payloads and less culturally tied to URL scanning, but browser decoder support and real streaming behavior need investigation.

### Aztec Code

Potentially attractive because it can be more compact and may need less quiet-zone handling, but browser decoder support must be verified.

### Fiducial/custom hybrid

A future codec could combine a stable locator/fiducial with a small fixed-layout data field. This may be easier for video compression than a constantly changing QR matrix.

Potential benefits:

- stable locator improves ROI tracking
- fewer changing pixels per update
- more aesthetic integration
- format can be tuned to exactly the payload size needed

Risk: custom visual codes require more design, implementation, and validation than QR.

## Protocol Design Goals

The protocol should be:

- compact
- versioned
- extensible
- state-oriented
- resilient to missed frames
- independent of the visual codec
- safe to parse as untrusted public input
- easy to debug during early experiments

## State vs Events

The base protocol should publish current state rather than one-shot commands.

Preferred:

```text
current haptic vector = [0, 255, 64, ...]
```

Riskier:

```text
fire pulse now
increase intensity
stop pulse
```

State frames are more robust. If a viewer misses a frame, the next decoded frame replaces the full state.

Events can be added later with TTLs, repeat windows, or stateful representation, but v1 should not depend on every visual frame being received.

## Proposed V1 Text Frame

For early validation, use a compact text format that is still debuggable:

```text
QT1|s=<session>|q=<seq>|h=<hex-vector>
```

Example:

```text
QT1|s=A7F2|q=18422|h=00ff4080a010203040
```

Fields:

- `QT1`: QRTuber protocol version 1
- `s`: short session ID, not security-sensitive
- `q`: sequence number
- `h`: haptics channel vector encoded as hex bytes

Optional future fields:

- `t`: stream/session timeline tick or timestamp
- `ttl`: validity duration
- `c`: channel/type, if multiple top-level channel types share one frame grammar
- `x`: checksum, if false positives or corruption appear in practice

This text format is not necessarily the final representation. It is a good v1 validation format because it is compact enough and human-inspectable.

## Haptics V1

The haptics use case needs multichannel output, likely up to 8-9 independent channels, each with an 8-bit range.

Recommended v1 semantic model:

```text
haptics = fixed 9-channel vector
channel value = unsigned 8-bit integer, 0-255
```

A 9-channel vector is only 9 bytes of raw data:

```text
9 channels * 8 bits = 72 bits = 9 bytes
```

Hex encoding produces 18 characters, which is acceptable for v1 QR experiments.

Example:

```text
h=00ff4080a010203040
```

Decoded:

```text
channel 0 = 0x00 = 0
channel 1 = 0xff = 255
channel 2 = 0x40 = 64
channel 3 = 0x80 = 128
channel 4 = 0xa0 = 160
channel 5 = 0x10 = 16
channel 6 = 0x20 = 32
channel 7 = 0x30 = 48
channel 8 = 0x40 = 64
```

### Abstract channels, not physical devices

The protocol should publish abstract haptic channels rather than directly naming physical motors or devices.

Good:

```text
haptic channel 0 = 120
haptic channel 1 = 200
```

Avoid:

```text
left vibrator = 120
right vibrator = 200
toy motor 3 = 80
```

Viewer clients/adapters map abstract channels to local hardware. This supports:

- single-device users
- multi-motor devices
- multiple devices
- gamepad rumble
- user remapping
- accessibility preferences
- device-specific clamping/scaling

### Complete vector per frame

Each haptics frame should contain the complete current haptic vector. Do not encode deltas in v1.

Benefits:

- missed frames are safe
- parsing is simple
- viewer state recovers immediately on the next frame
- all-zero vector clearly means off

### Binary or denser encoding later

If payload size becomes critical, the vector can move from hex to a denser encoding such as Base64URL or a binary frame carried by a visual codec that supports byte payloads.

For v1, hex is preferred for debuggability.

## Safety Model

Viewer-side safety remains local.

Minimum client behavior:

- clamp channel values to local safe ranges
- allow global disable/emergency stop
- require explicit viewer opt-in
- treat malformed frames as no-op
- ignore unsupported protocol versions
- rate-limit or smooth abrupt changes if desired by the local user

## Current Codebase Fit

The current repository already contains pieces of this design, but the code is still QR/haptics-specific and should be separated into clearer layers.

### Existing aligned pieces

- `core/src/QRCodeFinder.ts` already decodes QR codes from image data and returns a bounding box.
- `core/src/ContentVideoHandler.ts` already has the right broad idea for ROI localization: it starts with the full video and then tracks around the detected QR bounding box.
- `core/src/IntifaceClient.ts` already provides an initial local effect adapter for haptics through Intiface/Buttplug.
- `extension/entrypoints/content.ts` and `extension/entrypoints/background.ts` already form a content-script/background decode loop.
- The root README already frames QRTuber as data transfer/synchronization through video streaming contexts.

### Main gaps

#### QR decoding currently parses haptic commands directly

`QRCodeFinder.findQRCode()` currently decodes the QR payload, parses it as a speed command, emits an Intiface-style message, and returns that message.

Current behavior is effectively:

```text
QR decode -> parse speed -> intiface command
```

The design calls for:

```text
visual decode -> raw payload -> QRTuber protocol parse -> typed state -> adapter mapping
```

Recommended split:

- `VisualCodeFinder` / `QRCodeFinder`: returns raw decoded text/bytes and bounding box
- `QRTuberFrameParser`: parses `QT1|...` frames
- `HapticsState`: represents a 9-byte abstract channel vector
- `IntifaceAdapter`: maps `HapticsState` to local devices

#### Current haptics are single-channel scalar

`IntifaceClient.detectionEventHandler()` currently looks for:

```text
intiface_command = speed
speed = number
```

The design requires up to 9 abstract 8-bit channels. The adapter should accept a haptic vector and map it to available device vibration features.

#### Naming is QR-specific

Current names such as `QRCodeFinder`, `QRCodeFinderResult`, and `hasFoundQRCode` are fine for the current implementation, but the broader design should allow visual codecs beyond QR.

Potential approach:

- keep `QRCodeFinder` as the QR-specific codec implementation
- add generic interfaces/types such as `VisualCodeDecoder`, `VisualDecodeResult`, or `VisualFrameSource`

#### Protocol layer does not exist yet

There is no explicit QRTuber protocol parser/encoder layer. This should be added before extending haptics further.

Suggested files:

```text
core/src/protocol/QRTuberFrame.ts
core/src/protocol/HapticsState.ts
core/src/protocol/parseFrame.ts
core/src/protocol/encodeFrame.ts
core/src/visual/QRCodeDecoder.ts
core/src/adapters/IntifaceHapticsAdapter.ts
```

Exact paths can be adjusted to match project style.

#### Encoder/generator side is not represented yet

The current codebase mostly covers viewer-side detection and Intiface output. To validate the full concept, the repo also needs a way to generate visual frames from protocol state.

Potential additions:

- a simple browser/OBS overlay generator
- a test page that updates QR codes at 1/3/5/10 Hz
- recorded test assets for decode validation

## Suggested Next Milestones

### Milestone 1: Protocol parser/encoder in core

Implement and test:

- parse `QT1|s=A7F2|q=18422|h=00ff4080a010203040`
- validate malformed frames
- represent 9-channel haptic vectors
- encode frames for generator tests

### Milestone 2: Refactor QR decoder to return raw payload

Change QR decode output from an Intiface-specific message to:

```text
{ payload: string, boundingBox: ... }
```

Then parse the payload separately.

### Milestone 3: Multichannel haptics adapter

Map 9 abstract channels to Buttplug/Intiface devices. Start with simple behavior, then add user mapping later.

### Milestone 4: Visual validation harness

Build a simple generator and measurement loop:

- generate QR frames at target update rates
- render at configurable sizes
- record/stream through test environments
- decode from playback
- measure success rate and decode latency

### Milestone 5: Evaluate alternate visual codecs

Only after the QR baseline is measured, compare Data Matrix, Aztec, or a custom fixed-layout code if QR is too large, ugly, or compression-sensitive.

## Open Questions

- What minimum decode success rate is acceptable for haptics at 3 Hz, 5 Hz, and 10 Hz?
- Should sequence numbers count visual frames, state changes, or protocol frames?
- Should `t` be milliseconds since session start, stream frame count, beat tick, or omitted for v1?
- Should haptic channels default to zero on missing/invalid frames, or should the client hold last state for a timeout?
- What local timeout should force haptics to zero if no valid frames are decoded?
- How should abstract haptic channels map to Buttplug devices by default?
- Is fixed 9-channel haptics enough, or should v1 include a channel count for future expansion?

## Recommendation

Proceed with QR as the first visual codec, but implement the core protocol as visual-code-agnostic.

For v1, use compact state frames with a fixed 9-byte haptics vector:

```text
QT1|s=A7F2|q=18422|h=00ff4080a010203040
```

This design is small enough for QR validation, robust to missed frames, easy to debug, and extensible beyond the initial haptics use case.
