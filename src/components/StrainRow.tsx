/**
 * A row of strain checkboxes.
 *
 * Empty boxes: red border, transparent fill.
 * Filled boxes: red fill, red border, dark red X.
 * Clicking the last filled box unfills it; clicking any empty box fills up to that index.
 *
 * Inline styles are used for the red colors to avoid Tailwind purging
 * dynamically-constructed custom color class names at build time.
 */
export default function StrainRow({
  strainMax,
  strainCurrent,
  onChange,
}: {
  strainMax: number;
  strainCurrent: number;
  onChange: (newCurrent: number) => void;
}): React.JSX.Element {
  const boxes = Array.from({ length: strainMax }, (_, i) => i + 1);

  const handleClick = (index: number) => {
    if (index === strainCurrent) {
      onChange(strainCurrent - 1);
    } else {
      onChange(index);
    }
  };

  // Color constants — defined once here so they're easy to adjust.
  const COLOR_BORDER_EMPTY = "#d25050";       // red border for empty boxes
  const COLOR_BORDER_EMPTY_DIM = "#d2505099"; // 60% opacity version for resting state
  const COLOR_FILL_CHECKED = "#b42828";       // solid red fill for checked boxes
  const COLOR_BORDER_CHECKED = "#b42828";     // border matches fill when checked
  const COLOR_X = "#500a0a";                  // very dark red for the X stroke

  return (
    <div className="flex flex-row flex-wrap gap-1">
      {boxes.map((index) => {
        const filled = index <= strainCurrent;
        return (
          <button
            key={index}
            onClick={() => handleClick(index)}
            aria-label={`Strain box ${index}`}
            style={{
              position: "relative",
              width: "1.5rem",
              height: "1.5rem",
              borderRadius: "0.25rem",
              borderWidth: "2px",
              borderStyle: "solid",
              borderColor: filled ? COLOR_BORDER_CHECKED : COLOR_BORDER_EMPTY_DIM,
              backgroundColor: filled ? COLOR_FILL_CHECKED : "transparent",
              transition: "border-color 150ms, background-color 150ms",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!filled) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = COLOR_BORDER_EMPTY;
              }
            }}
            onMouseLeave={(e) => {
              if (!filled) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = COLOR_BORDER_EMPTY_DIM;
              }
            }}
          >
            {/* Dark red X, visible only when filled */}
            {filled && (
              <svg
                viewBox="0 0 16 16"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                aria-hidden="true"
              >
                <line x1="3" y1="3" x2="13" y2="13" stroke={COLOR_X} strokeWidth="2.5" strokeLinecap="round" />
                <line x1="13" y1="3" x2="3" y2="13" stroke={COLOR_X} strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
