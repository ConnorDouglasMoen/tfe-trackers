export const segmentActiveClass =
  "bg-white/80 text-text-primary shadow-sm dark:bg-white/20 dark:text-text-primary-dark";
export const segmentInactiveClass =
  "text-text-secondary hover:text-text-primary dark:text-text-secondary-dark dark:hover:text-text-primary-dark";

/** A row of mutually exclusive buttons, e.g. Scene / Show / Hide. */
export default function SegmentedControl<T>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-black/10 p-0.5 dark:bg-white/10">
      {options.map((option) => (
        <button
          key={String(option.value)}
          onClick={() => onChange(option.value)}
          className={`rounded-md px-2 py-0.5 text-xs font-semibold transition duration-150 ${
            option.value === value ? segmentActiveClass : segmentInactiveClass
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
