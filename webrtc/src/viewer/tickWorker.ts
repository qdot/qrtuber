type TickWorkerRequest =
  | { type: "start"; intervalMs: number }
  | { type: "stop" };

let intervalId: ReturnType<typeof setInterval> | null = null;

function stopTicks() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

self.addEventListener("message", (event: MessageEvent<TickWorkerRequest>) => {
  if (event.data.type === "stop") {
    stopTicks();
    return;
  }

  stopTicks();
  intervalId = setInterval(() => {
    self.postMessage({ type: "tick", at: performance.now() });
  }, event.data.intervalMs);
});
