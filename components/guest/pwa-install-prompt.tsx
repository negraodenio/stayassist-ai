"use client";

import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already running as standalone PWA
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone
    ) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIos(isiOS);

    // Android / Chrome: capture the native install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Already installed — don't show anything
  if (isInstalled) return null;

  async function handleInstallClick() {
    if (deferredPrompt) {
      // Android / Chrome native flow
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      // iOS — show instructions
      setShowIosGuide((prev) => !prev);
    }
  }

  // Don't show on desktop browsers that don't support PWA install
  if (!deferredPrompt && !isIos) return null;

  return (
    <div className="mb-5">
      <button
        onClick={handleInstallClick}
        type="button"
        className="flex w-full items-center gap-3 rounded-2xl border border-accent/25 bg-accent/[0.06] px-5 py-4 text-left transition hover:border-accent/40 hover:bg-accent/[0.1] active:scale-[0.99]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-white shadow-sm">
          <Smartphone size={18} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-navy">
            Install Malia Concierge
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
            Add to your home screen for instant access
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-navy px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white">
          Install
        </span>
      </button>

      {/* iOS Instructions */}
      {showIosGuide && isIos && (
        <div className="mt-3 rounded-2xl border border-border bg-white/90 p-5 text-sm leading-relaxed text-navy shadow-sm backdrop-blur-sm">
          <p className="mb-3 font-semibold">To install on iPhone / iPad:</p>
          <ol className="space-y-2 text-muted">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-white">1</span>
              <span>Tap the <strong className="text-navy">Share</strong> button <span className="inline-block translate-y-[1px]">⬆️</span> at the bottom of Safari</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-white">2</span>
              <span>Scroll down and tap <strong className="text-navy">"Add to Home Screen"</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-white">3</span>
              <span>Tap <strong className="text-navy">"Add"</strong> — done!</span>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
