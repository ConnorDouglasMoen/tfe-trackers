// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useCharacterDataStore } from "../useCharacterDataStore";
import { createDefaultTokenRecord, getActiveData } from "../characterDataHelpers";
import { TokenDisplaySection } from "../tokenMenu/TokenMenu";

function resetStore() {
  const record = createDefaultTokenRecord();
  useCharacterDataStore.setState({
    record,
    data: getActiveData(record),
    writeToItem: undefined,
  });
}

beforeEach(() => {
  resetStore();
  vi.clearAllMocks();
});

describe("adjustSeriousTier", () => {
  const adjustTier = (delta: 1 | -1) => useCharacterDataStore.getState().adjustSeriousTier(delta);

  it("persists each step with a single write", () => {
    const writeToItem = vi.fn().mockResolvedValue(undefined);
    useCharacterDataStore.setState({ writeToItem });

    adjustTier(-1);

    expect(writeToItem).toHaveBeenCalledTimes(1);
    expect(getActiveData(writeToItem.mock.calls[0][0]).seriousCount).toBe(1);
  });

  it("increments from tier 0 (none) to tier 1 (one serious slot)", () => {
    useCharacterDataStore.getState().setHasSerious(false);

    adjustTier(+1);

    const data = useCharacterDataStore.getState().data;
    expect(data.hasSerious).toBe(true);
    expect(data.seriousCount).toBe(1);
  });

  it("increments from tier 1 to tier 2 (two serious slots)", () => {
    useCharacterDataStore.getState().setHasSerious(true);
    useCharacterDataStore.getState().setSeriousCount(1);

    adjustTier(+1);

    const data = useCharacterDataStore.getState().data;
    expect(data.hasSerious).toBe(true);
    expect(data.seriousCount).toBe(2);
  });

  it("does not increment past tier 2", () => {
    // The default survivor already has two serious slots.
    adjustTier(+1);

    const data = useCharacterDataStore.getState().data;
    expect(data.hasSerious).toBe(true);
    expect(data.seriousCount).toBe(2);
  });

  it("decrements from tier 2 to tier 1", () => {
    // The default survivor has two serious slots.
    adjustTier(-1);

    const data = useCharacterDataStore.getState().data;
    expect(data.hasSerious).toBe(true);
    expect(data.seriousCount).toBe(1);
  });

  it("decrements from tier 1 to tier 0 (none)", () => {
    useCharacterDataStore.getState().setHasSerious(true);
    useCharacterDataStore.getState().setSeriousCount(1);

    adjustTier(-1);

    expect(useCharacterDataStore.getState().data.hasSerious).toBe(false);
  });

  it("does not decrement past tier 0", () => {
    useCharacterDataStore.getState().setHasSerious(false);

    adjustTier(-1);

    expect(useCharacterDataStore.getState().data.hasSerious).toBe(false);
  });
});

describe("TokenDisplaySection collapse toggle", () => {
  it("hides override controls by default (collapsed)", () => {
    render(<TokenDisplaySection />);

    expect(screen.getByRole("button", { name: /token display settings/i })).toBeInTheDocument();
    expect(screen.queryByText("Strain")).not.toBeInTheDocument();
  });

  it("reveals override controls when expanded", () => {
    render(<TokenDisplaySection />);

    fireEvent.click(screen.getByRole("button", { name: /token display settings/i }));

    expect(screen.getByText("Strain")).toBeInTheDocument();
    expect(screen.getByText("Injuries")).toBeInTheDocument();
    expect(screen.getByText("Conditions & Complications")).toBeInTheDocument();
    expect(screen.getByText("Token Name")).toBeInTheDocument();
  });
});

describe("TokenDisplaySection — showStrain override", () => {
  /** Expand the section and return the buttons in the Strain row. */
  function expandAndGetStrainButtons() {
    render(<TokenDisplaySection />);
    fireEvent.click(screen.getByRole("button", { name: /token display settings/i }));
    const row = screen.getByText("Strain").closest("div")!;
    return {
      scene: row.querySelector("button:nth-child(1)") as HTMLButtonElement,
      show:  row.querySelector("button:nth-child(2)") as HTMLButtonElement,
      hide:  row.querySelector("button:nth-child(3)") as HTMLButtonElement,
    };
  }

  it("defaults to 'Scene' (null) active — indicated by btnActive class", () => {
    const { scene, show, hide } = expandAndGetStrainButtons();
    // Only the active segment has the bg-white/80 class.
    expect(scene.className).toContain("bg-white/80");
    expect(show.className).not.toContain("bg-white/80");
    expect(hide.className).not.toContain("bg-white/80");
  });

  it("clicking 'Show' sets showStrain to true in the store", () => {
    const { show } = expandAndGetStrainButtons();
    fireEvent.click(show);
    expect(useCharacterDataStore.getState().record.displayOverrides.showStrain).toBe(true);
  });

  it("clicking 'Hide' sets showStrain to false in the store", () => {
    const { hide } = expandAndGetStrainButtons();
    fireEvent.click(hide);
    expect(useCharacterDataStore.getState().record.displayOverrides.showStrain).toBe(false);
  });

  it("clicking 'Scene' after 'Show' reverts showStrain to null", () => {
    const { show, scene } = expandAndGetStrainButtons();
    fireEvent.click(show);
    fireEvent.click(scene);
    expect(useCharacterDataStore.getState().record.displayOverrides.showStrain).toBeNull();
  });
});

