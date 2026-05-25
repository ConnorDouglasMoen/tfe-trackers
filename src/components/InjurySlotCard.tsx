import { useState } from "react";
import { InjurySlot } from "../characterDataHelpers";
import TextInput from "./TextInput";
import ToggleButton from "./ToggleButton";
import { cn } from "../lib/utils";

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
 * A card representing one injury slot (Serious, Critical, or Lethal).
 *
 * - Location has a CLEAR button.
 * - Complications work like Conditions: Enter to add, X to delete each item.
 * - Treated toggle is disabled unless location or at least one complication is present.
 * - Clearing all content automatically resets Treated.
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

  const hasContent = slot.location.trim() !== "" || slot.complications.length > 0;

  const handleClearLocation = () => {
    const patch: Partial<InjurySlot> = { location: "" };
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
    // Reset treated if location is also empty and no complications remain.
    if (updated.length === 0 && slot.location.trim() === "") patch.treated = false;
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

      {/* Header: label + Treated toggle */}
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

      {/* Location row */}
      <div className="flex items-center">
        <TextInput
          value={slot.location}
          onConfirm={(v) => onUpdate({ location: v })}
          placeholder="Location (e.g. Left Arm, Bulk, etc.)"
          className="flex-1"
        />
        {slot.location !== "" && (
          <ClearButton onClick={handleClearLocation} />
        )}
      </div>

      {/* Complications — Enter to add, X to delete */}
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
                  <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                    <line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="13" y1="3" x2="3" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
