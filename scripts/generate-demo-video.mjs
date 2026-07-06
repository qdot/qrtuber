#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PNG } from "pngjs";
import QRCode from "qrcode";

const WIDTH = 1280;
const HEIGHT = 720;
const OUTPUT_FPS = 30;
const QR_RATE_HZ = 5;
const DURATION_SECONDS = 16;
const QR_SIZE = 320;
const QR_CENTER_X = 960;
const QR_CENTER_Y = 360;
const SESSION = "DEMO";
const DEMO_FRAME_COUNT = DURATION_SECONDS * QR_RATE_HZ;
const SIZE_SWEEP_PIXELS = [
  360,
  320,
  280,
  240,
  220,
  200,
  180,
  160,
  140,
  120,
  110,
  100,
  90,
  80,
  70,
  60,
  56,
  52,
  50,
  48,
  46,
  44,
  42,
  40,
  38,
  36,
  34,
  33
];
const SIZE_SWEEP_FRAME_COUNT = SIZE_SWEEP_PIXELS.length * QR_RATE_HZ;
const RATE_SWEEP_SOURCE_FPS = 30;
const RATE_SWEEP_SECONDS_PER_STEP = 3;
const RATE_SWEEP_HZ = [5, 8, 10, 12, 15, 20];
const RATE_SWEEP_STEP_FRAME_COUNT = RATE_SWEEP_SOURCE_FPS * RATE_SWEEP_SECONDS_PER_STEP;
const RATE_SWEEP_FRAME_COUNT = RATE_SWEEP_HZ.length * RATE_SWEEP_STEP_FRAME_COUNT;

const docsRoot = fileURLToPath(new URL("..", import.meta.url));
const demoVideoPath = path.join(docsRoot, "src/pages/demo/demovideo.mp4");
const sizeSweepVideoPath = path.join(docsRoot, "src/pages/demo/demovideo-size-sweep.mp4");
const rateSweepVideoPath = path.join(docsRoot, "src/pages/demo/demovideo-rate-sweep.mp4");

function clampByte(value) {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function toHex(values) {
  return values
    .map((value) => clampByte(value).toString(16).toUpperCase().padStart(2, "0"))
    .join("");
}

function channelValues(frameIndex) {
  const t = frameIndex / QR_RATE_HZ;

  return Array.from({ length: 9 }, (_, channel) => {
    const wave = (Math.sin((t / 2.4 + channel / 9) * Math.PI * 2) + 1) / 2;
    const chase = (frameIndex + channel * 2) % 18 < 5 ? 1 : 0.35;
    const value = channel === 0 ? 48 + wave * 196 : 24 + wave * 160 * chase;

    return clampByte(value);
  });
}

function encodePayload(frameIndex, extensions = []) {
  const extensionText = extensions.length === 0 ? "" : `:${extensions.join(":")}`;

  return `QT1:${SESSION}:${frameIndex}:H:${toHex(channelValues(frameIndex))}${extensionText}`;
}

function fillRect(png, x, y, width, height, colour) {
  const minX = Math.max(0, x);
  const minY = Math.max(0, y);
  const maxX = Math.min(png.width, x + width);
  const maxY = Math.min(png.height, y + height);

  for (let py = minY; py < maxY; py += 1) {
    for (let px = minX; px < maxX; px += 1) {
      const index = (py * png.width + px) * 4;
      png.data[index] = colour[0];
      png.data[index + 1] = colour[1];
      png.data[index + 2] = colour[2];
      png.data[index + 3] = colour[3] ?? 255;
    }
  }
}

function blit(source, target, targetX, targetY) {
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const destX = targetX + x;
      const destY = targetY + y;

      if (destX < 0 || destX >= target.width || destY < 0 || destY >= target.height) {
        continue;
      }

      const sourceIndex = (y * source.width + x) * 4;
      const targetIndex = (destY * target.width + destX) * 4;

      target.data[targetIndex] = source.data[sourceIndex];
      target.data[targetIndex + 1] = source.data[sourceIndex + 1];
      target.data[targetIndex + 2] = source.data[sourceIndex + 2];
      target.data[targetIndex + 3] = source.data[sourceIndex + 3];
    }
  }
}

