"use client";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import {
  formatAppointment,
  appointmentStatusLabel,
  visitModes,
  type Appointment,
  type Customer,
} from "@/lib/booking-catalog";
import { toast } from "@/components/Toast";
import { RecoveryCode } from "./AuthPanel";
import { clerkUiReady, ClerkSignOut, CustomerSignInForm } from "./CustomerSignIn";
import {
  BookingIcon,
  BookingLoading,
  BookingShell,
  Notice,
  bookingRequest,
  messageFor,
} from "./BookingUI";

export function CustomerAccount() {
  return clerkUiReady ? <ConnectedAccount /> : <AccountContent sessionId={null} />;
}

function ConnectedAccount() {
  const { isLoaded, sessionId } = useAuth();
  return <AccountContent sessionId={isLoaded ? sessionId ?? null : undefined} />;
}

function AccountContent({ sessionId }: { sessionId: string | null | undefined }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recovery, setRecovery] = useState("");
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (sessionId === undefined) return;
    const controller = new AbortController();
    Promise.all([
      bookingRequest<{ customer: Customer | null }>(
        "/api/auth/session",
        undefined,
        "GET",
        controller.signal,
      ),
      bookingRequest<{ appointments: Appointment[] }>(
        "/api/bookings",
        undefined,
        "GET",
        controller.signal,
      ),
    ])
      .then(([session, bookings]) => {
        setNow(Date.now());
        setCustomer(session.customer);
        setAppointments(bookings.appointments);
        setError("");
      })
      .catch((error) => {
        if (error.name !== "AbortError") setError(messageFor(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [version, sessionId]);
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await bookingRequest("/api/auth/logout", {});
      setCustomer(null);
      setAppointments([]);
      setRecovery("");
      setVersion(version + 1);
      toast({ title: "Signed out." });
    } catch (error) {
      const text = messageFor(error);
      setError(text);
      toast({ title: text, tone: "alert" });
    } finally {
      setBusy(false);
    }
  }
  const selected = appointments
    .filter((a) =>
      filter === "upcoming"
        ? a.status === "requested" && new Date(a.start).getTime() > now
        : a.status === "cancelled" || new Date(a.start).getTime() <= now,
    )
    .sort((a, b) =>
      filter === "upcoming"
        ? a.start.localeCompare(b.start)
        : b.start.localeCompare(a.start),
    );
  return (
    <BookingShell
      title={
        customer
          ? `A little space for your care, ${customer.name.split(" ")[0]}.`
          : "Your care, all together."
      }
      description="View your appointments, update a preferred time, and find your next step."
      account={false}
      className="booking-page--account"
    >
      {loading ? (
        <BookingLoading label="Loading your account…" />
      ) : (
        <>
          {error && (
            <Notice error>
              {error}{" "}
              <button
                className="booking-text-button"
                onClick={() => {
                  setLoading(true);
                  setVersion(version + 1);
                }}
              >
                Try again
              </button>
            </Notice>
          )}
          {recovery && (
            <RecoveryCode code={recovery} onClose={() => setRecovery("")} />
          )}
          {!customer && (
            <div className="booking-account-welcome">
              <div className="booking-account-intro">
                <BookingIcon name="person" />
                <h2>One less thing to keep track of.</h2>
                <p>
                  Create an account or sign in to see your appointment requests
                  across devices.
                </p>
                <ul>
                  <li>
                    <BookingIcon /> Your bookings in one place
                  </li>
                  <li>
                    <BookingIcon /> Change a preferred time
                  </li>
                  <li>
                    <BookingIcon /> Cancel a request when plans change
                  </li>
                </ul>
                <Link className="booking-text-link" href="/book">
                  Prefer to book as a guest? Start here
                </Link>
                {appointments.length > 0 && (
                  <Notice>
                    Your guest bookings are shown below. Signing in with the
                    same email in this browser keeps those bookings with you.
                  </Notice>
                )}
              </div>
              <div className="booking-auth-panel">
                <CustomerSignInForm />
              </div>
            </div>
          )}
          {(customer || appointments.length > 0) && (
            <section className="booking-dashboard">
              <div className="booking-dashboard-heading">
                <div>
                  <h2>
                    {customer ? "Your appointments" : "Your guest appointments"}
                  </h2>
                  {customer && <p>{customer.email}</p>}
                </div>
                <div className="booking-dashboard-actions">
                  <Link className="booking-button" href="/book">
                    Book a service <BookingIcon name="arrow" />
                  </Link>
                  {customer &&
                    (clerkUiReady ? (
                      <ClerkSignOut
                        onDone={() => {
                          setCustomer(null);
                          setAppointments([]);
                          setVersion(version + 1);
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="booking-text-button"
                        disabled={busy}
                        onClick={logout}
                      >
                        {busy ? "Signing out…" : "Sign out"}
                      </button>
                    ))}
                </div>
              </div>
              <div className="booking-category">
                <button
                  type="button"
                  aria-pressed={filter === "upcoming"}
                  onClick={() => setFilter("upcoming")}
                >
                  Upcoming
                </button>
                <button
                  type="button"
                  aria-pressed={filter === "past"}
                  onClick={() => setFilter("past")}
                >
                  Past & cancelled
                </button>
              </div>
              {selected.length ? (
                <div className="booking-appointments">
                  {selected.map((appointment) => (
                    <article
                      key={appointment.id}
                      className="booking-appointment"
                    >
                      <div className="booking-appointment-date">
                        <span>
                          {new Intl.DateTimeFormat("en-US", {
                            month: "short",
                            timeZone: appointment.timezone,
                          }).format(new Date(appointment.start))}
                        </span>
                        <strong>
                          {new Intl.DateTimeFormat("en-US", {
                            day: "numeric",
                            timeZone: appointment.timezone,
                          }).format(new Date(appointment.start))}
                        </strong>
                      </div>
                      <div>
                        <span
                          className={`booking-status ${appointment.status === "cancelled" ? "booking-status--cancelled" : ""}`}
                        >
                          {appointmentStatusLabel(appointment)}
                        </span>
                        <h3>{appointment.serviceName}</h3>
                        <p>
                          {formatAppointment(
                            appointment.start,
                            appointment.timezone,
                          )}
                        </p>
                        <small>
                          {visitModes[appointment.mode]} ·{" "}
                          {appointment.reference}
                          {appointment.paymentStatus === "collected"
                            ? " · Cash collected"
                            : appointment.paymentStatus === "due_at_visit"
                              ? " · Cash due at the visit"
                              : ""}
                        </small>
                      </div>
                      <Link
                        className="booking-button booking-button--secondary"
                        href={`/booking/${appointment.id}`}
                      >
                        View booking
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="booking-empty">
                  <BookingIcon name="calendar" />
                  <h3>
                    {filter === "upcoming"
                      ? "A fresh place to begin."
                      : "No past appointments yet."}
                  </h3>
                  <p>
                    {filter === "upcoming"
                      ? "When you book a service, your appointment request will appear here."
                      : "Past and cancelled requests will be kept here for your reference."}
                  </p>
                  {filter === "upcoming" && (
                    <Link className="booking-button" href="/book">
                      Find your next step
                    </Link>
                  )}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </BookingShell>
  );
}
