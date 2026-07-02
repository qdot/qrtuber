import type {
  EngineRequest,
  EnsureEngineRequest,
  StatusBroadcast,
} from "./messages.js";

export async function ensureEngine(): Promise<void> {
  const request: EnsureEngineRequest = { type: "engine/ensure" };
  await browser.runtime.sendMessage(request);
}

export async function sendToEngine<TResponse = unknown>(
  message: EngineRequest
): Promise<TResponse> {
  await ensureEngine();

  try {
    return (await browser.runtime.sendMessage(message)) as TResponse;
  } catch {
    await ensureEngine();
    return (await browser.runtime.sendMessage(message)) as TResponse;
  }
}

export function broadcastSafe(message: StatusBroadcast): void {
  void browser.runtime.sendMessage(message).catch(() => {});
}