function drawBars(png, values) {
  const x = 128;
  const y = 158;
  const width = 430;
  const height = 34;
  const gap = 14;

  values.forEach((value, index) => {
    const barY = y + index * (height + gap);
    const filled = Math.round((width * value) / 255);

    fillRect(png, x, barY, width, height, [25, 31, 35, 255]);
    fillRect(png, x, barY, filled, height, index === 0 ? [0, 186, 132, 255] : [0, 126, 184, 255]);
    fillRect(png, x, barY, width, 2, [83, 94, 101, 255]);
  });
}

async function renderFrame(frameIndex, tempDir, options = {}) {
  const qrSize = options.qrSize ?? QR_SIZE;
  const payloadFrameIndex = options.payloadFrameIndex ?? frameIndex;
  const payload = encodePayload(payloadFrameIndex, options.extensions ?? []);
  const qrBuffer = await QRCode.toBuffer([{ mode: "alphanumeric", data: payload }], {
    color: {
      dark: "#000000ff",
      light: "#ffffffff"
    },
    errorCorrectionLevel: "M",
    margin: 4,
    type: "png",
    width: qrSize
  });

  const qr = PNG.sync.read(qrBuffer);
  const frame = new PNG({ width: WIDTH, height: HEIGHT });
  const values = channelValues(payloadFrameIndex);

  fillRect(frame, 0, 0, WIDTH, HEIGHT, [7, 9, 11, 255]);
  drawBars(frame, values);
  blit(qr, frame, QR_CENTER_X - Math.round(qr.width / 2), QR_CENTER_Y - Math.round(qr.height / 2));

  const fileName = `frame-${String(frameIndex).padStart(4, "0")}.png`;
  await writeFile(path.join(tempDir, fileName), PNG.sync.write(frame));
}

async function generateVideo(outputPath, frameCount, sourceFps, getFrameOptions) {
  const tempDir = await mkdtemp(path.join(tmpdir(), "qrtuber-demo-video-"));

  try {
    for (let index = 0; index < frameCount; index += 1) {
      await renderFrame(index, tempDir, getFrameOptions(index));
    }

    const result = spawnSync(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "warning",
        "-y",
        "-framerate",
        String(sourceFps),
        "-start_number",
        "0",
        "-i",
        path.join(tempDir, "frame-%04d.png"),
        "-vf",
        `fps=${OUTPUT_FPS},format=yuv420p`,
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "slow",
        "-crf",
        "18",
        "-movflags",
        "+faststart",
        outputPath
      ],
      { stdio: "inherit" }
    );

    if (result.error || result.status !== 0) {
      throw result.error ?? new Error(`ffmpeg exited with status ${result.status}`);
    }

    console.log(`Wrote ${outputPath}`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function sizeSweepOptions(frameIndex) {
  const seconds = Math.floor(frameIndex / QR_RATE_HZ);
  const qrSize = SIZE_SWEEP_PIXELS[Math.min(seconds, SIZE_SWEEP_PIXELS.length - 1)];

  return {
    extensions: ["S", String(qrSize)],
    qrSize
  };
}

function rateSweepOptions(frameIndex) {
  const stepIndex = Math.min(
    Math.floor(frameIndex / RATE_SWEEP_STEP_FRAME_COUNT),
    RATE_SWEEP_HZ.length - 1
  );
  const rateHz = RATE_SWEEP_HZ[stepIndex];
  const frameInStep = frameIndex % RATE_SWEEP_STEP_FRAME_COUNT;
  const secondsInStep = frameInStep / RATE_SWEEP_SOURCE_FPS;
  const updatesBeforeStep = RATE_SWEEP_HZ
    .slice(0, stepIndex)
    .reduce((total, rate) => total + rate * RATE_SWEEP_SECONDS_PER_STEP, 0);
  const payloadFrameIndex = updatesBeforeStep + Math.floor(secondsInStep * rateHz);

  return {
    extensions: ["R", String(rateHz)],
    payloadFrameIndex
  };
}

async function main() {
  const ffmpegProbe = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  if (ffmpegProbe.error || ffmpegProbe.status !== 0) {
    throw new Error("ffmpeg is required to generate the demo video");
  }

  await generateVideo(demoVideoPath, DEMO_FRAME_COUNT, QR_RATE_HZ, () => ({}));
  await generateVideo(sizeSweepVideoPath, SIZE_SWEEP_FRAME_COUNT, QR_RATE_HZ, sizeSweepOptions);
  await generateVideo(rateSweepVideoPath, RATE_SWEEP_FRAME_COUNT, RATE_SWEEP_SOURCE_FPS, rateSweepOptions);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
