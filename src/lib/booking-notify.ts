import "server-only";
import { randomUUID } from "node:crypto";
import { getStore } from "./booking-store";
import { emailReady, sendEmail } from "./email-server";
import {
  clinic,
  formatAppointment,
  googleCalendarLink,
  serviceById,
  visitModes,
} from "./booking-catalog";
import type { AppointmentRecord } from "./booking-models";

export type SavedCoupon = {
  code: string;
  name: string;
  kind: "percent" | "amount";
  value: number;
};

type CouponRow = SavedCoupon & { active: boolean; expires_on: string };

export function priceWithCoupon(amount: number, coupon: SavedCoupon | null) {
  if (!coupon) return { amount, discount: 0 };
  const discount =
    coupon.kind === "percent"
      ? Math.round(amount * coupon.value) / 100
      : Math.min(amount, coupon.value);
  return {
    discount: Math.round(discount * 100) / 100,
    amount: Math.max(0, Math.round((amount - discount) * 100) / 100),
  };
}

export async function findCoupon(
  code: string,
): Promise<{ error: string } | { coupon: SavedCoupon } | null> {
  const normalized = code.trim().toUpperCase().replace(/\s+/g, "");
  if (!normalized) return null;
  if (!/^[A-Z0-9-]{3,24}$/.test(normalized)) return { error: "Enter a valid coupon code." };
  const store = await getStore();
  const row = await store.database.collection<CouponRow>("admin_coupons").findOne({ code: normalized });
  if (!row || !row.active) return { error: "That coupon is not active." };
  const today = new Date().toISOString().slice(0, 10);
  if (row.expires_on && row.expires_on < today) return { error: "That coupon has expired." };
  return {
    coupon: {
      code: row.code,
      name: row.name,
      kind: row.kind,
      value: row.value,
    } satisfies SavedCoupon,
  };
}

async function deliver(to: string, subject: string, body: string, key: string) {
  if (!to || !emailReady()) return false;
  try {
    await sendEmail({ to, subject, body, key });
    return true;
  } catch (error) {
    console.error("Booking email was not sent.", error instanceof Error ? error.message : "unknown");
    return false;
  }
}

function when(row: AppointmentRecord) {
  return formatAppointment(row.start_at, row.timezone);
}

function summary(row: AppointmentRecord) {
  const service = serviceById(row.service_id)?.name || "Appointment";
  return [
    `${service}`,
    `Reference: ${row.reference}`,
    `When: ${when(row)}`,
    `Visit: ${visitModes[row.mode]}`,
    `Call: ${clinic.phone}`,
  ].join("\n");
}

function calendarLine(row: AppointmentRecord) {
  const link = googleCalendarLink({
    serviceName: serviceById(row.service_id)?.name || "Appointment",
    start: row.start_at,
    end: row.end_at,
    reference: row.reference,
    mode: row.mode,
  });
  return `Add it to Google Calendar:\n${link}`;
}

export async function notifyBookingSaved(row: AppointmentRecord) {
  const service = serviceById(row.service_id)?.name || "your visit";
  await deliver(
    row.email,
    `We received your TheraGurus request ${row.reference}`,
    `Hello ${row.name},\n\nYour request for ${service} is saved. The clinic still needs to confirm the time.\n\n${summary(row)}\n\n${calendarLine(row)}\n\nYou can also open My bookings in the browser where you booked.`,
    `booking-saved-${row.id}`,
  );
  await deliver(
    clinic.email,
    `New appointment request ${row.reference}`,
    `${row.name} requested ${service}.\n\n${summary(row)}\nEmail: ${row.email}\nPhone: ${row.phone}`,
    `booking-staff-${row.id}`,
  );
}

