import React from "react";
import { createRoot } from "react-dom/client";

import { smokeTest } from "../shared/coreBridge.js";
import "../shared/styles.css";

console.log("QRTuber core smoke test", smokeTest());

function ViewerPlaceholder() {
  const parsedFrame = smokeTest();

  return (
    <main className="app-shell">
      <header className="top-bar">
        <h1>QRTuber Web Viewer</h1>
        <a className="nav-link" href="/app/generator/">
          Generator
        </a>
      </header>
      <section className="panel">
        <p>
          Viewer scaffold is connected to the core protocol package. Capture,
          decoding, and Intiface output land in the next WebRTC stages.
        </p>
        <p className="monospace">
          Smoke frame: {parsedFrame === null ? "parse failed" : parsedFrame.state.toHex()}
        </p>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ViewerPlaceholder />
  </React.StrictMode>
);
