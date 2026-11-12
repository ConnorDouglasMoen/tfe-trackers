import { Theme as MuiTheme, ThemeProvider } from "@mui/material/styles";
import OBR, { Theme } from "@owlbear-rodeo/sdk";
import { useState, useEffect } from "react";
import { getTheme } from "./getTheme";

/**
 * MUI theme provider that follows the OBR theme. It starts with the default
 * theme until OBR responds, so pages that open as popovers should fetch the
 * theme before rendering instead to avoid a flash.
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
