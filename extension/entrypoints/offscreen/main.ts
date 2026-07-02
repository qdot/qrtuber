import { Engine } from "../../lib/engine/Engine.js";

const engine = new Engine();
void engine.initialise().catch(() => {});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (engine.handleRuntimeMessage(message, sender, sendResponse)) {
    return true;
  }

  return undefined;
});
