import { useEffect, useState } from "react";
import { useOwlbearStore } from "../useOwlbearStore";
import { useOwlbearStoreSync } from "../useOwlbearStoreSync";
import { useCharacterDataStore } from "../useCharacterDataStore";
import { writeCharacterDataToSelection } from "../itemMetadataHelpers";
import TokenMenu from "./TokenMenu";

/**
 * Root app for the token context-menu embed.
 * Wires up OBR sync hooks and injects the write function into the store.
 */
export default function App({
  initialMode,
  initialRole,
}: {
  initialMode: "DARK" | "LIGHT";
  initialRole: "PLAYER" | "GM";
}): React.JSX.Element {
  useOwlbearStoreSync();

  const setRole = useOwlbearStore((state) => state.setRole);
  const setThemeMode = useOwlbearStore((state) => state.setThemeMode);
  const setWriteToItem = useCharacterDataStore((state) => state.setWriteToItem);

  // Guard against rendering before initial state is applied to avoid flash.
  const [initDone, setInitDone] = useState(false);

  useEffect(() => {
    setThemeMode(initialMode);
    setRole(initialRole);
    setWriteToItem(writeCharacterDataToSelection);
    setInitDone(true);
  }, []);

  if (!initDone) return <></>;

  return <TokenMenu />;
}
