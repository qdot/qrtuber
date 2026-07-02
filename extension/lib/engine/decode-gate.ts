import type { QRTuberFrame } from "qrtuber";
import { SequenceTracker } from "qrtuber";

export interface AcceptedDecode {
  readonly frame: QRTuberFrame;
  readonly lastDecode: {
    readonly session: string;
    readonly seq: number;
    readonly at: number;
  };
}

export class DecodeGate {
  readonly #sequenceTracker: SequenceTracker;
  readonly #now: () => number;

  constructor(sequenceTracker = new SequenceTracker(), now: () => number = Date.now) {
    this.#sequenceTracker = sequenceTracker;
    this.#now = now;
  }

  accept(frame: QRTuberFrame): AcceptedDecode | null {
    if (!this.#sequenceTracker.accept(frame)) {
      return null;
    }

    return {
      frame,
      lastDecode: {
        session: frame.session,
        seq: frame.seq,
        at: this.#now(),
      },
    };
  }

  reset(): void {
    this.#sequenceTracker.reset();
  }
}
