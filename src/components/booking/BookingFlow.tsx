"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  bookingServices,
  clinic,
  feeLabel,
  formatAppointment,
  serviceById,
  visitModes,
  type Appointment,
  type Customer,
  type VisitMode,
} from "@/lib/booking-catalog";
import { toast } from "@/components/Toast";
import { RecoveryCode } from "./AuthPanel";
import { clerkUiReady } from "./CustomerSignIn";
import {
  BookingIcon,
  BookingShell,
  Field,
  Notice,
  bookingRequest,
  messageFor,
  RequestError,
} from "./BookingUI";
import { TimePicker } from "./TimePicker";

const steps = [
  "Your service",
  "Date & time",
  "Your details",
  "Review & finish",
];
type Details = {
  name: string;
  email: string;
  phone: string;
  country: string;
  region: string;
  organization: string;
  consent: boolean;
  couponCode: string;
};
export function BookingFlow({
  initialServiceId = "",
}: {
  initialServiceId?: string;
}) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const initial = serviceById(initialServiceId);
  const [serviceId, setServiceId] = useState(initial?.id || "");
  const service = serviceById(serviceId);
  const [category, setCategory] = useState<"all" | "individual" | "workplace">(
    "all",
  );
  const [mode, setMode] = useState<VisitMode>(initial?.modes[0] || "phone");
  const [program, setProgram] = useState("");
  const [step, setStep] = useState(0);
  const [start, setStart] = useState("");
  const [timezone, setTimezone] = useState(clinic.timezone);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [auth, setAuth] = useState<"guest" | "login" | "register">("guest");
  const [sessionReady, setSessionReady] = useState(false);
  const [details, setDetails] = useState<Details>({
    name: "",
    email: "",
    phone: "",
    country: "United States",
    region: "",
    organization: "",
    consent: false,
    couponCode: "",
  });
  const [couponLabel, setCouponLabel] = useState("");
  const [couponError, setCouponError] = useState("");
  const [waitlistOffer, setWaitlistOffer] = useState(false);
  const [waitlistNote, setWaitlistNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState("");
  const key = useRef("");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    bookingRequest<{ customer: Customer | null }>("/api/auth/session")
      .then(({ customer }) => {
        setCustomer(customer);
        if (customer)
          setDetails((d) => ({
            ...d,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
          }));
      })
      .catch(() => {})
      .finally(() => {
        setSessionReady(true);
        setTimezone(
          Intl.DateTimeFormat().resolvedOptions().timeZone || clinic.timezone,
        );
      });
    key.current = crypto.randomUUID();
  }, []);
  function changeStep(next: number) {
    setError("");
    setStep(next);
    requestAnimationFrame(() => {
      heading.current?.scrollIntoView({
        block: "start",
        behavior: reduced ? "instant" : "smooth",
      });
    });
  }
  function selectService(id: string) {
    const next = serviceById(id)!;
    setServiceId(id);
    setMode(next.modes[0]);
    setProgram(next.options?.[0] || "");
    setStart("");
    key.current = crypto.randomUUID();
  }
  function submitDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    changeStep(3);
  }
  async function finish() {
    if (!service || !start || !details.consent) return;
    setError("");
    setBusy(true);
    try {
      const { appointment } = await bookingRequest<{
        appointment: Appointment;
      }>("/api/bookings", {
        ...details,
        serviceId,
        mode,
        program,
        start,
        timezone,
        couponCode: details.couponCode,
        idempotencyKey: key.current,
      });
      toast({
        title: "Request sent.",
        detail: "The clinic still needs to confirm the time.",
      });
      router.push(`/booking/${appointment.id}?created=1`);
    } catch (error) {
      const text = messageFor(error);
      setError(text);
      toast({ title: text, tone: "alert" });
      if (error instanceof RequestError && error.status === 409 && error.field === "start") {
        setWaitlistOffer(true);
        setStep(1);
      } else if (error instanceof RequestError && error.field === "start") setStep(1);
      else if (error instanceof RequestError && error.field === "couponCode") setStep(2);
      else if (
        error instanceof RequestError &&
        error.field &&
        error.field in details
      )
        setStep(2);
      setBusy(false);
    }
  }
  return (
    <BookingShell
      title="Let’s find your next step."
      description="A little time for you. Choose your care, find a time, and we’ll take it from there."
    >
      <ol className="booking-stepper" aria-label="Booking progress">
        {steps.map((label, i) => (
          <li
            key={label}
            className={i === step ? "is-active" : i < step ? "is-complete" : ""}
            aria-current={i === step ? "step" : undefined}
          >
            <button
              type="button"
              onClick={() => changeStep(i)}
              disabled={i > step || busy}
            >
              <span>{i < step ? <BookingIcon /> : i + 1}</span>
              <strong>{label}</strong>
            </button>
          </li>
        ))}
      </ol>
      <div className="booking-layout">
        <div className="booking-workspace">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: reduced ? 1 : 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: reduced ? 1 : 0 }}
              transition={{ duration: 0.16 }}
              onAnimationComplete={() => {
                if (step > 0) heading.current?.focus({ preventScroll: true });
              }}
            >
              <div className="booking-step-heading">
                <h2 ref={heading} tabIndex={-1}>
                  {
                    [
                      "What kind of support feels right?",
                      "Make a little room for your care.",
                      "A few details, so we can connect.",
                      "Everything look right?",
                    ][step]
                  }
                </h2>
                <p>
                  {
                    [
                      "Choose a service to begin. If you’re unsure, start with a free phone conversation.",
                      "Choose how you’d like to meet and a preferred appointment window.",
                      "Continue as a guest, or sign in to keep your appointments together.",
                      "Check your appointment and contact details before sending your request.",
                    ][step]
                  }
                </p>
              </div>
              {step === 0 && (
                <>
                  <div
                    className="booking-category"
                    aria-label="Filter services"
                  >
                    {(["all", "individual", "workplace"] as const).map(
                      (item) => (
                        <button
                          type="button"
                          key={item}
                          aria-pressed={category === item}
                          onClick={() => setCategory(item)}
                        >
                          {item === "all"
                            ? "All services"
                            : item === "individual"
                              ? "For you"
                              : "For your workplace"}
                        </button>
                      ),
                    )}
                  </div>
                  <div
                    className="booking-service-list"
                    role="radiogroup"
                    aria-label="Choose your service"
                  >
                    {bookingServices
                      .filter(
                        (item) =>
                          category === "all" || item.category === category,
                      )
                      .map((item) => (
                        <label
                          key={item.id}
                          className={`booking-service ${serviceId === item.id ? "is-selected" : ""}`}
                        >
                          <input
                            type="radio"
                            name="service"
                            value={item.id}
                            checked={serviceId === item.id}
                            onChange={() => selectService(item.id)}
                          />
                          <Image
                            src={item.image}
                            alt=""
                            width={88}
                            height={90}
                          />
                          <span className="booking-service-copy">
                            <strong>{item.name}</strong>
                            <span>{item.description}</span>
                            <small>{feeLabel(item)}</small>
                          </span>
                          <span
                            className="booking-service-radio"
                            aria-hidden="true"
                          >
                            {serviceId === item.id && <BookingIcon />}
                          </span>
                        </label>
                      ))}
                  </div>
                  <div className="booking-step-actions">
                    <span className="booking-help">
                      Not sure? We’ll help you choose.
                    </span>
                    <button
                      className="booking-button"
                      type="button"
                      disabled={!service}
                      onClick={() => changeStep(1)}
                    >
                      Choose date & time <BookingIcon name="arrow" />
                    </button>
                  </div>
                </>
              )}
              {step === 1 && service && (
                <>
                  <fieldset className="booking-visit-modes">
                    <legend>How would you like to meet?</legend>
                    {service.modes.map((item) => (
                      <label key={item}>
                        <input
                          type="radio"
                          name="visit-mode"
                          checked={mode === item}
                          onChange={() => setMode(item)}
                        />
                        <span>{visitModes[item]}</span>
                      </label>
                    ))}
                  </fieldset>
                  {mode === "clinic" && (
                    <p className="booking-location">{clinic.address}</p>
                  )}
                  {mode === "home" && (
                    <Notice>
                      The clinic will confirm your address and service area
                      before arranging a home visit.
                    </Notice>
                  )}
                  {mode === "virtual" && (
                    <Notice>
                      Online care is subject to provider availability and
                      eligibility in your location.
                    </Notice>
                  )}
                  {service.options && (
                    <Field label="Program you’re interested in">
                      <select
                        value={program || service.options[0]}
                        onChange={(e) => setProgram(e.target.value)}
                      >
                        {service.options.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </Field>
                  )}
                  <TimePicker
                    selected={start}
                    onSelect={(value) => {
                      setStart(value);
                      setWaitlistOffer(false);
                      setWaitlistNote("");
                    }}
                    timezone={timezone}
                    onTimezone={setTimezone}
                  />
                  {waitlistOffer && start && (
                    <div className="booking-inline-action">
                      <h3>That time was just taken.</h3>
                      <p>
                        Join the waitlist and we’ll email {details.email || "you"} if it opens again.
                      </p>
                      {waitlistNote ? (
                        <Notice>{waitlistNote}</Notice>
                      ) : (
                        <button
                          className="booking-button"
                          type="button"
                          disabled={busy || !details.email || !details.name}
                          onClick={() => {
                            setBusy(true);
                            void bookingRequest("/api/waitlist", {
                              serviceId,
                              mode,
                              start,
                              timezone,
                              ...details,
                            })
                              .then(() => {
                                setWaitlistNote(
                                  "You’re on the waitlist. We’ll email you if this time opens.",
                                );
                                toast({
                                  title: "You’re on the waitlist.",
                                  detail: "We’ll email you if this time opens.",
                                });
                              })
                              .catch((reason) => {
                                const text = messageFor(reason);
                                setError(text);
                                toast({ title: text, tone: "alert" });
                              })
                              .finally(() => setBusy(false));
                          }}
                        >
                          Join the waitlist
                        </button>
                      )}
                    </div>
                  )}
                  <div className="booking-step-actions">
                    <button
                      type="button"
                      className="booking-text-button"
                      onClick={() => changeStep(0)}
                    >
                      Back to services
                    </button>
                    <button
                      type="button"
                      className="booking-button"
                      disabled={!start}
                      onClick={() => changeStep(2)}
                    >
                      Continue <BookingIcon name="arrow" />
                    </button>
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  {!sessionReady ? (
                    <p role="status">Checking your account…</p>
                  ) : customer ? (
                    <Notice>
                      Signed in as <strong>{customer.name}</strong> (
                      {customer.email}).{" "}
                      <Link href="/account">Manage account</Link>
                    </Notice>
                  ) : (
                    <div
                      className="booking-identity-options"
                      aria-label="Continue your booking"
                    >
                      {(["guest", "login", "register"] as const).map((item) =>
                        item === "guest" ? (
                          <button
                            type="button"
                            key={item}
                            aria-pressed={auth === item}
                            onClick={() => {
                              setAuth(item);
                              setError("");
                            }}
                          >
                            Continue as guest
                          </button>
                        ) : (
                          <Link
                            key={item}
                            href={
                              item === "login"
                                ? "/sign-in?redirect_url=/book"
                                : "/sign-up?redirect_url=/book"
                            }
                            aria-current={auth === item ? "page" : undefined}
                          >
                            {item === "login"
                              ? "Sign in with Google"
                              : "Create account"}
                          </Link>
                        ),
                      )}
                    </div>
                  )}
                  {!customer && (
                    <p className="booking-help">
                      {clerkUiReady
                        ? "Sign in with Google to keep bookings on every device, or continue as a guest on this one."
                        : "You can book as a guest now. Google sign-in will appear here once accounts are connected."}
                    </p>
                  )}
                  {(
                    <form className="booking-form" onSubmit={submitDetails}>
                      <div className="booking-fields">
                        <Field label="Full name">
                          <input
                            value={details.name}
                            onChange={(e) =>
                              setDetails({ ...details, name: e.target.value })
                            }
                            autoComplete="name"
                            required
                            maxLength={100}
                          />
                        </Field>
                        <Field label="Email address">
                          <input
                            value={details.email}
                            onChange={(e) =>
                              setDetails({ ...details, email: e.target.value })
                            }
                            type="email"
                            autoComplete="email"
                            required
                            maxLength={254}
                          />
                        </Field>
                        <Field
                          label="Phone number"
                          hint="Include your country code."
                        >
                          <input
                            value={details.phone}
                            onChange={(e) =>
                              setDetails({ ...details, phone: e.target.value })
                            }
                            type="tel"
                            autoComplete="tel"
                            required
                            maxLength={32}
                            pattern={"[+0-9 .\\(\\)\\-]{7,32}"}
                          />
                        </Field>
                        <Field label="Country">
                          <input
                            value={details.country}
                            onChange={(e) =>
                              setDetails({
                                ...details,
                                country: e.target.value,
                              })
                            }
                            autoComplete="country-name"
                            required
                            maxLength={80}
                          />
                        </Field>
                        <Field
                          label="State / region"
                          hint="So we can confirm care options in your location."
                        >
                          <input
                            value={details.region}
                            onChange={(e) =>
                              setDetails({ ...details, region: e.target.value })
                            }
                            autoComplete="address-level1"
                            required
                            maxLength={80}
                          />
                        </Field>
                        {service?.category === "workplace" && (
                          <Field label="Organization">
                            <input
                              value={details.organization}
                              onChange={(e) =>
                                setDetails({
                                  ...details,
                                  organization: e.target.value,
                                })
                              }
                              autoComplete="organization"
                              required
                              maxLength={160}
                            />
                          </Field>
                        )}
                      </div>
                      <p className="booking-help">
                        Your clinical history can wait until your consultation.
                        Please keep this form to contact and scheduling
                        information.
                      </p>
                      <Field label="Coupon" optional>
                        <input
                          value={details.couponCode}
                          maxLength={24}
                          autoComplete="off"
                          placeholder="Code from the clinic"
                          onChange={(event) => {
                            setCouponLabel("");
                            setCouponError("");
                            setDetails({
                              ...details,
                              couponCode: event.target.value.toUpperCase(),
                            });
                          }}
                        />
                      </Field>
                      {details.couponCode && (
                        <button
                          className="booking-text-button"
                          type="button"
                          onClick={() => {
                            setCouponError("");
                            void bookingRequest<{ coupon: { name: string; code: string } }>(
                              "/api/coupons/check",
                              { code: details.couponCode },
                            )
                              .then(({ coupon }) => {
                                const label = `${coupon.name} (${coupon.code})`;
                                setCouponLabel(label);
                                toast({ title: "Coupon ready.", detail: label });
                              })
                              .catch((reason) => {
                                const text = messageFor(reason);
                                setCouponError(text);
                                toast({ title: text, tone: "alert" });
                              });
                          }}
                        >
                          Check coupon
                        </button>
                      )}
                      {couponLabel && <Notice>{couponLabel} will be applied when the clinic sets the cash amount.</Notice>}
                      {couponError && <Notice error>{couponError}</Notice>}
                      <label className="booking-consent">
                        <input
                          type="checkbox"
                          checked={details.consent}
                          onChange={(e) =>
                            setDetails({
                              ...details,
                              consent: e.target.checked,
                            })
                          }
                          required
                        />
                        <span>
                          I agree that TheraGurus may use these details to
                          contact me about this appointment request. I
                          understand the clinic will confirm the time and any
                          fees before treatment.
                        </span>
                      </label>
                      <div className="booking-step-actions">
                        <button
                          type="button"
                          className="booking-text-button"
                          onClick={() => changeStep(1)}
                        >
                          Back to date & time
                        </button>
                        <button
                          className="booking-button"
                          disabled={!sessionReady || !!recovery}
                        >
                          Review booking <BookingIcon name="arrow" />
                        </button>
                      </div>
                    </form>
                  )}
                  {recovery && (
                    <RecoveryCode
                      code={recovery}
                      onClose={() => setRecovery("")}
                    />
                  )}
                </>
              )}
              {step === 3 && service && (
                <>
                  <div className="booking-review">
                    <div>
                      <h3>Your appointment</h3>
                      <button
                        className="booking-text-button"
                        type="button"
                        onClick={() => changeStep(1)}
                      >
                        Edit
                      </button>
                      <dl>
                        <div>
                          <dt>Service</dt>
                          <dd>{service.name}</dd>
                        </div>
                        {program && (
                          <div>
                            <dt>Program</dt>
                            <dd>{program}</dd>
                          </div>
                        )}
                        <div>
                          <dt>When</dt>
                          <dd>{formatAppointment(start, timezone)}</dd>
                        </div>
                        {timezone !== clinic.timezone && (
                          <div>
                            <dt>At the clinic</dt>
                            <dd>{formatAppointment(start)}</dd>
                          </div>
                        )}
                        <div>
                          <dt>Visit type</dt>
                          <dd>{visitModes[mode]}</dd>
                        </div>
                        <div>
                          <dt>Provider</dt>
                          <dd>{clinic.provider}</dd>
                        </div>
                      </dl>
                    </div>
                    <div>
                      <h3>Your contact details</h3>
                      <button
                        className="booking-text-button"
                        type="button"
                        onClick={() => changeStep(2)}
                      >
                        Edit
                      </button>
                      <dl>
                        <div>
                          <dt>Name</dt>
                          <dd>{details.name}</dd>
                        </div>
                        <div>
                          <dt>Email</dt>
                          <dd>{details.email}</dd>
                        </div>
                        <div>
                          <dt>Phone</dt>
                          <dd>{details.phone}</dd>
                        </div>
                        <div>
                          <dt>Location</dt>
                          <dd>
                            {details.region}, {details.country}
                          </dd>
                        </div>
                        {details.organization && (
                          <div>
                            <dt>Organization</dt>
                            <dd>{details.organization}</dd>
                          </div>
                        )}
                        {details.couponCode && (
                          <div>
                            <dt>Coupon</dt>
                            <dd>{couponLabel || details.couponCode}</dd>
                          </div>
                        )}
                        <div>
                          <dt>Booking as</dt>
                          <dd>{customer ? "Account holder" : "Guest"}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                  <div className="booking-payment">
                    <BookingIcon name="lock" />
                    <div>
                      <h3>
                        {service.price === 0
                          ? "Your conversation is complimentary."
                          : "Pay in cash when you arrive."}
                      </h3>
                      <p>
                        {service.price === 0
                          ? "There’s no charge for the initial phone consultation."
                          : "We do not collect payment online. The clinic confirms the fee, and you pay in cash at your visit."}
                      </p>
                      <div className="booking-payment-total">
                        <span>Charged online</span>
                        <strong>$0.00</strong>
                      </div>
                    </div>
                  </div>
                  <p className="booking-help">
                    Your preferred time is a request, subject to clinic
                    confirmation. This page keeps the latest status. When email
                    sending is connected, you’ll also get a message at{" "}
                    {details.email || "your email"} when the clinic confirms or
                    changes the time.
                  </p>
                  <div className="booking-step-actions">
                    <button
                      type="button"
                      className="booking-text-button"
                      disabled={busy}
                      onClick={() => changeStep(2)}
                    >
                      Back to your details
                    </button>
                    <button
                      type="button"
                      className="booking-button"
                      disabled={busy}
                      onClick={finish}
                    >
                      {busy
                        ? "Saving your request…"
                        : "Send appointment request"}
                      <BookingIcon name="arrow" />
                    </button>
                  </div>
                </>
              )}
              {error && <Notice error>{error}</Notice>}
            </motion.div>
          </AnimatePresence>
        </div>
        <aside className="booking-sidebar">
          <div className="booking-provider">
            <Image
              src="/trapti.png"
              alt="Trapti Agarwal"
              width={70}
              height={78}
            />
            <div>
              <strong>Care with a human connection.</strong>
              <span>{clinic.provider}</span>
            </div>
          </div>
          <div className="booking-summary">
            <h2>Your next step</h2>
            {service ? (
              <>
                <p className="booking-summary-name">{service.name}</p>
                <span className="booking-fee">{feeLabel(service)}</span>
                <dl>
                  <div>
                    <dt>Visit</dt>
                    <dd>{visitModes[mode]}</dd>
                  </div>
                  {start && (
                    <div>
                      <dt>Preferred time</dt>
                      <dd>{formatAppointment(start, timezone)}</dd>
                    </div>
                  )}
                  {program && (
                    <div>
                      <dt>Program</dt>
                      <dd>{program}</dd>
                    </div>
                  )}
                </dl>
              </>
            ) : (
              <p>
                Choose a service and your appointment details will appear here.
              </p>
            )}
            <div className="booking-summary-foot">
              <BookingIcon name="check" />
              <span>Pay in cash at your visit. Nothing is charged online.</span>
            </div>
          </div>
          <div className="booking-support">
            <h3>A question before you begin?</h3>
            <p>We’re here to help you find the right care.</p>
            <a href="tel:+16616256322">{clinic.phone}</a>
            <small>Santa Clarita & online</small>
          </div>
          <Link className="booking-text-link" href="/account">
            Already booked? View your appointments
          </Link>
        </aside>
      </div>
    </BookingShell>
  );
}
