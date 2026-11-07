"use client";
import { useState, type FormEvent } from "react";
import { toast } from "@/components/Toast";
import "./Newsletter.css";
export function Newsletter({
  action,
  token,
}: {
  action?: string;
  token?: string;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const r = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action
            ? { action, token }
            : {
                email: form.get("email"),
                consent: form.get("consent") === "on",
              },
        ),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setDone(true);
      const text =
        action === "unsubscribe"
          ? "You’re unsubscribed. You can join again whenever you’d like."
          : action === "confirm"
            ? "You’re subscribed. Welcome to the TheraGurus community."
            : "Check your inbox to confirm your subscription.";
      setMessage(text);
      toast({
        title:
          action === "unsubscribe"
            ? "Unsubscribed."
            : action === "confirm"
              ? "You’re subscribed."
              : "Check your inbox.",
        detail: text,
      });
    } catch (e) {
      const text = e instanceof Error ? e.message : "Please try again.";
      setMessage(text);
      toast({ title: text, tone: "alert" });
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="tg-section newsletter-section">
      <div className="tg-container newsletter-layout">
        <div>
          <h2>
            {action === "unsubscribe"
              ? "Manage your subscription."
              : action === "confirm"
                ? "A little knowledge. A little more confidence."
                : "Thoughtful guidance, in your inbox."}
          </h2>
          <p>
            {action
              ? "Confirm your choice below."
              : "Pelvic health education, practical movement ideas, and a healthier approach to your workday. Join our newsletter for occasional updates."}
          </p>
        </div>
        <form onSubmit={submit}>
          {!action && !done && (
            <>
              <label htmlFor="newsletter-email">Email address</label>
              <input
                id="newsletter-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
              <label className="newsletter-consent">
                <input type="checkbox" name="consent" required />
                <span>
                  I’d like to receive TheraGurus news and wellbeing updates. I
                  can unsubscribe at any time.
                </span>
              </label>
            </>
          )}
          {!done && (
            <button type="submit" disabled={busy}>
              {busy
                ? "Please wait…"
                : action === "unsubscribe"
                  ? "Unsubscribe"
                  : action === "confirm"
                    ? "Confirm subscription"
                    : "Join the newsletter"}
            </button>
          )}
          <p role="status" className="newsletter-message">
            {message}
          </p>
        </form>
      </div>
    </section>
  );
}
