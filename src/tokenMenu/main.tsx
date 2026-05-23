import React from "react";
import ReactDOM from "react-dom/client";
import "../index.css";
import OBR from "@owlbear-rodeo/sdk";
import App from "./App";
import { ThemeProvider } from "@mui/material";
import { getTheme } from "../getTheme";

OBR.onReady(async () => {
  const [OBRTheme, role] = await Promise.all([
    OBR.theme.getTheme(),
    OBR.player.getRole(),
  ]);

  // Detect if this page was opened as a popover (via ?popover=1 in the URL).
  // The TokenMenu uses this to hide the "Open Full Editor" button.
  const isPopover = new URLSearchParams(window.location.search).get("popover") === "1";

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ThemeProvider theme={getTheme(OBRTheme)}>
        <App initialMode={OBRTheme.mode} initialRole={role} isPopover={isPopover} />
      </ThemeProvider>
    </React.StrictMode>,
  );
});
