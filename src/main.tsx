import React from "react";
import ReactDOM from "react-dom/client";
import "./plugin-shared"; // expose shared modules for externally-built plugins
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
