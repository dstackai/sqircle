import type { ReactNode } from "react";
import type { SquircleTheme } from "../squircle";

interface PageShellProps {
  title: string;
  description: string;
  theme: SquircleTheme;
  onThemeChange: (theme: SquircleTheme) => void;
  children: ReactNode;
}

export function PageShell({ title, description, theme, onThemeChange, children }: PageShellProps) {
  return (
    <main className={theme === "dark" ? "sq-page sq-page-dark" : "sq-page"} data-theme={theme}>
      <header className="sq-page-topbar">
        <div>
          <a className="sq-page-mark" href="./index.html">Squircle</a>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <nav className="sq-page-actions" aria-label="Examples">
          <a href="./index.html">Index</a>
          <a href="./demo.html">Demo</a>
          <a href="./events.html">Hover</a>
          <a href="./constructor.html">Constructor</a>
          <ThemeSwitch theme={theme} onThemeChange={onThemeChange} />
        </nav>
      </header>
      {children}
    </main>
  );
}

export function ThemeSwitch({
  theme,
  onThemeChange
}: {
  theme: SquircleTheme;
  onThemeChange: (theme: SquircleTheme) => void;
}) {
  return (
    <div className="sq-page-theme" role="group" aria-label="Theme">
      <button type="button" aria-pressed={theme === "light"} onClick={() => onThemeChange("light")}>
        Light
      </button>
      <button type="button" aria-pressed={theme === "dark"} onClick={() => onThemeChange("dark")}>
        Dark
      </button>
    </div>
  );
}
