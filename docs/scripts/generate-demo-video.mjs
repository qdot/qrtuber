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
const SESSION = "DEMO";
const FRAME_COUNT = DURATION_SECONDS * QR_RATE_HZ;

const docsRoot = fileURLToPath(new URL("..", import.meta.url));
const outputPath = path.join(docsRoot, "src/pages/demo/demovideo.mp4");

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

function encodePayload(frameIndex) {
  return `QT1:${SESSION}:${frameIndex}:H:${toHex(channelValues(frameIndex))}`;
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

async function renderFrame(frameIndex, tempDir) {
  const payload = encodePayload(frameIndex);
  const qrBuffer = await QRCode.toBuffer([{ mode: "alphanumeric", data: payload }], {
    color: {
      dark: "#000000ff",
      light: "#ffffffff"
    },
    errorCorrectionLevel: "M",
    margin: 4,
    type: "png",
    width: QR_SIZE
  });

  const qr = PNG.sync.read(qrBuffer);
  const frame = new PNG({ width: WIDTH, height: HEIGHT });
  const values = channelValues(frameIndex);

  fillRect(frame, 0, 0, WIDTH, HEIGHT, [7, 9, 11, 255]);
  drawBars(frame, values);
  blit(qr, frame, 800, 200);

  const fileName = `frame-${String(frameIndex).padStart(4, "0")}.png`;
  await writeFile(path.join(tempDir, fileName), PNG.sync.write(frame));
}

async function main() {
  const ffmpegProbe = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  if (ffmpegProbe.error || ffmpegProbe.status !== 0) {
    throw new Error("ffmpeg is required to generate the demo video");
  }

  const tempDir = await mkdtemp(path.join(tmpdir(), "qrtuber-demo-video-"));

  try {
    for (let index = 0; index < FRAME_COUNT; index += 1) {
      await renderFrame(index, tempDir);
    }

    const result = spawnSync(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "warning",
        "-y",
        "-framerate",
        String(QR_RATE_HZ),
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

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