export async function notifyBookingEvent(
  row: AppointmentRecord,
  event: "confirmed" | "rescheduled" | "cancelled" | "no_show" | "quoted" | "collected",
) {
  const service = serviceById(row.service_id)?.name || "your visit";
  const messages = {
    confirmed: [
      `Your TheraGurus appointment is confirmed ${row.reference}`,
      `Hello ${row.name},\n\nThe clinic confirmed ${service}.\n\n${summary(row)}\n\n${calendarLine(row)}`,
    ],
    rescheduled: [
      `Your TheraGurus time was updated ${row.reference}`,
      `Hello ${row.name},\n\nThe preferred time for ${service} is now updated. The clinic still confirms the final appointment.\n\n${summary(row)}\n\n${calendarLine(row)}`,
    ],
    cancelled: [
      `Your TheraGurus request was cancelled ${row.reference}`,
      `Hello ${row.name},\n\n${row.reference} for ${service} is cancelled. The time is open again. You can book another time whenever you are ready.\n\nCall ${clinic.phone}.`,
    ],
    no_show: [
      `We missed you at TheraGurus ${row.reference}`,
      `Hello ${row.name},\n\nWe did not see you for ${service} (${when(row)}). If you would like another time, reply to this email or call ${clinic.phone} and mention ${row.reference}.`,
    ],
    quoted: [
      `Cash amount for your TheraGurus visit ${row.reference}`,
      `Hello ${row.name},\n\nThe clinic set the cash amount for ${service} to USD ${(row.amount ?? 0).toFixed(2)}. Nothing is charged online. You pay when you arrive.\n\n${summary(row)}`,
    ],
    collected: [
      `Cash received for your TheraGurus visit ${row.reference}`,
      `Hello ${row.name},\n\nThe clinic marked ${row.reference} as paid in cash${row.amount != null ? ` (USD ${row.amount.toFixed(2)})` : ""}. Nothing was charged online.`,
    ],
  } as const;
  const [subject, body] = messages[event];
  await deliver(row.email, subject, body, `booking-${event}-${row.id}-${row.updated_at}`);
  if (event === "confirmed") {
    await deliver(
      clinic.email,
      `Confirmed on the calendar ${row.reference}`,
      `${row.name} is confirmed.\n\n${summary(row)}\n\n${calendarLine(row)}`,
      `booking-clinic-confirmed-${row.id}-${row.updated_at}`,
    );
  }
  if (event === "no_show") await rememberNoShow(row);
}

async function rememberNoShow(row: AppointmentRecord) {
  const store = await getStore();
  const leads = store.database.collection<{
    _id: string;
    name: string;
    email: string;
    phone: string;
    interest: string;
    note?: string;
    source: string;
    status: string;
    created_at: string;
    updated_at: string;
  }>("clinic_leads");
  const existing = await leads.findOne({ email: row.email, note: { $regex: row.reference } });
  if (existing) return;
  const now = new Date().toISOString();
  await leads.insertOne({
    _id: randomUUID(),
    name: row.name,
    email: row.email,
    phone: row.phone,
    interest: serviceById(row.service_id)?.name || "Follow-up",
    note: `No-show follow-up for ${row.reference}.`,
    source: "phone",
    status: "new",
    created_at: now,
    updated_at: now,
  });
}

export async function updateWaitlist(id: string, action: "offer" | "close") {
  const store = await getStore();
  const people = store.database.collection<{
    _id: string;
    email: string;
    name: string;
    start_at: string;
    service_id: string;
    status: string;
  }>("booking_waitlist");
  const person = await people.findOne({ _id: id });
  if (!person) return { found: false as const, sent: false };
  if (action === "close") {
    await people.updateOne(
      { _id: id },
      { $set: { status: "closed", updated_at: new Date().toISOString() } },
    );
    return { found: true as const, sent: false };
  }
  const service = serviceById(person.service_id)?.name || "a visit";
  const sent = await deliver(
    person.email,
    "A TheraGurus time may be open",
    `Hello ${person.name},\n\nYou asked to hear if ${formatAppointment(person.start_at)} opens for ${service}.\n\nBook it here: ${process.env.APP_ORIGIN || "http://localhost:3000"}/book\n\nCall ${clinic.phone} if you would rather have the clinic hold it.`,
    `waitlist-offer-${person._id}-${person.start_at}`,
  );
  if (sent) {
    await people.updateOne(
      { _id: id },
      { $set: { status: "offered", updated_at: new Date().toISOString() } },
    );
  }
  return { found: true as const, sent };
}

export async function releaseWaitlist(startAt: string) {
  const store = await getStore();
  const waiting = await store.database
    .collection<{
      _id: string;
      email: string;
      name: string;
      start_at: string;
      service_id: string;
      status: string;
    }>("booking_waitlist")
    .find({ start_at: startAt, status: "waiting" })
    .toArray();
  for (const person of waiting) {
    const service = serviceById(person.service_id)?.name || "a visit";
    const sent = await deliver(
      person.email,
      "A TheraGurus time just opened",
      `Hello ${person.name},\n\nThe time you asked about for ${service} is open again (${formatAppointment(person.start_at)}).\n\nBook it here: ${process.env.APP_ORIGIN || "http://localhost:3000"}/book\n\nCall ${clinic.phone} if you would rather have the clinic hold it.`,
      `waitlist-open-${person._id}-${startAt}`,
    );
    if (sent) {
      await store.database.collection<{ _id: string }>("booking_waitlist").updateOne(
        { _id: person._id },
        { $set: { status: "offered", updated_at: new Date().toISOString() } },
      );
    }
  }
}
