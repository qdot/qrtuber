import React from "react";
import { createRoot } from "react-dom/client";

import { GeneratorApp } from "./GeneratorApp.js";
import "../shared/styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GeneratorApp />
  </React.StrictMode>
);
