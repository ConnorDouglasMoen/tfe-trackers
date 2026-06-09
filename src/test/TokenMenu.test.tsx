// @vitest-environment jsdom
/**
 * Tests for TokenMenu / TokenDisplaySection.
 *
 * Covers the two behaviours unique to TokenMenu that are not exercised by
 * existing tests:
 *
 *  1. handleAdjustSeriousTier adapter — the store-based wrapper that converts
 *     a tier delta (+1/-1) into the correct setHasSerious / setSeriousCount
 *     pair. Tested via useCharacterDataStore directly (no rendering needed)
 *     since the logic is a pure store operation.
 *
 *  2. TokenDisplaySection button states — RTL tests verifying:
 *       a. The currently active override value is visually indicated.
 *       b. Clicking a button updates the store via setDisplayOverride.
 *       c. Null ("Scene") / bool ("Show"/"Hide") / injuryDisplay variants
 *          all work correctly.
 *
 * TokenDisplaySection is tested in isolation (not through the full TokenMenu)
 * because TokenMenu requires a live OBR selection subscription and store
 * initialisation that adds no value to these focused tests.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useCharacterDataStore } from "../useCharacterDataStore";
import { createDefaultTokenRecord, getActiveData } from "../characterDataHelpers";
import { TokenDisplaySection } from "../tokenMenu/TokenMenu";

// ─── Store reset ──────────────────────────────────────────────────────────────

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

// ─── handleAdjustSeriousTier (store-level adapter) ────────────────────────────
//
// TokenMenu's handleAdjustSeriousTier calls setHasSerious / setSeriousCount
// based on the current tier (0/1/2) and the delta (+1/-1).  These tests
// exercise every boundary transition through the store actions directly,
// mirroring how the adapter is invoked at runtime.

describe("handleAdjustSeriousTier adapter logic", () => {
  /** Replicate the adapter logic from TokenMenu exactly. */
  function adjustTier(delta: 1 | -1) {
    const { data, setHasSerious, setSeriousCount } = useCharacterDataStore.getState();
    const seriousLevel = !data.hasSerious ? 0 : data.seriousCount === 2 ? 2 : 1;
    const next = seriousLevel + delta;
    if (next <= 0) setHasSerious(false);
    else if (next === 1) { setHasSerious(true); setSeriousCount(1); }
    else if (next >= 2) { setHasSerious(true); setSeriousCount(2); }
  }

  it("increments from tier 0 (none) to tier 1 (one serious slot)", () => {
    // Start with hasSerious = false (tier 0).
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
    // Already at tier 2 (default survivor).
    adjustTier(+1);

    const data = useCharacterDataStore.getState().data;
    expect(data.hasSerious).toBe(true);
    expect(data.seriousCount).toBe(2);
  });

  it("decrements from tier 2 to tier 1", () => {
    // Default survivor is tier 2.
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

// ─── TokenDisplaySection: collapsible visibility ─────────────────────────────

describe("TokenDisplaySection collapse toggle", () => {
  it("hides override controls by default (collapsed)", () => {
    render(<TokenDisplaySection />);

    // The section header should be present.
    expect(screen.getByRole("button", { name: /token display settings/i })).toBeInTheDocument();
    // The Strain row controls are NOT rendered until expanded.
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

// ─── TokenDisplaySection: showStrain override buttons ────────────────────────

describe("TokenDisplaySection — showStrain override", () => {
  /** Expand the section and return the buttons in the Strain row. */
  function expandAndGetStrainButtons() {
    render(<TokenDisplaySection />);
    fireEvent.click(screen.getByRole("button", { name: /token display settings/i }));
    // The Strain row has three buttons: Scene (null), Show (true), Hide (false).
    const row = screen.getByText("Strain").closest("div")!;
    return {
      scene: row.querySelector("button:nth-child(1)") as HTMLButtonElement,
      show:  row.querySelector("button:nth-child(2)") as HTMLButtonElement,
      hide:  row.querySelector("button:nth-child(3)") as HTMLButtonElement,
    };
  }

  it("defaults to 'Scene' (null) active — indicated by btnActive class", () => {
    const { scene, show, hide } = expandAndGetStrainButtons();
    // btnActive includes bg-white/80; btnInactive does not. Use class substring.
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

// ─── TokenDisplaySection: showConditions override buttons ────────────────────

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

// ─── TokenDisplaySection: injuryDisplay override buttons ─────────────────────

describe("TokenDisplaySection — injuryDisplay override", () => {
  function expandAndGetInjuryButtons() {
    render(<TokenDisplaySection />);
    fireEvent.click(screen.getByRole("button", { name: /token display settings/i }));
    const row = screen.getByText("Injuries").closest("div")!;
    // Four options: Scene (null), All, Filled, None.
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

// ─── TokenDisplaySection: showName override buttons ──────────────────────────

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

// ─── TokenDisplaySection: active button reflects pre-set store state ──────────

describe("TokenDisplaySection — active button reflects existing store state", () => {
  it("highlights 'Hide' for showStrain when store already has showStrain=false", () => {
    // Pre-seed the store with a non-null override before rendering.
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
