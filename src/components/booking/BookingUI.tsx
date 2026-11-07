"use client";
import Link from "next/link";
import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ReactNode,
} from "react";

export class RequestError extends Error {
  constructor(
    message: string,
    public field?: string,
    public status?: number,
  ) {
    super(message);
  }
}
export async function bookingRequest<T>(
  url: string,
  body?: unknown,
  method = "POST",
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(url, {
    method: body === undefined ? "GET" : method,
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal,
  });
  const data = await response.json();
  if (!response.ok)
    throw new RequestError(
      data.error || "Something went wrong. Please try again.",
      data.field,
      response.status,
    );
  return data as T;
}
export const messageFor = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";
export function Field({
  label,
  hint,
  children,
  optional = false,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  optional?: boolean;
}) {
  const id = useId();
  function bindControl(node: ReactNode): ReactNode {
    if (
      !isValidElement<{
        children?: ReactNode;
        id?: string;
        "aria-describedby"?: string;
      }>(node)
    )
      return node;
    if (["input", "select", "textarea"].includes(String(node.type))) {
      return cloneElement(node, {
        id,
        "aria-describedby": hint ? `${id}-hint` : undefined,
      });
    }
    return node.props.children
      ? cloneElement(node, {}, Children.map(node.props.children, bindControl))
      : node;
  }
  return (
    <div className="booking-field">
      <label htmlFor={id}>
        {label}
        {optional && <small> (optional)</small>}
      </label>
      {Children.map(children, bindControl)}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`booking-notice ${error ? "booking-notice--error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function BookingIcon({
  name = "check",
}: {
  name?: "check" | "calendar" | "lock" | "arrow" | "person";
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "calendar" ? (
        <>
          <rect x="4" y="6" width="16" height="15" rx="3" />
          <path d="M8 3v6m8-6v6M4 12h16m-11 4h2" />
        </>
      ) : name === "lock" ? (
        <>
          <rect x="5" y="10" width="14" height="11" rx="3" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
        </>
      ) : name === "arrow" ? (
        <path d="M5 12h14m-6-6 6 6-6 6" />
      ) : name === "person" ? (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
        </>
      ) : (
        <path d="m5 12 4 4L19 6" />
      )}
    </svg>
  );
}
export function BookingLoading({
  label = "Getting things ready…",
}: {
  label?: string;
}) {
  return (
    <div className="booking-loading" role="status">
      <div />
      <div />
      <div />
      <p>{label}</p>
    </div>
  );
}
export function BookingShell({
  title,
  description,
  children,
  className = "",
  account = true,
}: {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  account?: boolean;
}) {
  return (
    <section className={`booking-page ${className}`}>
      <div className="tg-container">
        <nav className="booking-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/book">Book your care</Link>
          {account && (
            <Link className="booking-account-link" href="/account">
              <BookingIcon name="person" /> My bookings
            </Link>
          )}
        </nav>
        <div className="booking-page-heading">
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {children}
      </div>
    </section>
  );
}
