/** @type {import('tailwindcss').Config} */

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx,html}"],
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    screens: {
      lg: "400px",
      md: "320px",
    },
    extend: {
      fontSize: {
        "2xs": "0.6rem",
      },
      colors: {
        // OBR-matched surface colors for light/dark theme
        default: {
          DEFAULT: "#dde1ee",
          dark: "#222639",
        },
        paper: {
          DEFAULT: "#f1f3f9",
          dark: "#3d4051",
        },
        text: {
          primary: {
            DEFAULT: "rgba(0, 0, 0, 0.87)",
            dark: "rgb(255, 255, 255)",
          },
          secondary: {
            DEFAULT: "rgba(0, 0, 0, 0.6)",
            dark: "rgb(255, 255, 255, 0.7)",
          },
          disabled: {
            DEFAULT: "rgba(0, 0, 0, 0.38)",
            dark: "rgb(255, 255, 255, 0.5)",
          },
        },
        // TFE injury severity accent colors
        injury: {
          serious: {
            DEFAULT: "rgb(214, 142, 104)",   // orange — serious injury
            dark: "rgb(164, 79, 39)",
          },
          critical: {
            DEFAULT: "rgb(219, 119, 119)",   // red — critical injury
            dark: "rgb(148, 39, 44)",
          },
          lethal: {
            DEFAULT: "rgb(124, 66, 145)",    // purple — lethal injury
            dark: "rgb(80, 30, 100)",
          },
        },
        // Strain accent color
        strain: {
          DEFAULT: "rgb(154, 177, 211)",     // blue — strain checkboxes
          dark: "rgb(61, 84, 131)",
        },
      },
    },
  },
  plugins: [],
  darkMode: "class",
};
