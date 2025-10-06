import { useEffect } from "react";

const APP_NAME = "Outpaged";

export function useDocumentTitle(title: string) {
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const previous = document.title;
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME;

    return () => {
      document.title = previous;
    };
  }, [title]);
}
