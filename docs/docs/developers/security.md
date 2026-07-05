---
sidebar_position: 2
---

# QRTuber Security

QRTuber is a public, opt-in, local-output video metadata system. The stream
contains QR frames, viewer software decodes those frames, and any hardware
output remains under the viewer's local controls.

The short version:

- QT1 frames are treated as untrusted public video data.
- Current QT1 v1 haptics frames carry bounded state, not executable code, URLs,
  scripts, plugins, or privileged commands.
- Future QT1 frame types and extensions must keep that boundary explicit. A
  format that tells clients to run code, load remote modules, open local files,
  launch programs, or change local configuration is a new high-risk feature, not
  a routine protocol extension.
- Streamers can choose the values broadcast in the QR overlay, but viewer
  clients decide whether to act on them, how they map to local outputs, how
  strong effects can be, and when output stops.
- A client may be a webpage, browser extension, userscript, native app, or other
  software. Its safety depends on its own code, origin, permissions, runtime,
  update path, and maintainers.

## Threat Model

QRTuber does not try to make stream data secret or authenticated. Anyone who can
see the video can read the QR frames, copy them, replay them, or generate their
own compatible frames.

That is intentional: QRTuber is designed for public stream synchronization, not
private messaging or remote administration.

| Boundary | Security stance |
| --- | --- |
| Stream video | Public and untrusted. |
| QR payload | Public and untrusted. Parse it as data, never as code. |
| QT1 protocol | Extensible data frames. Current v1 clients only use bounded `H` haptics frames. |
| Viewer client | Webpage, extension, userscript, app, or other software that validates frames and enforces local safety controls. |
| Output target | Local effect system such as haptics, lights, game input, or other integrations. The client decides whether and how to connect. |
| Third-party clients | Not automatically trusted just because they understand QRTuber frames. |

## Arbitrary Code Execution

QT1 v1 haptics does not contain an arbitrary-code-execution mechanism. A valid
QT1 haptics frame is text shaped like this:

```text
QT1:<SESSION>:<SEQ>:H:<18 HEX CHARACTERS>
```

The implemented parser rejects malformed frames, unsupported versions,
unsupported frame types, invalid payloads, malformed extension tails, and frames
longer than 256 characters. The decoded value is a nine-channel haptics vector,
not a script or command.

QT1 is designed to be extensible, so this guarantee belongs to the current
haptics format and to clients that preserve the same data-only boundary.
Unknown frame types and extension fields should be ignored unless a client has
explicit support for them. New supported fields should be length-bounded,
schema-validated, and interpreted as data.

If a future client or format adds fields that evaluate expressions, load
scripts, fetch plugins, trigger local programs, open files, or perform other
privileged actions, those fields become a new security surface. They should be
reviewed as a separate high-risk protocol feature and should require explicit
viewer opt-in.

Even without executable protocol semantics, every client implementation can have
bugs. A QR decoder, protocol parser, browser API, extension runtime, dependency,
local service bridge, or native bridge could still be vulnerable. The project
stance is:

- treat stream-provided QR text as hostile input;
- keep parser behaviour small, explicit, and covered by tests;
- avoid protocol features that require evaluating stream-provided code or
  invoking privileged local actions;
- require viewer-side opt-in before connecting to local output targets;
- fail closed on malformed or stale frames.

If you find a vulnerability in the QRTuber codebase, please report it through
the project issue tracker or the support channel listed in the docs.

## Third-Party Clients

The protocol is intentionally simple enough for other people to implement
clients. That is useful, but it also means the QRTuber project cannot guarantee
what a third-party client does after it decodes a frame.

A third-party client does not have to be something you install. It might be a
hosted webpage, a browser extension, a userscript, a desktop app, a plugin for
another tool, or a service that talks to local software. A webpage can still ask
for capture permissions, connect to local WebSocket services, or run code in
your browser context.

Be cautious with clients or setup flows that:

- ask you to paste code into a browser console;
- ask you to disable browser, extension, or operating-system security settings;
- fetch and run stream-provided code or remote plugins;
- add protocol fields that launch programs, open files, execute shell commands,
  or change local configuration;
- request broad browser extension permissions without explaining why;
- connect to local services or hardware without clear viewer controls;
- ship only as opaque binaries or hosted pages from an unknown maintainer.

A QRTuber-compatible client should be judged like any other webpage, local app,
browser extension, userscript, or integration with local capabilities. Use it
from a source you trust, review the permissions it asks for, and keep it
updated.

## Malware and Impersonation

QRTuber cannot stop someone from making malware, a malicious webpage, or a
hostile extension that claims to be a QRTuber viewer. It also cannot stop a
malicious stream from showing fake setup instructions, fake download links, or
QR-like overlays that are unrelated to the official protocol.

The QR overlay itself should not require you to change your browser security
settings, paste code into developer tools, or run an unknown one-off client
during a stream. If a streamer tells you that a specific webpage, executable,
browser extension, userscript, or plugin is required, treat that as a normal
software trust decision rather than as something QRTuber can automatically make
safe.

Use the official site and repository as the source of truth for supported viewer
paths. At the moment, the documented viewer paths are the web viewer and the
browser extension; the userscript path is a spike, not a supported viewer.

## Output Safety

QRTuber's current implementation focuses on haptics through Intiface Central,
but the protocol is meant to be more general. The same safety rule applies to
lights, game input, haptics, or any other local effect: output should remain
local, explicit, bounded, and reversible.

- viewers explicitly connect a client to any local output target;
- viewers control mapping and scaling;
- stale frames are zeroed;
- stop controls should immediately stop or zero output;
- malformed frames should be no-ops.

Streamers control what values they broadcast. Viewers control whether those
values reach local outputs.

## Privacy

QRTuber QR frames are visible in the stream and should be assumed public. Do not
put secrets, tokens, private user IDs, local network details, or anything that
must remain confidential into QR payloads.

Viewer clients may connect to local services such as Intiface Central or future
output systems. Those local connections are separate from the stream QR data,
and clients should keep them under explicit viewer control.

## Reporting Security Issues

For suspected security issues, report with:

- the affected client or package;
- the browser and operating system, if relevant;
- a minimal QR payload or stream scenario that demonstrates the issue;
- whether local output, local file/process access, or browser privileges
  are involved.

Avoid posting working exploit details publicly until the issue has been
understood and patched.
