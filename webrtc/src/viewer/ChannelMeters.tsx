import type { CSSProperties } from "react";

interface ChannelMetersProps {
  isStale: boolean;
  isStopped: boolean;
  values: readonly number[];
}

interface MeterStyle extends CSSProperties {
  "--meter-level": string;
}

export function ChannelMeters({ isStale, isStopped, values }: ChannelMetersProps) {
  const stateClass = isStopped ? " stopped" : isStale ? " stale" : "";

  return (
    <section className={`channel-meter-grid${stateClass}`} aria-label="Haptics channels">
      {Array.from({ length: 9 }, (_, index) => {
        const value = Math.min(255, Math.max(0, Math.round(values[index] ?? 0)));
        const style: MeterStyle = {
          "--meter-level": `${(value / 255) * 100}%`
        };

        return (
          <div className="channel-meter" key={index}>
            <span className="channel-meter-label">CH{index + 1}</span>
            <div
              aria-label={`Channel ${index + 1}`}
              aria-valuemax={255}
              aria-valuemin={0}
              aria-valuenow={value}
              className="channel-meter-track"
              role="meter"
            >
              <div className="channel-meter-fill" style={style} />
            </div>
            <span className="channel-meter-value">{value}</span>
          </div>
        );
      })}
    </section>
  );
}
