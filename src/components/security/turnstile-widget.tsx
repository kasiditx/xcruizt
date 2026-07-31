"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

import type { TurnstileAction } from "@/lib/security/turnstile-policy";

declare global {
  interface Window {
    turnstile?: {
      remove(widgetId: string): void;
      render(
        container: HTMLElement,
        options: {
          action: TurnstileAction;
          sitekey: string;
          theme: "dark";
        },
      ): string;
      reset(widgetId: string): void;
    };
  }
}

const TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function TurnstileWidget({
  action,
  resetSignal,
  siteKey,
}: {
  action: TurnstileAction;
  resetSignal: string;
  siteKey: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (
      !scriptReady ||
      !containerRef.current ||
      !window.turnstile ||
      widgetIdRef.current
    ) {
      return;
    }

    widgetIdRef.current = window.turnstile.render(
      containerRef.current,
      { action, sitekey: siteKey, theme: "dark" },
    );

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, [action, scriptReady, siteKey]);

  useEffect(() => {
    if (resetSignal && widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, [resetSignal]);

  return (
    <div className="turnstile-field">
      <Script
        onReady={() => setScriptReady(true)}
        src={TURNSTILE_SCRIPT_URL}
        strategy="afterInteractive"
      />
      <div aria-label="Security verification" ref={containerRef} />
    </div>
  );
}
