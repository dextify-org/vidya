import { useEffect, useRef } from "react";
import { THEME_OPTIONS } from "../../theme/themeOptions.js";
import { useTheme } from "../../theme/ThemeContext.jsx";

const PreferenceGroup = ({
  title,
  preference,
  options,
  onSelect,
  variant,
}) => {
  const { preferences, updatePreference } = useTheme();

  return (
    <fieldset className="theme-preference-group">
      <legend>{title}</legend>
      <div className="theme-preference-options">
        {options.map(({ value, label, swatch }) => {
          const id = `${preference}-${value}`;
          const selected = preferences[preference] === value;

          return (
            <label
              className={`theme-preference-option${variant ? ` theme-preference-option--${variant}` : ""}${selected ? " is-selected" : ""}`}
              htmlFor={id}
              key={value}
            >
              <input
                checked={selected}
                id={id}
                name={preference}
                onChange={() =>
                  onSelect
                    ? onSelect(value)
                    : updatePreference(preference, value)
                }
                type="radio"
                value={value}
              />
              {variant === "design" && (
                <span
                  aria-hidden="true"
                  className={`theme-design-preview theme-design-preview--${value}`}
                >
                  <span />
                  <span />
                </span>
              )}
              {swatch && (
                <span
                  className="theme-color-swatch"
                  style={{ backgroundColor: swatch }}
                />
              )}
              <span>{label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};

const ThemePreferences = () => {
  const contentRef = useRef(null);
  const { applyDesign, preferences, resetPreferences } = useTheme();

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [preferences.design]);

  return (
    <div className="settings-content theme-settings" ref={contentRef}>
      <div className="settings-title">Display Settings</div>
      <PreferenceGroup
        title="Design"
        preference="design"
        options={THEME_OPTIONS.designs}
        onSelect={applyDesign}
        variant="design"
      />
      <PreferenceGroup
        title="Theme color"
        preference="color"
        options={THEME_OPTIONS.colors}
      />
      <PreferenceGroup
        title="Theme mode"
        preference="mode"
        options={THEME_OPTIONS.modes}
      />
      <PreferenceGroup
        title="Font"
        preference="font"
        options={THEME_OPTIONS.fonts}
      />
      <PreferenceGroup
        title="Text size"
        preference="fontSize"
        options={THEME_OPTIONS.fontSizes}
      />
      <PreferenceGroup
        title="Navigation"
        preference="navigation"
        options={THEME_OPTIONS.navigation}
      />
      <PreferenceGroup
        title="Content"
        preference="content"
        options={THEME_OPTIONS.content}
      />
      <PreferenceGroup
        title="Background"
        preference="background"
        options={THEME_OPTIONS.background}
      />
      <PreferenceGroup
        title="Page transitions"
        preference="transitions"
        options={THEME_OPTIONS.transitions}
      />
      <button
        className="theme-reset-button"
        onClick={resetPreferences}
        type="button"
      >
        Reset display settings
      </button>
    </div>
  );
};

export default ThemePreferences;
