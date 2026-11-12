import { CloseIcon } from "./icons";

/**
 * One box per point of max strain. Clicking an empty box fills up to it;
 * clicking the last filled box clears it.
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

  return (
    <div className="flex flex-row flex-wrap gap-1">
      {boxes.map((index) => {
        const filled = index <= strainCurrent;
        return (
          <button
            key={index}
            onClick={() => onChange(index === strainCurrent ? index - 1 : index)}
            aria-label={`Strain box ${index}`}
            className={`relative size-6 shrink-0 rounded border-2 transition-colors duration-150 ${
              filled ? "border-strain-checked bg-strain-checked" : "border-strain/60 hover:border-strain"
            }`}
          >
            {filled && (
              <CloseIcon
                strokeWidth={2.5}
                color="#500a0a"
                className="absolute inset-0 size-full"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
