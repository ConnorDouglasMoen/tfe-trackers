import { useEffect, useState } from "react";
import { useOwlbearStore } from "../useOwlbearStore";
import { useOwlbearStoreSync } from "../useOwlbearStoreSync";
import { useCharacterDataStore } from "../useCharacterDataStore";
import { writeTokenRecordToSelection } from "../itemMetadataHelpers";
import TokenMenu from "./TokenMenu";

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
    setWriteToItem(writeTokenRecordToSelection);
    setInitDone(true);
  }, []);

  if (!initDone) return <></>;

  return <TokenMenu isPopover={isPopover} />;
}
