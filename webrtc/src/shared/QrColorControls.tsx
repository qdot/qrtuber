import { useMemo } from "react";

import { assessQrContrast } from "./qrColors.js";

interface QrColorControlsProps {
  readonly darkColor: string;
  readonly lightColor: string;
  readonly onDarkColorChange: (color: string) => void;
  readonly onLightColorChange: (color: string) => void;
}

export function QrColorControls({
  darkColor,
  lightColor,
  onDarkColorChange,
  onLightColorChange
}: QrColorControlsProps) {
  const contrast = useMemo(
    () => assessQrContrast({ darkColor, lightColor }),
    [darkColor, lightColor]
  );

  return (
    <>
      <label>
        <span>Marks</span>
        <span className="color-control">
          <input
            aria-label="QR marks colour"
            onChange={(event) => onDarkColorChange(event.currentTarget.value)}
            type="color"
            value={darkColor}
          />
          <span className="monospace color-value">{darkColor.toUpperCase()}</span>
        </span>
      </label>
      <label>
        <span>Background</span>
        <span className="color-control">
          <input
            aria-label="QR background colour"
            onChange={(event) => onLightColorChange(event.currentTarget.value)}
            type="color"
            value={lightColor}
          />
          <span className="monospace color-value">{lightColor.toUpperCase()}</span>
        </span>
      </label>
      {contrast.messages.length === 0 ? null : (
        <div className="qr-contrast-warning" role="alert">
          <strong>Scan risk</strong>
          <span>{contrast.messages.join(" ")}</span>
        </div>
      )}
    </>
  );
}
