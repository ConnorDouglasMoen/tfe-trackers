import React from "react";
import ReactDOM from "react-dom/client";
import "../index.css";
import OBR from "@owlbear-rodeo/sdk";
import App from "./App";
import { OBRThemeProvider } from "../OBRThemeProvider";

OBR.onReady(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <OBRThemeProvider>
        <App />
      </OBRThemeProvider>
    </React.StrictMode>,
  );
});
