import React from "react";
import { createRoot } from "react-dom/client";

import { GeneratorApp } from "./GeneratorApp.js";
import { smokeTest } from "../shared/coreBridge.js";
import "../shared/styles.css";

console.log("QRTuber core smoke test", smokeTest());

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GeneratorApp />
  </React.StrictMode>
);