describe("TokenDisplaySection — showConditions override", () => {
  function expandAndGetConditionsButtons() {
    render(<TokenDisplaySection />);
    fireEvent.click(screen.getByRole("button", { name: /token display settings/i }));
    const row = screen.getByText("Conditions & Complications").closest("div")!;
    return {
      scene: row.querySelector("button:nth-child(1)") as HTMLButtonElement,
      show:  row.querySelector("button:nth-child(2)") as HTMLButtonElement,
      hide:  row.querySelector("button:nth-child(3)") as HTMLButtonElement,
    };
  }

  it("clicking 'Hide' sets showConditions to false in the store", () => {
    const { hide } = expandAndGetConditionsButtons();
    fireEvent.click(hide);
    expect(useCharacterDataStore.getState().record.displayOverrides.showConditions).toBe(false);
  });

  it("clicking 'Show' sets showConditions to true in the store", () => {
    const { show } = expandAndGetConditionsButtons();
    fireEvent.click(show);
    expect(useCharacterDataStore.getState().record.displayOverrides.showConditions).toBe(true);
  });
});

describe("TokenDisplaySection — injuryDisplay override", () => {
  function expandAndGetInjuryButtons() {
    render(<TokenDisplaySection />);
    fireEvent.click(screen.getByRole("button", { name: /token display settings/i }));
    const row = screen.getByText("Injuries").closest("div")!;
    return {
      scene:  row.querySelector("button:nth-child(1)") as HTMLButtonElement,
      all:    row.querySelector("button:nth-child(2)") as HTMLButtonElement,
      filled: row.querySelector("button:nth-child(3)") as HTMLButtonElement,
      none:   row.querySelector("button:nth-child(4)") as HTMLButtonElement,
    };
  }

  it("defaults to 'Scene' (null) active", () => {
    const { scene, all, filled, none } = expandAndGetInjuryButtons();
    expect(scene.className).toContain("bg-white/80");
    expect(all.className).not.toContain("bg-white/80");
    expect(filled.className).not.toContain("bg-white/80");
    expect(none.className).not.toContain("bg-white/80");
  });

  it("clicking 'All' sets injuryDisplay to 'all'", () => {
    const { all } = expandAndGetInjuryButtons();
    fireEvent.click(all);
    expect(useCharacterDataStore.getState().record.displayOverrides.injuryDisplay).toBe("all");
  });

  it("clicking 'Filled' sets injuryDisplay to 'filled-only'", () => {
    const { filled } = expandAndGetInjuryButtons();
    fireEvent.click(filled);
    expect(useCharacterDataStore.getState().record.displayOverrides.injuryDisplay).toBe("filled-only");
  });

  it("clicking 'None' sets injuryDisplay to 'none'", () => {
    const { none } = expandAndGetInjuryButtons();
    fireEvent.click(none);
    expect(useCharacterDataStore.getState().record.displayOverrides.injuryDisplay).toBe("none");
  });

  it("clicking 'Scene' after 'None' reverts injuryDisplay to null", () => {
    const { none, scene } = expandAndGetInjuryButtons();
    fireEvent.click(none);
    fireEvent.click(scene);
    expect(useCharacterDataStore.getState().record.displayOverrides.injuryDisplay).toBeNull();
  });
});

describe("TokenDisplaySection — showName override", () => {
  function expandAndGetNameButtons() {
    render(<TokenDisplaySection />);
    fireEvent.click(screen.getByRole("button", { name: /token display settings/i }));
    const row = screen.getByText("Token Name").closest("div")!;
    return {
      scene: row.querySelector("button:nth-child(1)") as HTMLButtonElement,
      show:  row.querySelector("button:nth-child(2)") as HTMLButtonElement,
      hide:  row.querySelector("button:nth-child(3)") as HTMLButtonElement,
    };
  }

  it("clicking 'Show' sets showName to true in the store", () => {
    const { show } = expandAndGetNameButtons();
    fireEvent.click(show);
    expect(useCharacterDataStore.getState().record.displayOverrides.showName).toBe(true);
  });

  it("clicking 'Hide' sets showName to false in the store", () => {
    const { hide } = expandAndGetNameButtons();
    fireEvent.click(hide);
    expect(useCharacterDataStore.getState().record.displayOverrides.showName).toBe(false);
  });
});

describe("TokenDisplaySection — active button reflects existing store state", () => {
  it("highlights 'Hide' for showStrain when store already has showStrain=false", () => {
    useCharacterDataStore.getState().setDisplayOverride({ showStrain: false });

    render(<TokenDisplaySection />);
    fireEvent.click(screen.getByRole("button", { name: /token display settings/i }));

    const row = screen.getByText("Strain").closest("div")!;
    const scene = row.querySelector("button:nth-child(1)") as HTMLButtonElement;
    const hide  = row.querySelector("button:nth-child(3)") as HTMLButtonElement;

    expect(hide.className).toContain("bg-white/80");
    expect(scene.className).not.toContain("bg-white/80");
  });

  it("highlights 'Filled' for injuryDisplay when store already has filled-only", () => {
    useCharacterDataStore.getState().setDisplayOverride({ injuryDisplay: "filled-only" });

    render(<TokenDisplaySection />);
    fireEvent.click(screen.getByRole("button", { name: /token display settings/i }));

    const row = screen.getByText("Injuries").closest("div")!;
    const filled = row.querySelector("button:nth-child(3)") as HTMLButtonElement;
    expect(filled.className).toContain("bg-white/80");
  });
});
