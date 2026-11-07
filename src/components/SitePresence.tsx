"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

function visitId() {
  const key = "tg-visit";
  const existing = sessionStorage.getItem(key);
  if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
  const next = crypto.randomUUID();
  sessionStorage.setItem(key, next);
  return next;
}

export function SitePresence() {
  const pathname = usePathname();
  const search = useSearchParams();
  const query = search.toString();

  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/api")) return;
    const id = visitId();
    const path = `${pathname}${query ? `?${query}` : ""}`;
    const send = (leaving = false) => {
      const body = JSON.stringify({
        id,
        path,
        title: document.title,
        referrer: document.referrer,
        language: navigator.language,
        width: window.innerWidth,
        leaving,
      });
      void fetch("/api/presence", {
        method: "POST",
        headers: { "content-type": "application/json", origin: location.origin },
        body,
        keepalive: true,
      });
    };
    send();
    const timer = window.setInterval(() => send(), 8000);
    const hide = () => {
      if (document.visibilityState === "hidden") send(true);
    };
    const leave = () => send(true);
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", leave);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", leave);
    };
  }, [pathname, query]);

  return null;
}
