import type { ReactNode } from "react";
import { ThemeProvider } from "./theme-context";

type OutpagedThemeProviderProps = {
  children: ReactNode;
};

export function OutpagedThemeProvider({ children }: OutpagedThemeProviderProps) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
