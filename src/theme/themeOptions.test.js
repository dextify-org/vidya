import { describe, expect, it } from "vitest";
import {
  applyDesignPreset,
  DEFAULT_THEME_PREFERENCES,
  normaliseThemePreferences,
} from "./themeOptions.js";

describe("theme preferences", () => {
  it("migrates legacy preferences and removes unsupported keys", () => {
    expect(
      normaliseThemePreferences({
        background: "color",
        color: "ocean",
        surface: "flat",
      }),
    ).toEqual({
      ...DEFAULT_THEME_PREFERENCES,
      color: "ocean",
      background: "gradient",
    });
  });

  it("falls back when stored values are malformed", () => {
    expect(
      normaliseThemePreferences({
        design: "unknown",
        navigation: "diagonal",
        mode: "dark",
      }),
    ).toEqual({
      ...DEFAULT_THEME_PREFERENCES,
      mode: "dark",
    });

    expect(normaliseThemePreferences(null)).toEqual(
      DEFAULT_THEME_PREFERENCES,
    );
  });

  it("applies layout defaults without replacing color or mode", () => {
    expect(
      applyDesignPreset(
        {
          ...DEFAULT_THEME_PREFERENCES,
          color: "forest",
          mode: "dark",
        },
        "theme2",
      ),
    ).toEqual({
      design: "theme2",
      color: "forest",
      mode: "dark",
      font: "poppins",
      fontSize: "medium",
      transitions: "enabled",
      navigation: "vertical",
      content: "full",
      background: "solid",
    });
  });
});
