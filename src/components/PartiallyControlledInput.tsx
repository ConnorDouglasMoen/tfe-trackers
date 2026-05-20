import { useEffect, useState } from "react";

/**
 * An input that is "partially controlled": the displayed value tracks the
 * parent's value reactively, but edits are local until the user confirms
 * (blur or Enter) or cancels (Escape).
 *
 * Mirrors the pattern from owl-trackers for numeric tracker inputs.
 */
interface PartiallyControlledInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  parentValue: string;
  onUserConfirm: (target: HTMLInputElement) => void;
  clearContentOnFocus?: boolean;
}

export default function PartiallyControlledInput({
  parentValue,
  onUserConfirm,
  className,
  clearContentOnFocus = false,
  ...inputProps
}: PartiallyControlledInputProps): React.JSX.Element {
  const [inputContent, setInputContent] = useState(parentValue);

  // Sync display value when parent changes (e.g. another player edits the token).
  const [updateFlag, setUpdateFlag] = useState(false);
  if (updateFlag) {
    setInputContent(parentValue);
    setUpdateFlag(false);
  }
  useEffect(() => setUpdateFlag(true), [parentValue]);

  const resetContent = () => setInputContent(parentValue);

  let ignoreBlur = false;
  const blurWithoutUpdate = (
    e: React.FocusEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>,
  ) => {
    ignoreBlur = true;
    (e.target as HTMLInputElement).blur();
    ignoreBlur = false;
  };

  const runConfirm = (
    e: React.FocusEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>,
  ) => {
    onUserConfirm(e.target as HTMLInputElement);
    setUpdateFlag(true);
  };

  return (
    <input
      {...inputProps}
      value={inputContent}
      onChange={(e) => {
        inputProps.onChange?.(e);
        setInputContent(e.target.value);
      }}
      onBlur={(e) => {
        inputProps.onBlur?.(e);
        if (!ignoreBlur) {
          if (clearContentOnFocus && inputContent === "") resetContent();
          else runConfirm(e);
        }
      }}
      onKeyDown={(e) => {
        inputProps.onKeyDown?.(e);
        if (e.key === "Enter") {
          blurWithoutUpdate(e);
          runConfirm(e);
        } else if (e.key === "Escape") {
          blurWithoutUpdate(e);
          resetContent();
        }
      }}
      onFocus={(e) => {
        inputProps.onFocus?.(e);
        if (clearContentOnFocus) setInputContent("");
      }}
      className={className}
      autoComplete="off"
      spellCheck="false"
    />
  );
}
