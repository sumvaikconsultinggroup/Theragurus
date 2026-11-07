"use client";

import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowIcon } from "@/components/Ui";
import "./CustomerAuth.css";
import { useRouter, useSearchParams } from "next/navigation";
import {
  HandleSSOCallback,
  SignIn,
  SignUp,
  useClerk,
} from "@clerk/nextjs";
import { clerkUiReady, safeReturnPath } from "@/lib/clerk-public";
import { BookingShell } from "./BookingUI";

export { clerkUiReady };

export function ClerkSignOut({ onDone }: { onDone: () => void }) {
  const { signOut } = useClerk();
  return (
    <button
      type="button"
      className="booking-text-button"
      onClick={() => {
        void signOut({ redirectUrl: "/account" }).then(onDone);
      }}
    >
      Sign out
    </button>
  );
}

const authAppearance = {
  options: { unsafe_disableDevelopmentModeWarnings: true, socialButtonsVariant: "blockButton" as const },
  variables: {
    colorPrimary: "#78c000", colorText: "#2e4856", colorTextSecondary: "#526b77",
    borderRadius: "10px", fontFamily: "var(--font-sans), sans-serif",
    fontSize: "14px", spacingUnit: "16px",
  },
  elements: {
    rootBox: "tg-auth-root", cardBox: "tg-auth-card-box", card: "tg-auth-card",
    header: "tg-auth-header", headerTitle: "tg-auth-title", headerSubtitle: "tg-auth-subtitle",
    socialButtonsBlockButton: "tg-auth-social-button", formButtonPrimary: "tg-auth-primary",
    form: "tg-auth-form", formFieldInput: "tg-auth-input", formFieldLabel: "tg-auth-label",
    footer: "tg-auth-footer", footerAction: "tg-auth-footer-action",
  },
};

export function CustomerSignInForm({ next = "/account" }: { next?: string }) {
  if (!clerkUiReady) return <div role="status"><h3>Account sign-in is being connected.</h3><p>You can still book as a guest and keep your appointment reference.</p><Link className="booking-button" href="/book">Continue as a guest</Link></div>;
  const destination = safeReturnPath(next);
  return <SignIn routing="hash" signUpUrl={`/sign-up?redirect_url=${encodeURIComponent(destination)}`} forceRedirectUrl={destination} fallbackRedirectUrl={destination} appearance={authAppearance} />;
}

function AuthCard({ mode }: { mode: "sign-in" | "sign-up" }) {
  const next = safeReturnPath(useSearchParams().get("redirect_url"));
  if (!clerkUiReady) {
    return (
      <BookingShell
        title="Sign in"
        description="Guest booking works today. Google sign-in turns on once accounts are connected."
      >
        <div className="booking-auth-panel">
          <h3>Sign in is almost ready.</h3>
          <p>
            You can book as a guest now. Google and email sign-in will appear
            here after the clinic finishes connecting accounts. Nothing is
            charged online. You pay in cash when you arrive.
          </p>
          <Link className="booking-button" href="/book">
            Book as a guest
          </Link>
        </div>
      </BookingShell>
    );
  }
  return (
    <section className="booking-page auth-route" aria-labelledby="customer-auth-title">
      <div className="auth-route-container">
        <Link className="auth-back-link" href="/account"><ArrowIcon diagonal={false} /> Back to my bookings</Link>
        <div className="auth-route-layout">
          <div className="auth-route-form">
            <header className="auth-route-heading">
              <h1 id="customer-auth-title">{mode === "sign-up" ? "Create your account." : "Welcome back."}</h1>
              <p>{mode === "sign-up" ? "A little less to keep track of. Bring your appointments together in one place." : "Sign in to see your appointments and find your next step."}</p>
            </header>
            <div className="auth-route-fields">
        {mode === "sign-in" ? (
          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl={`/sign-up?redirect_url=${encodeURIComponent(next)}`}
            forceRedirectUrl={next}
            fallbackRedirectUrl={next}
            appearance={authAppearance}
          />
        ) : (
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl={`/sign-in?redirect_url=${encodeURIComponent(next)}`}
            forceRedirectUrl={next}
            fallbackRedirectUrl={next}
            appearance={authAppearance}
          />
        )}
            </div>
            <Link href="/book" className="auth-guest-link">Prefer to book as a guest? <span>Start here <ArrowIcon diagonal={false} /></span></Link>
          </div>
          <aside className="auth-route-story" aria-label="Care at your pace">
            <Image src="/mobile/woodland-portrait.jpg" alt="A quiet path through a green forest" fill sizes="(min-width: 801px) 44vw, 1px" loading="eager" />
            <div className="auth-route-story-copy">
              <h2>Your pace.<br /><em>Your path.</em></h2>
              <p>One place for your bookings.<br />A little more room for you.</p>
              <Link href="/about-us">Get to know TheraGurus <ArrowIcon diagonal={false} /></Link>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

export function CustomerAuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
  return (
    <Suspense fallback={<p role="status">Loading sign-in…</p>}>
      <AuthCard mode={mode} />
    </Suspense>
  );
}

export function ClerkCallback() {
  const router = useRouter();
  return (
    <BookingShell
      title="Signing you in"
      description="Google is sending you back to your bookings."
    >
      {clerkUiReady ? (
        <HandleSSOCallback
          navigateToApp={({ decorateUrl }) => {
            const stored = safeReturnPath(sessionStorage.getItem("tg-auth-next"));
            sessionStorage.removeItem("tg-auth-next");
            const destination = decorateUrl(stored);
            if (destination.startsWith("http")) {
              window.location.href = destination;
              return;
            }
            router.push(destination);
          }}
          navigateToSignIn={() => router.push("/sign-in")}
          navigateToSignUp={() => router.push("/sign-up")}
        />
      ) : (
        <p>Sign-in is waiting for the Clerk keys. You can book as a guest.</p>
      )}
    </BookingShell>
  );
}
