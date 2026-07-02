interface EmergencyStopProps {
  isStopped: boolean;
  onResume: () => void;
  onStop: () => void;
}

export function EmergencyStop({ isStopped, onResume, onStop }: EmergencyStopProps) {
  return (
    <section className="emergency-stop" aria-label="Emergency stop">
      <button
        aria-pressed={isStopped}
        className={isStopped ? "emergency-button latched" : "emergency-button"}
        onClick={onStop}
        type="button"
      >
        STOP
      </button>
      <button
        className="secondary-button"
        disabled={!isStopped}
        onClick={onResume}
        type="button"
      >
        Resume
      </button>
    </section>
  );
}
