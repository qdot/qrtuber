import { useCallback, useEffect, useRef, useState } from "react";

import { HapticsState, encodeFrame } from "../shared/coreBridge.js";
import { type ChannelConfig, samplePattern } from "./patterns.js";

const MAX_SEQ = 4_294_967_295;
export const RATE_OPTIONS = [1, 3, 5, 10] as const;

export type RateHz = (typeof RATE_OPTIONS)[number];

export interface GeneratedFrame {
  encoded: string;
  seq: number;
  values: number[];
}

export interface FrameClockOptions {
  readonly initialPaused?: boolean;
  readonly initialRateHz?: RateHz;
}

function createSessionId(): string {
  const random = new Uint16Array(1);
  crypto.getRandomValues(random);
  return random[0].toString(16).toUpperCase().padStart(4, "0");
}

function createFrame(
  session: string,
  seq: number,
  channels: readonly ChannelConfig[],
  tMs: number
): GeneratedFrame {
  const values = channels.map((channel, index) => samplePattern(tMs, channel, index));
  const state = new HapticsState(values);
  return {
    encoded: encodeFrame({ type: "H", session, seq, state }),
    seq,
    values: state.toArray()
  };
}

export function useFrameClock(
  channels: ChannelConfig[],
  options: FrameClockOptions = {}
) {
  const [session, setSession] = useState(createSessionId);
  const [rateHz, setRateHz] = useState<RateHz>(options.initialRateHz ?? 3);
  const [paused, setPaused] = useState(options.initialPaused ?? false);
  const [frame, setFrame] = useState<GeneratedFrame>(() =>
    createFrame(session, 0, channels, 0)
  );

  const channelsRef = useRef(channels);
  const sessionRef = useRef(session);
  const nextSeqRef = useRef(1);
  const startedAtRef = useRef(performance.now());

  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const tick = useCallback(() => {
    const tMs = performance.now() - startedAtRef.current;
    const seq = nextSeqRef.current;
    setFrame(createFrame(sessionRef.current, seq, channelsRef.current, tMs));

    nextSeqRef.current = seq >= MAX_SEQ ? 0 : seq + 1;
  }, []);

  const newSession = useCallback(() => {
    const nextSession = createSessionId();
    sessionRef.current = nextSession;
    nextSeqRef.current = 0;
    startedAtRef.current = performance.now();
    setSession(nextSession);
    tick();
  }, [tick]);

  useEffect(() => {
    if (paused) {
      return undefined;
    }

    const intervalId = window.setInterval(tick, 1000 / rateHz);
    return () => window.clearInterval(intervalId);
  }, [paused, rateHz, tick]);

  return {
    frame,
    newSession,
    paused,
    rateHz,
    session,
    setPaused,
    setRateHz,
    tick
  };
}
