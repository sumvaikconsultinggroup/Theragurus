"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  clinic,
  appointmentStatusLabel,
  formatAppointment,
  googleCalendarLink,
  visitModes,
  type Appointment,
} from "@/lib/booking-catalog";
import {
  BookingIcon,
  BookingLoading,
  BookingShell,
  bookingRequest,
  messageFor,
  Notice,
} from "./BookingUI";
import { TimePicker } from "./TimePicker";
import { toast } from "@/components/Toast";

export function BookingDetail({ id }: { id: string }) {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [action, setAction] = useState<"cancel" | "reschedule" | null>(null);
  const [busy, setBusy] = useState(false);
  const [start, setStart] = useState("");
  const [timezone, setTimezone] = useState(clinic.timezone);
  const [notice, setNotice] = useState("");
  const [intake, setIntake] = useState({ hope: "", timing: "", contact: "either" });
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    bookingRequest<{ appointment: Appointment }>(
      `/api/bookings/${id}`,
      undefined,
      "GET",
      controller.signal,
    )
      .then(({ appointment }) => {
        setAppointment(appointment);
        setNow(Date.now());
        setTimezone(appointment.timezone);
        setError("");
      })
      .catch((error) => {
        if (error.name !== "AbortError") setError(messageFor(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, retry]);
  async function update(next: "cancel" | "reschedule") {
    setBusy(true);
    setActionError("");
    try {
      const { appointment } = await bookingRequest<{
        appointment: Appointment;
      }>(`/api/bookings/${id}`, { action: next, start }, "PATCH");
      setAppointment(appointment);
      setAction(null);
      const text =
        next === "cancel"
          ? "Your appointment request has been cancelled. No payment was taken."
          : "Your preferred time has been updated. The clinic still needs to confirm the appointment.";
      setNotice(text);
      toast({
        title: next === "cancel" ? "Request cancelled." : "Time updated.",
        detail: text,
      });
    } catch (error) {
      const text = messageFor(error);
      setActionError(text);
      toast({ title: text, tone: "alert" });
    } finally {
      setBusy(false);
    }
  }
  const upcoming =
    appointment &&
    new Date(appointment.start).getTime() > now &&
    appointment.status !== "cancelled";
  return (
    <BookingShell
      title={
        appointment?.status === "cancelled"
          ? "Your request is cancelled."
          : "Your care, one step closer."
      }
      description="Your appointment details and next steps, together in one place."
    >
      {loading ? (
        <BookingLoading label="Finding your appointment…" />
      ) : error ? (
        <div className="booking-workspace">
          <Notice error>{error}</Notice>
          <div className="booking-step-actions">
            <button
              className="booking-button booking-button--secondary"
              onClick={() => {
                setLoading(true);
                setRetry(retry + 1);
              }}
            >
              Try again
            </button>
            <Link className="booking-button" href="/account">
              Sign in to your account
            </Link>
          </div>
        </div>
      ) : (
        appointment && (
          <div className="booking-layout">
            <div className="booking-workspace">
              <div
                className={`booking-confirmation ${appointment.status === "cancelled" ? "booking-confirmation--cancelled" : ""}`}
              >
                <span className="booking-confirmation-icon">
                  <BookingIcon
                    name={
                      appointment.status === "cancelled" ? "calendar" : "check"
                    }
                  />
                </span>
                <div>
                  <h2>
                    {appointment.status === "cancelled"
                      ? "Cancelled"
                      : appointment.reviewStatus === "confirmed"
                        ? "Your appointment is confirmed."
                        : appointment.reviewStatus === "completed"
                          ? "Your appointment is completed."
                          : appointment.reviewStatus === "no_show"
                            ? "Appointment not attended."
                            : "Your appointment request is saved."}
                  </h2>
                  <p>
                    {appointment.status === "cancelled"
                      ? "You can start a new request whenever you’re ready."
                      : appointment.reviewStatus === "confirmed"
                        ? "The clinic has confirmed your appointment. Contact us if you need to discuss your visit or fees."
                        : ["completed", "no_show"].includes(
                              appointment.reviewStatus || "",
                            )
                          ? "Your appointment record has been updated by the clinic."
                          : "Your preferred time is awaiting clinic confirmation. Please contact the clinic to confirm your time and any fees."}
                  </p>
                </div>
              </div>
              <div className="booking-reference">
                <span>Booking reference</span>
                <strong>{appointment.reference}</strong>
                <span
                  className={`booking-status ${appointment.status === "cancelled" ? "booking-status--cancelled" : ""}`}
                >
                  {appointmentStatusLabel(appointment)}
                </span>
              </div>
              {notice && <Notice>{notice}</Notice>}
              <div className="booking-review">
                <div>
                  <h3>{appointment.serviceName}</h3>
                  <dl>
                    <div>
                      <dt>Preferred time</dt>
                      <dd>
                        {formatAppointment(
                          appointment.start,
                          appointment.timezone,
                        )}
                      </dd>
                    </div>
                    {appointment.timezone !== clinic.timezone && (
                      <div>
                        <dt>Pacific time</dt>
                        <dd>{formatAppointment(appointment.start)}</dd>
                      </div>
                    )}
                    <div>
                      <dt>Visit type</dt>
                      <dd>{visitModes[appointment.mode]}</dd>
                    </div>
                    <div>
                      <dt>Provider</dt>
                      <dd>{clinic.provider}</dd>
                    </div>
                    {appointment.mode === "clinic" && (
                      <div>
                        <dt>Address</dt>
                        <dd>{clinic.address}</dd>
                      </div>
                    )}
                    {appointment.program && (
                      <div>
                        <dt>Program</dt>
                        <dd>{appointment.program}</dd>
                      </div>
                    )}
                    {appointment.couponCode && (
                      <div>
                        <dt>Coupon</dt>
                        <dd>
                          {appointment.couponName || appointment.couponCode}
                          {appointment.discount ? ` · USD ${appointment.discount.toFixed(2)} off` : ""}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
                <div>
                  <h3>Contact details</h3>
                  <dl>
                    <div>
                      <dt>Name</dt>
                      <dd>{appointment.name}</dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>{appointment.email}</dd>
                    </div>
                    <div>
                      <dt>Phone</dt>
                      <dd>{appointment.phone}</dd>
                    </div>
                    <div>
                      <dt>Location</dt>
                      <dd>
                        {appointment.region}, {appointment.country}
                      </dd>
                    </div>
                    {appointment.organization && (
                      <div>
                        <dt>Organization</dt>
                        <dd>{appointment.organization}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
              <div className="booking-payment">
                <BookingIcon name="lock" />
                <div>
                  <h3>
                    {appointment.paymentStatus === "not_required"
                      ? "Complimentary consultation"
                      : appointment.paymentStatus === "collected"
                        ? "Cash received at the clinic"
                        : appointment.amount !== null
                          ? `Due in cash: $${appointment.amount.toFixed(2)} USD`
                          : "Pay in cash when you arrive"}
                  </h3>
                  <p>
                    {appointment.paymentStatus === "not_required"
                      ? "No payment is required for your initial phone consultation."
                      : appointment.paymentStatus === "collected"
                        ? "The clinic has marked this visit as paid in cash. Nothing was charged online."
                        : "Bring cash to your visit. We do not collect payment online."}
                  </p>
                  <div className="booking-payment-total">
                    <span>
                      {appointment.paymentStatus === "collected"
                        ? "Collected in cash"
                        : appointment.paymentStatus === "not_required"
                          ? "Due at your visit"
                          : "Due in cash"}
                    </span>
                    <strong>
                      {appointment.paymentStatus === "not_required"
                        ? "$0.00"
                        : appointment.amount !== null
                          ? `$${appointment.amount.toFixed(2)}`
                          : "At the clinic"}
                    </strong>
                  </div>
                </div>
              </div>
              {upcoming && (
                <>
                  <div className="booking-detail-actions">
                    <a
                      className="booking-button booking-button--secondary"
                      href={`/api/bookings/${id}/calendar`}
                    >
                      Save appointment time (.ics)
                    </a>
                    <a
                      className="booking-button booking-button--secondary"
                      href={googleCalendarLink(appointment)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Add to Google Calendar
                    </a>
                    <button
                      type="button"
                      className="booking-text-button"
                      onClick={() => {
                        setAction(
                          action === "reschedule" ? null : "reschedule",
                        );
                        setActionError("");
                        setStart("");
                      }}
                    >
                      Change preferred time
                    </button>
                    <button
                      type="button"
                      className="booking-text-button booking-cancel-link"
                      onClick={() => {
                        setAction(action === "cancel" ? null : "cancel");
                        setActionError("");
                      }}
                    >
                      Cancel request
                    </button>
                  </div>
                  {action === "reschedule" && (
                    <section className="booking-inline-action">
                      <h3>Choose a new preferred time.</h3>
                      <TimePicker
                        selected={start}
                        onSelect={setStart}
                        timezone={timezone}
                        onTimezone={setTimezone}
                        bookingId={id}
                      />
                      <div className="booking-step-actions">
                        <button
                          className="booking-text-button"
                          type="button"
                          disabled={busy}
                          onClick={() => setAction(null)}
                        >
                          Keep current time
                        </button>
                        <button
                          className="booking-button"
                          type="button"
                          disabled={!start || busy}
                          onClick={() => update("reschedule")}
                        >
                          {busy ? "Saving…" : "Save new preferred time"}
                        </button>
                      </div>
                    </section>
                  )}
                  {action === "cancel" && (
                    <div className="booking-inline-action">
                      <h3>Cancel this appointment request?</h3>
                      <p>
                        This will release your preferred time. You can make a
                        new request later.
                      </p>
                      <div className="booking-step-actions">
                        <button
                          className="booking-text-button"
                          type="button"
                          disabled={busy}
                          onClick={() => setAction(null)}
                        >
                          Keep appointment
                        </button>
                        <button
                          className="booking-button booking-button--danger"
                          type="button"
                          disabled={busy}
                          onClick={() => update("cancel")}
                        >
                          {busy ? "Cancelling…" : "Yes, cancel request"}
                        </button>
                      </div>
                    </div>
                  )}
                  {actionError && <Notice error>{actionError}</Notice>}
                </>
              )}
              {appointment.status !== "cancelled" && !appointment.intake && (
                <form
                  className="booking-inline-action"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setBusy(true);
                    setActionError("");
                    void bookingRequest<{ appointment: Appointment }>(
                      `/api/bookings/${id}`,
                      { action: "intake", ...intake },
                      "PATCH",
                    )
                      .then(({ appointment: next }) => {
                        setAppointment(next);
                        setNotice("Saved. These notes stay with the appointment request, not a clinical chart.");
                        toast({
                          title: "Notes saved.",
                          detail: "They stay with the appointment request, not a clinical chart.",
                        });
                      })
                      .catch((reason) => {
                        const text = messageFor(reason);
                        setActionError(text);
                        toast({ title: text, tone: "alert" });
                      })
                      .finally(() => setBusy(false));
                  }}
                >
                  <h3>A few notes before the visit</h3>
                  <p>
                    Scheduling only. Tell us what you hope to cover and how to reach you. This is not a medical record.
                  </p>
                  <label className="booking-field">
                    What would you like this visit to help with?
                    <textarea
                      required
                      maxLength={300}
                      rows={3}
                      value={intake.hope}
                      onChange={(event) => setIntake({ ...intake, hope: event.target.value })}
                    />
                  </label>
                  <label className="booking-field">
                    Anything about timing or travel? <small>(optional)</small>
                    <textarea
                      maxLength={300}
                      rows={2}
                      value={intake.timing}
                      onChange={(event) => setIntake({ ...intake, timing: event.target.value })}
                    />
                  </label>
                  <label className="booking-field">
                    Best way to reach you
                    <select
                      value={intake.contact}
                      onChange={(event) => setIntake({ ...intake, contact: event.target.value })}
                    >
                      <option value="either">Email or phone</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                    </select>
                  </label>
                  <button className="booking-button" disabled={busy}>
                    {busy ? "Saving…" : "Save these notes"}
                  </button>
                </form>
              )}
              {appointment.intake && (
                <div className="booking-inline-action">
                  <h3>Notes you shared</h3>
                  <p>{appointment.intake.hope}</p>
                  {appointment.intake.timing && <p>{appointment.intake.timing}</p>}
                </div>
              )}
              <p className="booking-help">
                Guest bookings stay in this browser for 30 days. This page
                shows the latest status, including when the clinic confirms the
                time. When email sending is connected, you’ll also get a message
                at {appointment.email}.
              </p>
              <div className="booking-step-actions">
                <Link className="booking-text-link" href="/account">
                  View all my bookings
                </Link>
                <Link className="booking-button" href="/book">
                  Book another service <BookingIcon name="arrow" />
                </Link>
              </div>
            </div>
            <aside className="booking-sidebar">
              <div className="booking-next-steps">
                <h2>What happens next?</h2>
                <ol>
                  <li>
                    <strong>Connect with the clinic.</strong>
                    <p>Call {clinic.phone} and share your booking reference.</p>
                  </li>
                  <li>
                    <strong>Confirm your care.</strong>
                    <p>
                      We’ll agree on the time, session length, location, and any
                      fees.
                    </p>
                  </li>
                  <li>
                    <strong>Come as you are.</strong>
                    <p>
                      The clinic will share any preparation or online joining
                      details with you.
                    </p>
                  </li>
                </ol>
                <a className="booking-button" href="tel:+16616256322">
                  Call the clinic
                </a>
              </div>
              <div className="booking-support">
                <h3>Keep your care together.</h3>
                <p>An account helps you manage your bookings across devices.</p>
                <Link href="/account">Go to your account</Link>
              </div>
            </aside>
          </div>
        )
      )}
    </BookingShell>
  );
}
