import { useEffect, useRef } from "react";
import { type HomeUserState } from "./types";

const STORAGE_KEY = "outpaged:home:user";

export function loadPersistedUserHome(): HomeUserState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HomeUserState;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch (error) {
    console.warn("Failed to load persisted Home state", error);
    return null;
  }
}

export function useHomeUserPersistence(userHome: HomeUserState) {
  const isInitial = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(userHome));
    } catch (error) {
      console.warn("Failed to persist Home state", error);
    }
  }, [userHome]);
}

export function clearPersistedUserHome() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to clear Home state", error);
  }
}
