import React from "react";
import { createRoot } from "react-dom/client";

import "../shared/styles.css";
import { DeviceApp } from "./DeviceApp.js";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DeviceApp />
  </React.StrictMode>
);
