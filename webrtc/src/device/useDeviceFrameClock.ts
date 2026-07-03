import { useCallback, useEffect, useRef, useState } from "react";

import { HapticsState, encodeFrame } from "../shared/coreBridge.js";

const MAX_SEQ = 4_294_967_295;
const DEVICE_KEEPALIVE_RATE_HZ = 3;

export interface DeviceFrame {
  readonly encoded: string;
  readonly seq: number;
  readonly values: readonly number[];
}

function createSessionId(): string {
  const random = new Uint16Array(1);
  crypto.getRandomValues(random);
  return random[0].toString(16).toUpperCase().padStart(4, "0");
}

function encodeDeviceFrame(session: string, seq: number, state: HapticsState): DeviceFrame {
  return {
    encoded: encodeFrame({
      type: "H",
      session,
      seq,
      state
    }),
    seq,
    values: state.toArray()
  };
}

export function useDeviceFrameClock(
  state: HapticsState,
  updateId: number,
  shouldKeepAlive: boolean
) {
  const [session, setSession] = useState(createSessionId);
  const [frame, setFrame] = useState<DeviceFrame>(() => encodeDeviceFrame(session, 0, state));
  const nextSeqRef = useRef(1);
  const lastUpdateIdRef = useRef(0);
  const sessionRef = useRef(session);
  const stateRef = useRef(state);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const tick = useCallback(() => {
    const seq = nextSeqRef.current;
    setFrame(encodeDeviceFrame(sessionRef.current, seq, stateRef.current));
    nextSeqRef.current = seq >= MAX_SEQ ? 0 : seq + 1;
  }, []);

  const newSession = useCallback(() => {
    const nextSession = createSessionId();
    sessionRef.current = nextSession;
    nextSeqRef.current = 1;
    setSession(nextSession);
    setFrame(encodeDeviceFrame(nextSession, 0, stateRef.current));
  }, []);

  useEffect(() => {
    if (updateId === lastUpdateIdRef.current) {
      return;
    }

    lastUpdateIdRef.current = updateId;
    tick();
  }, [tick, updateId]);

  useEffect(() => {
    if (!shouldKeepAlive) {
      return undefined;
    }

    tick();
    const intervalId = window.setInterval(tick, 1000 / DEVICE_KEEPALIVE_RATE_HZ);
    return () => window.clearInterval(intervalId);
  }, [shouldKeepAlive, tick]);

  return {
    frame,
    newSession,
    session
  };
}
