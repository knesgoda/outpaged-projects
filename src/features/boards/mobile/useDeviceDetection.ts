import { useEffect, useMemo, useState } from "react";

export interface DeviceCapabilities {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  supportsTouch: boolean;
  platform: "ios" | "android" | "web" | "unknown";
}

const MOBILE_MAX_WIDTH = 768;
const TABLET_MAX_WIDTH = 1024;

const detectPlatform = (userAgent: string): DeviceCapabilities["platform"] => {
  const normalized = userAgent.toLowerCase();
  if (/(iphone|ipad|ipod)/.test(normalized)) return "ios";
  if (/android/.test(normalized)) return "android";
  if (/macintosh|windows|linux/.test(normalized)) return "web";
  return "unknown";
};

const getInitialState = (): DeviceCapabilities => {
  if (typeof window === "undefined") {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      supportsTouch: false,
      platform: "unknown",
    };
  }

  const width = window.innerWidth;
  const supportsTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const platform = detectPlatform(navigator.userAgent);

  const isMobile = width <= MOBILE_MAX_WIDTH || (supportsTouch && platform !== "web");
  const isTablet = !isMobile && width <= TABLET_MAX_WIDTH;

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    supportsTouch,
    platform,
  };
};

export function useDeviceDetection(): DeviceCapabilities {
  const [state, setState] = useState<DeviceCapabilities>(() => getInitialState());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setState(getInitialState());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return state;
}

export function useIsMobile() {
  const device = useDeviceDetection();
  return useMemo(() => device.isMobile, [device.isMobile]);
}
