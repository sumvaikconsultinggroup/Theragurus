"use client";

import { useEffect, useRef, useState } from "react";
import "./Toast.css";

export type ToastTone = "success" | "note" | "alert";

type ToastInput = {
  title: string;
  detail?: string;
  tone?: ToastTone;
  onRetry?: () => void;
};

type ToastItem = Required<Pick<ToastInput, "title" | "tone">> & {
  id: number;
  detail?: string;
  onRetry?: () => void;
};

const DURATION = 5600;
let nextId = 1;
let items: ToastItem[] = [];
const listeners = new Set<(next: ToastItem[]) => void>();

function publish(next: ToastItem[]) {
  items = next;
  listeners.forEach((listener) => listener(items));
}

export function toast(input: ToastInput) {
  const item: ToastItem = {
    id: nextId++,
    title: input.title,
    detail: input.detail,
    tone: input.tone ?? "success",
    onRetry: input.onRetry,
  };
  publish([item, ...items].slice(0, 3));
  return item.id;
}

export function dismissToast(id: number) {
  publish(items.filter((item) => item.id !== id));
}

export function ToastViewport() {
  const [current, setCurrent] = useState<ToastItem[]>([]);
  useEffect(() => {
    listeners.add(setCurrent);
    setCurrent(items);
    return () => {
      listeners.delete(setCurrent);
    };
  }, []);
  return (
    <div className="tg-toasts">
      {current.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === "alert") {
    return (
      <span className="tg-toast-icon" aria-hidden="true">
        <svg viewBox="0 0 16 16">
          <path d="M5.1 5.1 10.9 10.9M10.9 5.1 5.1 10.9" />
        </svg>
      </span>
    );
  }
  if (tone === "note") {
    return (
      <span className="tg-toast-icon" aria-hidden="true">
        <svg viewBox="0 0 16 16">
          <circle cx="8" cy="4.4" r="0.9" fill="currentColor" stroke="none" />
          <path d="M8 7.1v5" />
        </svg>
      </span>
    );
  }
  return (
    <span className="tg-toast-icon" aria-hidden="true">
      <svg viewBox="0 0 16 16">
        <path d="M4 8.2 6.7 10.8 12 5.2" />
      </svg>
    </span>
  );
}

function ToastCard({ item }: { item: ToastItem }) {
  const left = useRef(DURATION);
  const stamp = useRef(0);
  const timer = useRef<number | null>(null);

  function clear() {
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = null;
  }
  function arm(ms: number) {
    clear();
    stamp.current = performance.now();
    left.current = ms;
    timer.current = window.setTimeout(() => dismissToast(item.id), ms);
  }

  useEffect(() => {
    arm(DURATION);
    return clear;
  }, [item.id]);

  return (
    <article
      className={`tg-toast tg-toast--${item.tone}`}
      role={item.tone === "alert" ? "alert" : "status"}
      onMouseEnter={() => {
        left.current = Math.max(0, left.current - (performance.now() - stamp.current));
        clear();
      }}
      onMouseLeave={() => arm(Math.max(left.current, 1200))}
    >
      <ToastIcon tone={item.tone} />
      <div className="tg-toast-body">
        <div className="tg-toast-row">
          <p className="tg-toast-title">{item.title}</p>
          <button type="button" className="tg-toast-close" aria-label="Dismiss" onClick={() => dismissToast(item.id)}>
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M4.2 4.2 11.8 11.8M11.8 4.2 4.2 11.8" />
            </svg>
          </button>
        </div>
        {item.detail ? <p className="tg-toast-detail">{item.detail}</p> : null}
        {item.tone === "alert" ? (
          <div className="tg-toast-actions">
            {item.onRetry ? (
              <button
                type="button"
                className="tg-toast-retry"
                onClick={() => {
                  const retry = item.onRetry;
                  dismissToast(item.id);
                  retry?.();
                }}
              >
                Retry
              </button>
            ) : null}
            <button type="button" className="tg-toast-dismiss" onClick={() => dismissToast(item.id)}>
              Dismiss
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
