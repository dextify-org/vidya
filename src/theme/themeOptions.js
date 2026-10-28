export const THEME_STORAGE_KEY = "vidya-theme-preferences";

export const DESIGN_PRESETS = {
  classic: {
    navigation: "horizontal",
    content: "container",
    background: "gradient",
  },
  theme2: {
    navigation: "vertical",
    content: "full",
    background: "solid",
  },
  theme3: {
    navigation: "horizontal",
    content: "container",
    background: "solid",
  },
};

export const DEFAULT_THEME_PREFERENCES = {
  design: "classic",
  color: "coral",
  mode: "light",
  font: "poppins",
  fontSize: "medium",
  transitions: "enabled",
  ...DESIGN_PRESETS.classic,
};

export const THEME_OPTIONS = {
  designs: [
    { value: "classic", label: "Original" },
    { value: "theme2", label: "Theme 2" },
    { value: "theme3", label: "Theme 3" },
  ],
  colors: [
    { value: "coral", label: "Coral", swatch: "#e20044" },
    { value: "ocean", label: "Ocean", swatch: "#0077b6" },
    { value: "forest", label: "Forest", swatch: "#2f855a" },
    { value: "violet", label: "Violet", swatch: "#7c3aed" },
  ],
  modes: [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ],
  fonts: [
    { value: "poppins", label: "Poppins" },
    { value: "montserrat", label: "Montserrat" },
    { value: "inter", label: "Inter" },
    { value: "lato", label: "Lato" },
  ],
  fontSizes: [
    { value: "small", label: "Small" },
    { value: "medium", label: "Medium" },
    { value: "large", label: "Large" },
  ],
  transitions: [
    { value: "enabled", label: "Enabled" },
    { value: "disabled", label: "Disabled" },
  ],
  navigation: [
    { value: "vertical", label: "Vertical" },
    { value: "compact", label: "Vertical compact" },
    { value: "horizontal", label: "Horizontal" },
  ],
  content: [
    { value: "container", label: "Container" },
    { value: "full", label: "Full width" },
  ],
  background: [
    { value: "gradient", label: "Gradient" },
    { value: "image", label: "Image" },
    { value: "solid", label: "Solid" },
  ],
};

const OPTION_VALUES = {
  design: new Set(THEME_OPTIONS.designs.map(({ value }) => value)),
  color: new Set(THEME_OPTIONS.colors.map(({ value }) => value)),
  mode: new Set(THEME_OPTIONS.modes.map(({ value }) => value)),
  font: new Set(THEME_OPTIONS.fonts.map(({ value }) => value)),
  fontSize: new Set(THEME_OPTIONS.fontSizes.map(({ value }) => value)),
  transitions: new Set(THEME_OPTIONS.transitions.map(({ value }) => value)),
  navigation: new Set(THEME_OPTIONS.navigation.map(({ value }) => value)),
  content: new Set(THEME_OPTIONS.content.map(({ value }) => value)),
  background: new Set(THEME_OPTIONS.background.map(({ value }) => value)),
};

export const GOOGLE_FONT_STYLESHEETS = {
  montserrat:
    "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap",
  inter:
    "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
  lato:
    "https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap",
};

export const normaliseThemePreferences = (stored = {}) => {
  const source =
    stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
  const migrated = {
    ...source,
    background:
      source.background === "color" ? "gradient" : source.background,
  };

  return Object.fromEntries(
    Object.entries(DEFAULT_THEME_PREFERENCES).map(([key, fallback]) => [
      key,
      OPTION_VALUES[key].has(migrated[key]) ? migrated[key] : fallback,
    ]),
  );
};

export const applyDesignPreset = (preferences, design) => {
  const selectedDesign = DESIGN_PRESETS[design] ? design : "classic";

  return {
    ...normaliseThemePreferences(preferences),
    design: selectedDesign,
    ...DESIGN_PRESETS[selectedDesign],
  };
};
