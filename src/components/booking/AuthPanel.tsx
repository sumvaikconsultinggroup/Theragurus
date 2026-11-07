"use client";
import { useState, type FormEvent } from "react";
import type { Customer } from "@/lib/booking-catalog";
import { toast } from "@/components/Toast";
import { bookingRequest, Field, messageFor, Notice } from "./BookingUI";

export function AuthPanel({
  onSuccess,
  initial = "login",
}: {
  onSuccess: (customer: Customer, recoveryCode?: string) => void;
  initial?: "login" | "register";
}) {
  const [mode, setMode] = useState<"login" | "register" | "recover">(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await bookingRequest<{
        customer: Customer;
        recoveryCode?: string;
      }>(`/api/auth/${mode}`, Object.fromEntries(form));
      toast({ title: mode === "register" ? "Account created." : "Signed in." });
      onSuccess(result.customer, result.recoveryCode);
    } catch (error) {
      const text = messageFor(error);
      setError(text);
      toast({ title: text, tone: "alert" });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="booking-auth-panel">
      <div className="booking-auth-tabs" aria-label="Account options">
        {(["login", "register"] as const).map((item) => (
          <button
            type="button"
            key={item}
            aria-pressed={mode === item}
            onClick={() => {
              setMode(item);
              setError("");
            }}
          >
            {item === "login" ? "Sign in" : "Create an account"}
          </button>
        ))}
      </div>
      <h3>
        {mode === "recover"
          ? "Recover your account"
          : mode === "register"
            ? "Keep your care in one place."
            : "Welcome back."}
      </h3>
      <p>
        {mode === "recover"
          ? "Use the recovery code you saved when creating your account. A new code will replace it."
          : mode === "register"
            ? "Save your appointments and manage future visits."
            : "Sign in to view and manage your appointments."}
      </p>
      <form onSubmit={submit} className="booking-form">
        {mode === "register" && (
          <Field label="Full name">
            <input name="name" autoComplete="name" required maxLength={100} />
          </Field>
        )}
        <Field label="Email address">
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </Field>
        {mode === "recover" && (
          <Field label="Recovery code">
            <input
              name="recoveryCode"
              autoComplete="off"
              required
              maxLength={100}
            />
          </Field>
        )}
        <Field
          label={mode === "recover" ? "New password" : "Password"}
          hint={
            mode === "login"
              ? undefined
              : "Use 12 or more characters. A longer passphrase works well."
          }
        >
          <span className="booking-password">
            <input
              name="password"
              type={visible ? "text" : "password"}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={mode === "login" ? 1 : 12}
              maxLength={128}
              required
            />
            <button
              type="button"
              aria-label={visible ? "Hide password" : "Show password"}
              aria-pressed={visible}
              onClick={() => setVisible(!visible)}
            >
              {visible ? "Hide" : "Show"}
            </button>
          </span>
        </Field>
        {mode === "register" && (
          <p className="booking-help">
            You’ll receive a recovery code here after creating your account.
            Save it somewhere private; email password resets aren’t connected
            yet.
          </p>
        )}
        {error && <Notice error>{error}</Notice>}
        <button className="booking-button" disabled={busy}>
          {busy
            ? "Please wait…"
            : mode === "register"
              ? "Create account"
              : mode === "recover"
                ? "Reset password"
                : "Sign in"}
        </button>
        {mode === "login" && (
          <button
            type="button"
            className="booking-text-button"
            onClick={() => {
              setMode("recover");
              setError("");
            }}
          >
            Forgot your password?
          </button>
        )}
        {mode === "recover" && (
          <button
            type="button"
            className="booking-text-button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Back to sign in
          </button>
        )}
      </form>
    </div>
  );
}

export function RecoveryCode({
  code,
  onClose,
}: {
  code: string;
  onClose: () => void;
}) {
  return (
    <div className="booking-recovery" role="status">
      <h3>Save your recovery code.</h3>
      <p>
        This code lets you reset your password. Store it privately before
        continuing. It is shown only now.
      </p>
      <code>{code}</code>
      <button
        className="booking-button booking-button--secondary"
        type="button"
        onClick={onClose}
      >
        I’ve saved my code
      </button>
    </div>
  );
}
