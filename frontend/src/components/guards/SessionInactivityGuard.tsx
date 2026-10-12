"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/tailgrids/core/dialog";
import { Button } from "@/components/tailgrids/core/button";
import { AlertCircle } from "lucide-react";

interface Props {
  children: React.ReactNode;
  timeoutMinutes?: number;
  warningMinutes?: number;
}

export function SessionInactivityGuard({
  children,
  timeoutMinutes = 60,
  warningMinutes = 5,
}: Props) {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(warningMinutes * 60);

  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const totalTimeoutMs = timeoutMinutes * 60 * 1000;
  const warningThresholdMs = (timeoutMinutes - warningMinutes) * 60 * 1000;

  const handleLogout = useCallback(() => {
    setShowWarning(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_profile");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login?reason=inactivity";
      }
    }
  }, []);

  const handleExtendSession = () => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    setSecondsRemaining(warningMinutes * 60);
  };

  const recordActivity = useCallback(() => {
    if (!showWarning) {
      lastActivityRef.current = Date.now();
    }
  }, [showWarning]);

  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, recordActivity, { passive: true });
    });

    timerRef.current = setInterval(() => {
      // Hanya pantau jika user sedang login (ada token)
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      if (!token) return;

      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= totalTimeoutMs) {
        handleLogout();
      } else if (elapsed >= warningThresholdMs) {
        const remaining = Math.max(0, Math.floor((totalTimeoutMs - elapsed) / 1000));
        setSecondsRemaining(remaining);
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    }, 1000);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, recordActivity);
      });
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [totalTimeoutMs, warningThresholdMs, handleLogout, recordActivity]);

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  return (
    <>
      {children}

      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent className="max-w-md border-amber-500/50 bg-white p-6 shadow-2xl dark:bg-gray-900">
          <DialogHeader className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <AlertCircle className="h-8 w-8 animate-pulse" />
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
              Peringatan Inaktivitas Sesi
            </DialogTitle>
          </DialogHeader>

          <div className="my-4 text-center text-sm text-gray-600 dark:text-gray-300">
            <p className="mb-2">
              Anda tidak aktif selama hampir {timeoutMinutes - warningMinutes} menit. Demi keamanan sistem, akun Anda akan otomatis dikeluarkan dalam:
            </p>
            <div className="my-3 inline-block rounded-xl bg-amber-50 px-6 py-2.5 font-mono text-3xl font-extrabold tracking-wider text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              {formatCountdown(secondsRemaining)}
            </div>
            <p className="text-xs text-gray-400">
              Klik &quot;Lanjutkan Sesi&quot; di bawah untuk tetap melanjutkan pekerjaan Anda.
            </p>
          </div>

          <div className="mt-4 flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleLogout}
            >
              Keluar Sekarang
            </Button>
            <Button
              className="flex-1 bg-indigo-600 font-semibold text-white hover:bg-indigo-700"
              onClick={handleExtendSession}
            >
              Lanjutkan Sesi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
