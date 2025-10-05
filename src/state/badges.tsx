import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type BadgeCounts = {
  inboxCount: number;
  myWorkCount: number;
  setInboxCount: (count: number) => void;
  setMyWorkCount: (count: number) => void;
};

const BadgesContext = createContext<BadgeCounts | undefined>(undefined);

export function BadgesProvider({ children }: { children: ReactNode }) {
  const [inboxCount, setInboxCount] = useState(5);
  const [myWorkCount, setMyWorkCount] = useState(3);

  const value = useMemo(
    () => ({
      inboxCount,
      myWorkCount,
      setInboxCount,
      setMyWorkCount,
    }),
    [inboxCount, myWorkCount]
  );

  return <BadgesContext.Provider value={value}>{children}</BadgesContext.Provider>;
}

export function useBadges() {
  const context = useContext(BadgesContext);
  if (!context) {
    throw new Error("useBadges must be used within a BadgesProvider");
  }

  return context;
}

// TODO: Replace mock values with live data once notification APIs are wired up.
