"use client";

import React, { useState, useEffect } from "react";
import { Lottie } from "lottie-react";
import animationData from "@/assets/login-animation";

interface LottiePlayerProps {
  className?: string;
  loop?: boolean;
}

export default function LottiePlayer({ className = "w-full h-full", loop = true }: LottiePlayerProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className={`flex items-center justify-center animate-pulse ${className}`}>
        <div className="h-40 w-40 rounded-full bg-indigo-100/50 dark:bg-indigo-950/30" />
      </div>
    );
  }

  return (
    <div className={className}>
      <Lottie
        src={animationData}
        loop={loop}
        autoplay={true}
        className="w-full h-full"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
