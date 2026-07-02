import { useEffect, useRef, useState } from "react";
import QRCode, { type QRCodeErrorCorrectionLevel } from "qrcode";

export const QR_SIZE_PRESETS = [200, 300, 400] as const;
export const ERROR_CORRECTION_LEVELS: QRCodeErrorCorrectionLevel[] = ["L", "M", "Q", "H"];

interface QRCanvasProps {
  encoded: string;
  errorCorrectionLevel: QRCodeErrorCorrectionLevel;
  size: number;
  videoMode: boolean;
}

export function QRCanvas({
  encoded,
  errorCorrectionLevel,
  size,
  videoMode
}: QRCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return undefined;
    }

    let cancelled = false;

    QRCode.toCanvas(canvas, [{ mode: "alphanumeric", data: encoded }], {
      color: {
        dark: "#000000ff",
        light: "#ffffffff"
      },
      errorCorrectionLevel,
      margin: 4,
      width: size
    })
      .then(() => {
        if (!cancelled) {
          setRenderError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setRenderError(error instanceof Error ? error.message : "QR render failed");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [encoded, errorCorrectionLevel, size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!videoMode || canvas === null || video === null) {
      return undefined;
    }

    const stream = canvas.captureStream(30);
    video.srcObject = stream;
    void video.play();

    return () => {
      video.pause();
      video.srcObject = null;
      stream.getTracks().forEach((track) => track.stop());
    };
  }, [videoMode]);

  return (
    <div className="qr-canvas-stack">
      <canvas
        aria-label="Generated QT1 QR code"
        className="qr-canvas"
        height={size}
        ref={canvasRef}
        width={size}
      />
      {renderError === null ? null : <p className="field-error">{renderError}</p>}
      {videoMode ? (
        <video
          aria-label="Generated QR video stream"
          autoPlay
          className="qr-video"
          height={size}
          muted
          playsInline
          ref={videoRef}
          width={size}
        />
      ) : null}
    </div>
  );
}
