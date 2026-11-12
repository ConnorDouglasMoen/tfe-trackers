import { useState } from "react";
import PartiallyControlledInput from "./PartiallyControlledInput";
import { cn } from "../lib/utils";

/** Single-line text input with an underline. Commits on blur or Enter; Escape cancels. */
export default function TextInput({
  value,
  onConfirm,
  placeholder,
  className,
}: {
  value: string;
  onConfirm: (content: string) => void;
  placeholder?: string;
  className?: string;
}): React.JSX.Element {
  const [hasFocus, setHasFocus] = useState(false);
  const [hasHover, setHasHover] = useState(false);

  return (
    <div className={cn("w-full", className)}>
      <PartiallyControlledInput
        parentValue={value}
        onUserConfirm={(t) => onConfirm(t.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-disabled dark:text-text-primary-dark dark:placeholder:text-text-disabled-dark"
        onFocus={() => setHasFocus(true)}
        onBlur={() => setHasFocus(false)}
        onMouseEnter={() => setHasHover(true)}
        onMouseLeave={() => setHasHover(false)}
      />
      <div className="flex min-h-[2px] flex-col justify-end">
        <div
          className={cn(
            "w-full border-b border-transparent duration-150",
            { "border-text-secondary dark:border-white": hasHover || hasFocus },
          )}
        />
        <div
          className={cn(
            "w-full border-b border-text-secondary/40 duration-150 dark:border-text-secondary-dark/40",
            { "dark:border-white": hasHover || hasFocus },
          )}
        />
      </div>
    </div>
  );
}
