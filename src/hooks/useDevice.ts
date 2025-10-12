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

const buildCapabilities = (): DeviceCapabilities => {
  if (typeof window === "undefined") {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      supportsTouch: false,
      platform: "unknown",
    } satisfies DeviceCapabilities;
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
  } satisfies DeviceCapabilities;
};

export function useDeviceCapabilities(): DeviceCapabilities {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>(() => buildCapabilities());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setCapabilities(buildCapabilities());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return capabilities;
}

export function useIsMobile(): boolean {
  const device = useDeviceCapabilities();
  return useMemo(() => device.isMobile, [device.isMobile]);
}

export function useIsTablet(): boolean {
  const device = useDeviceCapabilities();
  return useMemo(() => device.isTablet, [device.isTablet]);
}

export function useIsDesktop(): boolean {
  const device = useDeviceCapabilities();
  return useMemo(() => device.isDesktop, [device.isDesktop]);
}
