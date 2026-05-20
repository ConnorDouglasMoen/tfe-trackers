import { cn } from "../lib/utils";

/**
 * A pill-shaped toggle switch.
 * Used for injury "Treated" checkboxes and the has* injury-type toggles.
 */
export default function ToggleButton({
  isChecked,
  onChange,
  label,
  className,
}: {
  isChecked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}): React.JSX.Element {
  return (
    <label
      className={cn(
        "flex cursor-pointer select-none items-center gap-2",
        className,
      )}
    >
      {label !== undefined && (
        <span className="text-sm text-text-primary dark:text-text-primary-dark">
          {label}
        </span>
      )}
      <div className="relative">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => onChange(!isChecked)}
          className="peer sr-only"
        />
        {/* Track */}
        <div className="h-[22px] w-[38px] rounded-full bg-black/30 p-0.5 transition duration-150 peer-checked:bg-[#74649f] dark:bg-white/20 dark:peer-checked:bg-[#74649f]" />
        {/* Thumb */}
        <div className="absolute left-[3px] top-[3px] size-4 rounded-full bg-white/80 transition duration-150 peer-checked:translate-x-[16px] peer-checked:bg-[#ccb3ff]" />
      </div>
    </label>
  );
}
