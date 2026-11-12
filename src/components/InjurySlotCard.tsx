import { useState } from "react";
import { InjurySlot } from "../characterDataHelpers";
import TextInput from "./TextInput";
import ToggleButton from "./ToggleButton";
import { cn } from "../lib/utils";
import { CloseIcon } from "./icons";

const SEVERITY_COLORS = {
  serious:
    "border-injury-serious dark:border-injury-serious-dark bg-injury-serious/10 dark:bg-injury-serious-dark/10",
  critical:
    "border-injury-critical dark:border-injury-critical-dark bg-injury-critical/10 dark:bg-injury-critical-dark/10",
  lethal:
    "border-injury-lethal dark:border-injury-lethal-dark bg-injury-lethal/10 dark:bg-injury-lethal-dark/10",
} as const;

export type InjurySeverity = keyof typeof SEVERITY_COLORS;

function ClearButton({ onClick }: { onClick: () => void }): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="ml-1 shrink-0 rounded px-1 py-0.5 text-2xs font-semibold uppercase tracking-wide text-text-disabled hover:text-text-secondary dark:text-text-disabled-dark dark:hover:text-text-secondary-dark"
    >
      Clear
    </button>
  );
}

/**
 * One injury slot: a description, a list of complications, and a Treated
 * toggle. Treated can only be set while the slot has content, and is reset
 * when the slot is emptied.
 */
export default function InjurySlotCard({
  slot,
  severity,
  label,
  onUpdate,
}: {
  slot: InjurySlot;
  severity: InjurySeverity;
  label: string;
  onUpdate: (updated: Partial<InjurySlot>) => void;
}): React.JSX.Element {
  const [compInput, setCompInput] = useState("");

  const hasContent = slot.description.trim() !== "" || slot.complications.length > 0;

  const handleClearDescription = () => {
    const patch: Partial<InjurySlot> = { description: "" };
    if (slot.complications.length === 0) patch.treated = false;
    onUpdate(patch);
  };

  const addComplication = (text: string) => {
    const trimmed = text.trim();
    if (trimmed === "") return;
    onUpdate({ complications: [...slot.complications, trimmed] });
  };

  const removeComplication = (index: number) => {
    const updated = slot.complications.filter((_, i) => i !== index);
    const patch: Partial<InjurySlot> = { complications: updated };
    if (updated.length === 0 && slot.description.trim() === "") patch.treated = false;
    onUpdate(patch);
  };

  const handleCompKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addComplication(compInput);
      setCompInput("");
    }
  };

  return (
    <div className={cn("flex flex-col gap-1.5 rounded-lg border p-2", SEVERITY_COLORS[severity])}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-secondary dark:text-text-secondary-dark">
          {label}
        </span>
        <div className={cn("transition-opacity duration-150", !hasContent && "cursor-not-allowed opacity-30")}>
          <ToggleButton
            isChecked={slot.treated}
            onChange={(checked) => { if (hasContent) onUpdate({ treated: checked }); }}
            label="Treated"
            className={!hasContent ? "pointer-events-none" : undefined}
          />
        </div>
      </div>

      <div className="flex items-center">
        <TextInput
          value={slot.description}
          onConfirm={(v) => onUpdate({ description: v })}
          placeholder="Description (e.g. Shot in the Leg)"
          className="flex-1"
        />
        {slot.description !== "" && (
          <ClearButton onClick={handleClearDescription} />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <input
          type="text"
          value={compInput}
          onChange={(e) => setCompInput(e.target.value)}
          onKeyDown={handleCompKeyDown}
          placeholder="Add complication, press Enter…"
          className="w-full rounded bg-transparent px-0 py-0.5 text-sm text-text-primary outline-none placeholder:text-text-disabled dark:text-text-primary-dark dark:placeholder:text-text-disabled-dark"
        />
        {slot.complications.length > 0 && (
          <ul className="flex flex-col gap-0.5">
            {slot.complications.map((comp, index) => (
              <li
                key={index}
                className={cn(
                  "flex items-center justify-between gap-1 rounded px-1.5 py-0.5 text-sm",
                  slot.treated
                    ? "text-text-disabled line-through dark:text-text-disabled-dark"
                    : "text-text-primary dark:text-text-primary-dark",
                )}
              >
                <span>{comp}</span>
                <button
                  onClick={() => removeComplication(index)}
                  aria-label={`Remove complication: ${comp}`}
                  className="shrink-0 text-text-disabled hover:text-text-secondary dark:text-text-disabled-dark dark:hover:text-text-secondary-dark"
                >
                  <CloseIcon size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
