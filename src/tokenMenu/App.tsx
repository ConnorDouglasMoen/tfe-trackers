import { useEffect, useState } from "react";
import { useOwlbearStore } from "../useOwlbearStore";
import { useOwlbearStoreSync } from "../useOwlbearStoreSync";
import { useCharacterDataStore } from "../useCharacterDataStore";
import { writeCharacterDataToSelection } from "../itemMetadataHelpers";
import TokenMenu from "./TokenMenu";

/**
 * Root app for the token context-menu embed.
 * Accepts isPopover so TokenMenu can hide the "Open Full Editor" button
 * when it is already rendered inside the popover.
 */
export default function App({
  initialMode,
  initialRole,
  isPopover,
}: {
  initialMode: "DARK" | "LIGHT";
  initialRole: "PLAYER" | "GM";
  isPopover: boolean;
}): React.JSX.Element {
  useOwlbearStoreSync();

  const setRole = useOwlbearStore((state) => state.setRole);
  const setThemeMode = useOwlbearStore((state) => state.setThemeMode);
  const setWriteToItem = useCharacterDataStore((state) => state.setWriteToItem);

  const [initDone, setInitDone] = useState(false);

  useEffect(() => {
    setThemeMode(initialMode);
    setRole(initialRole);
    setWriteToItem(writeCharacterDataToSelection);
    setInitDone(true);
  }, []);

  if (!initDone) return <></>;

  return <TokenMenu isPopover={isPopover} />;
}
