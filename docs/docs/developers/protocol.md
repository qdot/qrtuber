---
sidebar_position: 2
---

# QT1 Protocol

QT1 is QRTuber's first text protocol for stream-embedded visual metadata. It is designed for QR Code alphanumeric mode, public video transport, and lossy frame delivery.

The protocol describes current state. It does not send privileged commands, secrets, or reliable one-shot events.

## Frame Syntax

```text
QT1:<SESSION>:<SEQ>:<TYPE>:<PAYLOAD>[:<KEY>:<VALUE>...]
```

Example haptics frame:

```text
QT1:A7F2:18422:H:00FF4080A010203040
```

QT1 frames use only QR alphanumeric characters:

```text
0-9 A-Z SPACE $ % * + - . / :
```

Implemented parser constraints:

| Field | Meaning | Constraint |
| --- | --- | --- |
| `QT1` | Protocol version | Exact uppercase version string. |
| `SESSION` | Stream/generator session | `1-8` uppercase alphanumeric characters. |
| `SEQ` | Sequence number | Unsigned 32-bit decimal integer. Leading zeroes are accepted. |
| `TYPE` | Frame type | `H` for haptics in v1. Unknown types are ignored/rejected by v1 clients. |
| `PAYLOAD` | Type-specific data | For `H`, exactly 18 uppercase hex characters. |
| Extension tail | Optional future fields | Repeating `:<KEY>:<VALUE>` pairs. Keys are single uppercase letters and values are non-empty alphanumeric-compatible strings. |

Frames longer than 256 characters are rejected.

## Haptics Payload

`H` frames carry a complete nine-channel haptics vector. Each channel is one unsigned byte, encoded as uppercase hex.

```text
00FF4080A010203040
```

Decoded:

| Channel | Hex | Decimal |
| --- | --- | ---: |
| 0 | `00` | 0 |
| 1 | `FF` | 255 |
| 2 | `40` | 64 |
| 3 | `80` | 128 |
| 4 | `A0` | 160 |
| 5 | `10` | 16 |
| 6 | `20` | 32 |
| 7 | `30` | 48 |
| 8 | `40` | 64 |

Channels are abstract. A frame does not name a physical device, motor, or body location. Viewer clients map the nine abstract channels to local devices, actuators, scales, and safety preferences.

An all-zero vector means haptics off.

## State, Not Events

Each haptics frame contains the full current state. Clients should replace their local haptics state with the newest accepted frame, not apply deltas.

This makes missed frames tolerable:

- missing one frame does not leave a pulse permanently active;
- the next decoded frame restores the complete current state;
- duplicate sequence numbers can be ignored;
- all-zero frames have obvious semantics.

Event-style effects can be added later, but they need explicit repeat windows, TTLs, or other loss-tolerant rules. QT1 v1 intentionally avoids that.

## Sequencing Model

`SESSION` and `SEQ` provide lightweight duplicate suppression and restart handling.

Viewer clients should accept:

- the first valid frame they see;
- a frame from a new session;
- a same-session frame with a different sequence number.

Viewer clients should ignore:

- exact duplicate frames for the same session and sequence;
- malformed frames;
- unsupported versions or frame types.

The sequence number is not a security boundary and does not need to be contiguous. Clients should not require every sequence number to arrive.

## Safety Model

QT1 frames are public, untrusted video data. Viewer-side safety remains local and authoritative.

Viewer clients should:

- require explicit viewer opt-in before connecting to devices;
- clamp and scale output to local preferences;
- stop output when frames become stale;
- expose a local emergency stop or haptics disable control;
- treat malformed frames as no-op;
- avoid putting secrets or privileged operations in protocol payloads.

QRTuber synchronizes lightweight local effects with the video timeline. It is not a secure control channel.
