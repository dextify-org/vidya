import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  applyDesignPreset,
  DEFAULT_THEME_PREFERENCES,
  GOOGLE_FONT_STYLESHEETS,
  normaliseThemePreferences,
  THEME_STORAGE_KEY,
} from "./themeOptions.js";

const ThemeContext = createContext(null);
const FONT_STYLESHEET_ID = "vidya-selected-google-font";

const getStoredPreferences = () => {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored
      ? normaliseThemePreferences(JSON.parse(stored))
      : DEFAULT_THEME_PREFERENCES;
  } catch {
    return DEFAULT_THEME_PREFERENCES;
  }
};

export const ThemeProvider = ({ children }) => {
  const [preferences, setPreferences] = useState(getStoredPreferences);

  useEffect(() => {
    const root = document.documentElement;

    Object.entries(preferences).forEach(([key, value]) => {
      root.dataset[`theme${key[0].toUpperCase()}${key.slice(1)}`] = value;
    });
    root.removeAttribute("data-theme-surface");

    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    const stylesheet = GOOGLE_FONT_STYLESHEETS[preferences.font];
    const currentLink = document.getElementById(FONT_STYLESHEET_ID);

    if (!stylesheet) {
      currentLink?.remove();
      return;
    }

    if (currentLink?.getAttribute("href") === stylesheet) return;

    const link = currentLink || document.createElement("link");
    link.id = FONT_STYLESHEET_ID;
    link.rel = "stylesheet";
    link.href = stylesheet;

    if (!currentLink) document.head.appendChild(link);
  }, [preferences.font]);

  const value = useMemo(
    () => ({
      preferences,
      updatePreference: (key, selectedValue) =>
        setPreferences((current) => ({ ...current, [key]: selectedValue })),
      applyDesign: (design) =>
        setPreferences((current) => applyDesignPreset(current, design)),
      resetPreferences: () => setPreferences(DEFAULT_THEME_PREFERENCES),
    }),
    [preferences],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
};
