import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Profile } from "@/types";
import { getMyProfile } from "@/services/profile";

type ProfileContextValue = {
  profile: Profile | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  setProfile: Dispatch<SetStateAction<Profile | null>>;
};

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!isMountedRef.current) {
      return;
    }

    setLoading(true);
    try {
      const data = await getMyProfile();
      if (!isMountedRef.current) {
        return;
      }
      setProfile(data);
      setError(null);
    } catch (err) {
      console.error("Failed to load profile", err);
      if (!isMountedRef.current) {
        return;
      }
      setProfile(null);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ profile, loading, error, refresh, setProfile }),
    [profile, loading, error, refresh, setProfile]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfileState() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfileState must be used within ProfileProvider");
  }
  return context;
}
