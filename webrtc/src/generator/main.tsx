import React from "react";
import { createRoot } from "react-dom/client";

import { smokeTest } from "../shared/coreBridge.js";
import "../shared/styles.css";

console.log("QRTuber core smoke test", smokeTest());

function GeneratorPlaceholder() {
  const parsedFrame = smokeTest();

  return (
    <main className="app-shell">
      <header className="top-bar">
        <h1>QRTuber Generator</h1>
        <a className="nav-link" href="/app/">
          Viewer
        </a>
      </header>
      <section className="panel">
        <p>
          Generator scaffold is connected to the core protocol package. Live QT1
          QR generation lands in the next stage.
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
    <GeneratorPlaceholder />
  </React.StrictMode>
);
