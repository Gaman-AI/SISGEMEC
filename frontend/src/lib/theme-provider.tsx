import * as React from "react";

type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
};

const ThemeContext = React.createContext<ThemeContextValue>({
  theme: "system",
  setTheme: () => {},
});

type ThemeProviderProps = {
  defaultTheme?: Theme;
  children: React.ReactNode;
};

export function ThemeProvider({ defaultTheme = "system", children }: ThemeProviderProps) {
  const [theme, setTheme] = React.useState<Theme>(() => {
    const saved = localStorage.getItem("sisgemec.theme") as Theme | null;
    return saved ?? defaultTheme;
  });

  React.useEffect(() => {
    localStorage.setItem("sisgemec.theme", theme);
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.add(prefersDark ? "dark" : "light");
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return React.useContext(ThemeContext);
}
