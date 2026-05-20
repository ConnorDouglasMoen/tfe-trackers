import { createTheme } from "@mui/material/styles";
import { Theme } from "@owlbear-rodeo/sdk";

/**
 * Build a MUI theme whose palette mirrors the current OBR theme.
 * Pass the OBR Theme object from OBR.theme.getTheme() to sync colors.
 */
export function getTheme(theme?: Theme) {
  return createTheme({
    palette: theme
      ? {
          mode: theme.mode === "LIGHT" ? "light" : "dark",
          text: theme.text,
          primary: theme.primary,
          secondary: theme.secondary,
          background: theme.background,
        }
      : undefined,
    shape: { borderRadius: 12 },
    components: {
      MuiTooltip: {
        defaultProps: { disableInteractive: true },
      },
    },
  });
}
