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

/** Small inline clear button used next to text fields. */
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
 * - Location and Complications each have a CLEAR button.
 * - When Treated is on, the complications text is faded and struck through.
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
  return (
    <div className={cn("flex flex-col gap-1.5 rounded-lg border p-2", SEVERITY_COLORS[severity])}>

      {/* Header: label + Treated toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-secondary dark:text-text-secondary-dark">
          {label}
        </span>
        <ToggleButton
          isChecked={slot.treated}
          onChange={(checked) => onUpdate({ treated: checked })}
          label="Treated"
        />
      </div>

      {/* Location row */}
      <div className="flex items-center">
        <TextInput
          value={slot.location}
          onConfirm={(v) => onUpdate({ location: v })}
          placeholder="Location (e.g. Left Arm)"
          className="flex-1"
        />
        {slot.location !== "" && (
          <ClearButton onClick={() => onUpdate({ location: "" })} />
        )}
      </div>

      {/* Complications row — faded + strikethrough when treated */}
      <div className="flex items-start">
        <textarea
          value={slot.complications}
          onChange={(e) => onUpdate({ complications: e.target.value })}
          onBlur={(e) => onUpdate({ complications: e.target.value })}
          placeholder="Complications…"
          rows={2}
          className={cn(
            "flex-1 resize-none rounded bg-transparent text-sm outline-none placeholder:text-text-disabled dark:placeholder:text-text-disabled-dark",
            slot.treated
              ? "text-text-disabled line-through dark:text-text-disabled-dark"
              : "text-text-primary dark:text-text-primary-dark",
          )}
        />
        {slot.complications !== "" && (
          <ClearButton onClick={() => onUpdate({ complications: "" })} />
        )}
      </div>
    </div>
  );
}
