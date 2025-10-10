import { ThemeProvider as NextThemeProvider } from "next-themes";
import type { ReactNode } from "react";

type OutpagedThemeProviderProps = {
  children: ReactNode;
};

export function OutpagedThemeProvider({ children }: OutpagedThemeProviderProps) {
  return (
    <NextThemeProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      value={{
        light: "outpaged-light",
        dark: "outpaged-dark",
      }}
    >
      {children}
    </NextThemeProvider>
  );
}
