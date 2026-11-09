"use client";

import { useEffect, useState } from "react";

export function useIsMobileDevice(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      if (typeof window === "undefined") return false;

      // 1. Check user agent for mobile device signature
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || "";
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(userAgent);

      // 2. Check viewport width (< 1024px represents mobile/small tablet layout in Tailwind)
      const isMobileViewport = window.matchMedia("(max-width: 1023px)").matches;

      // 3. Check touch capability with small screen
      const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isTouchSmallScreen = hasTouch && window.innerWidth < 1024;

      return isMobileUA || isMobileViewport || isTouchSmallScreen;
    };

    setIsMobile(checkIsMobile());

    const handleResize = () => {
      setIsMobile(checkIsMobile());
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  return isMobile;
}

