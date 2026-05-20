import { cn } from "../lib/utils";

/**
 * A row of strain checkboxes.
 *
 * Renders `strainMax` boxes total. Boxes 1..strainCurrent are filled (taken).
 * Clicking a filled box clears it; clicking an empty box fills up to that index.
 *
 * Visual convention: filled = strain taken (bad), empty = remaining strain.
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
    // Clicking the last filled box unfills it; otherwise fill up to index.
    if (index === strainCurrent) {
      onChange(strainCurrent - 1);
    } else {
      onChange(index);
    }
  };

  return (
    <div className="flex flex-row flex-wrap gap-1">
      {boxes.map((index) => {
        const filled = index <= strainCurrent;
        return (
          <button
            key={index}
            onClick={() => handleClick(index)}
            aria-label={`Strain box ${index}`}
            className={cn(
              // Base: square box with rounded corners
              "size-6 rounded border-2 transition duration-150",
              // Filled (strain taken)
              filled
                ? "border-strain-dark bg-strain dark:border-strain dark:bg-strain-dark"
                : // Empty (strain remaining)
                  "border-strain/60 bg-transparent hover:border-strain dark:border-strain-dark/60 dark:hover:border-strain-dark",
            )}
          />
        );
      })}
    </div>
  );
}
