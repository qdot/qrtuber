import type { QRTuberFrame } from "./frames.js";

export class SequenceTracker {
  #session: string | null = null;
  #seq: number | null = null;

  accept(frame: QRTuberFrame): boolean {
    if (frame.session !== this.#session) {
      this.#session = frame.session;
      this.#seq = frame.seq;
      return true;
    }

    if (frame.seq === this.#seq) {
      return false;
    }

    this.#seq = frame.seq;
    return true;
  }

  reset(): void {
    this.#session = null;
    this.#seq = null;
  }
}
