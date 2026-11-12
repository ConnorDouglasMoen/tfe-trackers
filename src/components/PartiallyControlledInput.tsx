import { useState } from "react";

interface PartiallyControlledInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  parentValue: string;
  onUserConfirm: (target: HTMLInputElement) => void;
  clearContentOnFocus?: boolean;
}

/**
 * An input that shows `parentValue` but keeps edits local until the user
 * confirms them (blur or Enter) or cancels them (Escape). If `parentValue`
 * changes, for example because someone else edited the token, the input
 * follows it.
 */
export default function PartiallyControlledInput({
  parentValue,
  onUserConfirm,
  clearContentOnFocus = false,
  ...inputProps
}: PartiallyControlledInputProps): React.JSX.Element {
  const [inputContent, setInputContent] = useState(parentValue);
  const [lastParentValue, setLastParentValue] = useState(parentValue);
  if (parentValue !== lastParentValue) {
    setLastParentValue(parentValue);
    setInputContent(parentValue);
  }

  const resetContent = () => setInputContent(parentValue);

  // Enter and Escape blur the input themselves; the resulting blur event
  // must not confirm a second time.
  let ignoreBlur = false;
  const blurWithoutConfirm = (target: HTMLInputElement) => {
    ignoreBlur = true;
    target.blur();
    ignoreBlur = false;
  };

  const confirm = (target: HTMLInputElement) => {
    onUserConfirm(target);
    // Show the parent's value again. If the parent accepted the edit, the new
    // value arrives through `parentValue` on the next render.
    resetContent();
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
        if (ignoreBlur) return;
        if (clearContentOnFocus && inputContent === "") resetContent();
        else confirm(e.target);
      }}
      onKeyDown={(e) => {
        inputProps.onKeyDown?.(e);
        const target = e.target as HTMLInputElement;
        if (e.key === "Enter") {
          blurWithoutConfirm(target);
          confirm(target);
        } else if (e.key === "Escape") {
          blurWithoutConfirm(target);
          resetContent();
        }
      }}
      onFocus={(e) => {
        inputProps.onFocus?.(e);
        if (clearContentOnFocus) setInputContent("");
      }}
      autoComplete="off"
      spellCheck="false"
    />
  );
}
