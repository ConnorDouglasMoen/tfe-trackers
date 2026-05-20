import { InjurySlot } from "../characterDataHelpers";
import TextInput from "./TextInput";
import ToggleButton from "./ToggleButton";
import { cn } from "../lib/utils";

/** Accent color classes per injury severity tier. */
const SEVERITY_COLORS = {
  serious:
    "border-injury-serious dark:border-injury-serious-dark bg-injury-serious/10 dark:bg-injury-serious-dark/10",
  critical:
    "border-injury-critical dark:border-injury-critical-dark bg-injury-critical/10 dark:bg-injury-critical-dark/10",
  lethal:
    "border-injury-lethal dark:border-injury-lethal-dark bg-injury-lethal/10 dark:bg-injury-lethal-dark/10",
} as const;

export type InjurySeverity = keyof typeof SEVERITY_COLORS;

/**
 * A card representing one injury slot (Serious, Critical, or Lethal).
 * Contains a location field, a complications textarea, and a Treated toggle.
 */
export default function InjurySlotCard({
  slot,
  severity,
  label,
  onUpdate,
}: {
  slot: InjurySlot;
  severity: InjurySeverity;
  /** Display label, e.g. "Serious #1", "Critical", "Lethal" */
  label: string;
  onUpdate: (updated: Partial<InjurySlot>) => void;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-lg border p-2",
        SEVERITY_COLORS[severity],
      )}
    >
      {/* Header row: label + Treated toggle */}
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

      {/* Location text input */}
      <TextInput
        value={slot.location}
        onConfirm={(v) => onUpdate({ location: v })}
        placeholder="Location (e.g. Left Arm)"
      />

      {/* Complications textarea */}
      <textarea
        value={slot.complications}
        onChange={(e) => {
          // Textarea is fully controlled; write on every change
          onUpdate({ complications: e.target.value });
        }}
        onBlur={(e) => onUpdate({ complications: e.target.value })}
        placeholder="Complications…"
        rows={2}
        className="w-full resize-none rounded bg-transparent text-sm text-text-primary outline-none placeholder:text-text-disabled dark:text-text-primary-dark dark:placeholder:text-text-disabled-dark"
      />
    </div>
  );
}
