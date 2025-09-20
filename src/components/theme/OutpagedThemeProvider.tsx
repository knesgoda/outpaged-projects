import { ThemeProvider as NextThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { enableOutpagedBrand } from "@/lib/featureFlags";

type OutpagedThemeProviderProps = {
  children: ReactNode;
};

export function OutpagedThemeProvider({ children }: OutpagedThemeProviderProps) {
  if (!enableOutpagedBrand) {
    return <>{children}</>;
  }

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
