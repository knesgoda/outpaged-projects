import { useEffect } from "react";
import { useBlocker } from "react-router-dom";

export function useUnsavedChangesPrompt(when: boolean, message = "You have unsaved changes. Leave without saving?") {
  const blocker = useBlocker(when);

  useEffect(() => {
    if (blocker.state === "blocked") {
      const confirmLeave = window.confirm(message);
      if (confirmLeave) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker, message]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (when) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [when]);
}
