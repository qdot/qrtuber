const CHANNEL_COUNT = 9;
const HEX_REGEX = /^[0-9A-F]{18}$/;

function clampByte(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.min(255, Math.max(0, Math.round(value)));
}

export class HapticsState {
  readonly #bytes: Uint8Array;

  constructor(values: Iterable<number> | ArrayLike<number> = []) {
    this.#bytes = new Uint8Array(CHANNEL_COUNT);
    const source = Array.from(values);

    for (let index = 0; index < CHANNEL_COUNT && index < source.length; index += 1) {
      this.#bytes[index] = clampByte(Number(source[index]));
    }
  }

  static fromHex(hex: string): HapticsState | null {
    if (!HEX_REGEX.test(hex)) {
      return null;
    }

    const values: number[] = [];
    for (let index = 0; index < hex.length; index += 2) {
      values.push(Number.parseInt(hex.slice(index, index + 2), 16));
    }

    return new HapticsState(values);
  }

  toHex(): string {
    return Array.from(this.#bytes, (value) =>
      value.toString(16).toUpperCase().padStart(2, "0")
    ).join("");
  }

  get(index: number): number {
    if (!Number.isInteger(index) || index < 0 || index >= CHANNEL_COUNT) {
      throw new RangeError("Haptics channel index must be an integer from 0 to 8");
    }

    return this.#bytes[index];
  }

  toArray(): number[] {
    return Array.from(this.#bytes);
  }

  equals(other: unknown): boolean {
    if (!(other instanceof HapticsState)) {
      return false;
    }

    return this.toHex() === other.toHex();
  }

  isAllZero(): boolean {
    return this.#bytes.every((value) => value === 0);
  }
}
