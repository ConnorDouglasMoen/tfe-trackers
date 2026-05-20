import { Theme as MuiTheme, ThemeProvider } from "@mui/material/styles";
import OBR, { Theme } from "@owlbear-rodeo/sdk";
import { useState, useEffect } from "react";
import { getTheme } from "./getTheme";

/**
 * Provides a MUI ThemeProvider whose palette stays in sync with the OBR theme.
 * Use for entry points where the initial theme is fetched async (e.g. action).
 * Avoid for popovers — it causes a flash on open.
 */
export function OBRThemeProvider({ children }: { children?: React.ReactNode }) {
  const [theme, setTheme] = useState<MuiTheme>(() => getTheme());

  useEffect(() => {
    const update = (t: Theme) => setTheme(getTheme(t));
    OBR.theme.getTheme().then(update);
    return OBR.theme.onChange(update);
  }, []);

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
