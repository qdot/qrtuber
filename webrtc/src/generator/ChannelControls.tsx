import {
  CHANNEL_COUNT,
  PATTERN_NAMES,
  type ChannelConfig,
  type PatternName
} from "./patterns.js";

interface ChannelControlsProps {
  channels: ChannelConfig[];
  currentValues: readonly number[];
  onAllZero: () => void;
  onChannelChange: (index: number, channel: ChannelConfig) => void;
}

function formatChannelName(index: number): string {
  return `CH${index + 1}`;
}

export function ChannelControls({
  channels,
  currentValues,
  onAllZero,
  onChannelChange
}: ChannelControlsProps) {
  return (
    <section className="generator-section" aria-labelledby="channels-title">
      <div className="section-heading">
        <h2 id="channels-title">Channels</h2>
        <button className="secondary-button" type="button" onClick={onAllZero}>
          All Zero
        </button>
      </div>
      <div className="channel-grid">
        {Array.from({ length: CHANNEL_COUNT }, (_, index) => {
          const channel = channels[index];
          const currentValue = currentValues[index] ?? 0;

          return (
            <div className="channel-row" key={index}>
              <label className="channel-label" htmlFor={`channel-${index}-value`}>
                {formatChannelName(index)}
              </label>
              <input
                aria-label={`${formatChannelName(index)} value`}
                id={`channel-${index}-value`}
                max={255}
                min={0}
                onChange={(event) =>
                  onChannelChange(index, {
                    ...channel,
                    value: Number(event.currentTarget.value)
                  })
                }
                step={1}
                type="range"
                value={channel.value}
              />
              <select
                aria-label={`${formatChannelName(index)} pattern`}
                onChange={(event) =>
                  onChannelChange(index, {
                    ...channel,
                    pattern: event.currentTarget.value as PatternName
                  })
                }
                value={channel.pattern}
              >
                {PATTERN_NAMES.map((patternName) => (
                  <option key={patternName} value={patternName}>
                    {patternName}
                  </option>
                ))}
              </select>
              <output className="channel-readout" htmlFor={`channel-${index}-value`}>
                {currentValue.toString().padStart(3, "0")}
              </output>
            </div>
          );
        })}
      </div>
    </section>
  );
}
