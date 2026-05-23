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
        injury: {
          serious: {
            DEFAULT: "rgb(214, 142, 104)",
            dark: "rgb(164, 79, 39)",
          },
          critical: {
            DEFAULT: "rgb(219, 119, 119)",
            dark: "rgb(148, 39, 44)",
          },
          lethal: {
            DEFAULT: "rgb(124, 66, 145)",
            dark: "rgb(80, 30, 100)",
          },
        },
        // Hex values so Tailwind opacity modifiers (e.g. border-strain/40) work correctly.
        strain: {
          DEFAULT: "#d25050",   // empty box border + hover
          checked: "#b42828",   // checked box fill (light)
          checkedDark: "#781818", // checked box fill (dark)
          dark: "#a02828",      // empty box border in dark mode
        },
      },
    },
  },
  plugins: [],
  darkMode: "class",
};
