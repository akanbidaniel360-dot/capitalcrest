import { useEffect, useState } from "react";
import { Download, X, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "cc_install_dismissed_at";
const DISMISS_DAYS = 7;

function isInIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export function InstallAppPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosMode, setIosMode] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isInIframe() || isStandalone()) return;

    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const days = (Date.now() - Number(dismissedAt)) / 86400000;
      if (days < DISMISS_DAYS) return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS fallback (no beforeinstallprompt event)
    if (isIOS()) {
      const t = setTimeout(() => {
        setIosMode(true);
        setShow(true);
      }, 2500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onPrompt);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    } else {
      dismiss();
    }
    setDeferred(null);
  };

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex justify-center p-3 sm:p-4">
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Install Capital Crest</p>
            {iosMode ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Tap <Share className="inline h-3 w-3" /> Share, then "Add to Home Screen" <Plus className="inline h-3 w-3" />
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Get the full app experience — fast, offline-friendly, fits your home screen.
              </p>
            )}
          </div>
          <button onClick={dismiss} className="text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {!iosMode && (
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="ghost" className="flex-1" onClick={dismiss}>
              Not now
            </Button>
            <Button size="sm" className="flex-1" onClick={install}>
              Install
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
