import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  MongoNetworkError,
  MongoServerSelectionError,
  type ClientSession,
} from "mongodb";
import { getStore, isDuplicateKey, transaction } from "./booking-store";
import type { AppointmentRecord, CustomerRecord } from "./booking-models";
import {
  clinic,
  serviceById,
  type Appointment,
  type Customer,
  type VisitMode,
} from "./booking-catalog";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public field?: string,
  ) {
    super(message);
  }
}
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const SESSION = "tg_session";
const GUEST = "tg_guest";
type CustomerRow = CustomerRecord;
type AppointmentRow = AppointmentRecord;

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export async function handle(
  operation: () => Promise<NextResponse> | NextResponse,
) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ApiError)
      return json({ error: error.message, field: error.field }, error.status);
    console.error(
      "Booking API failure",
      error instanceof Error ? error.name : "Unknown error",
    );
    if (
      error instanceof MongoNetworkError ||
      error instanceof MongoServerSelectionError ||
      (error instanceof Error &&
        "code" in error &&
        ["ECONNREFUSED", "ENOTFOUND", "ETIMEOUT"].includes(String(error.code)))
    ) {
      return json(
        {
          error:
            "Scheduling is temporarily unavailable. Please try again or call the clinic.",
        },
        503,
      );
    }
    return json(
      { error: "We couldn’t complete that request. Please try again." },
      500,
    );
  }
}
function allowedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  let sent: URL;
  try {
    sent = new URL(origin);
  } catch {
    return false;
  }
  if (sent.host === request.nextUrl.host) return true;
  const configured = process.env.APP_ORIGIN;
  if (!configured) return false;
  try {
    const expected = new URL(configured);
    const bare = expected.host.replace(/^www\./, "");
    return sent.host === expected.host || sent.host === bare || sent.host === `www.${bare}`;
  } catch {
    return false;
  }
}
export async function input(
  request: NextRequest,
): Promise<Record<string, unknown>> {
  if (!allowedOrigin(request))
    throw new ApiError(
      403,
      "Please submit this form from the TheraGurus website.",
    );
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new ApiError(415, "Please send a JSON request.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Please complete the form.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16384) {
      await reader.cancel();
      throw new ApiError(413, "That request is too large.");
    }
    chunks.push(value);
  }
  let data;
  try {
    data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiError(400, "Please check the form and try again.");
  }
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new ApiError(400, "Please complete the form.");
  return data;
}
export function text(
  data: Record<string, unknown>,
  key: string,
  max = 100,
  required = true,
) {
  const value =
    typeof data[key] === "string" ? (data[key] as string).trim() : "";
  if (
    value.length > max ||
    /[\u0000-\u001f]/.test(value) ||
    (required && !value)
  )
    throw new ApiError(
      400,
      `Please enter a valid ${key.replace(/([A-Z])/g, " $1").toLowerCase()}.`,
      key,
    );
  return value;
}
export function email(data: Record<string, unknown>) {
  const value = text(data, "email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    throw new ApiError(400, "Please enter a valid email address.", "email");
  return value;
}
export function password(data: Record<string, unknown>) {
  const value = typeof data.password === "string" ? data.password : "";
  if (value.length < 12 || value.length > 128)
    throw new ApiError(
      400,
      "Use a password between 12 and 128 characters.",
      "password",
    );
  return value;
}
function passwordHash(value: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(value, salt, 64).toString("hex")}`;
}
function passwordMatches(value: string, stored: string) {
  const [salt, encoded] = stored.split(":");
  if (!salt || !encoded) return false;
  const actual = scryptSync(value, salt, 64);
  const expected = Buffer.from(encoded, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
function publicCustomer(row: CustomerRow): Customer {
  return { id: row.id, name: row.name, email: row.email, phone: row.phone };
}
export function clerkConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY
  );
}
export async function syncClerkProfile(
  profile: Customer,
): Promise<Customer | null> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) return null;
  const store = await getStore();
  let row = await store.customers.findOne({ id: profile.id });
  if (row) {
    row = await store.customers.findOneAndUpdate(
      { id: profile.id },
      {
        $set: {
          name: profile.name,
          email: profile.email,
          phone: profile.phone || row.phone,
        },
      },
      { returnDocument: "after" },
    );
  } else {
    const byEmail = await store.customers.findOne({ email: profile.email });
    if (byEmail) {
      await store.appointments.updateMany(
        { customer_id: byEmail.id },
        { $set: { customer_id: profile.id } },
      );
      await store.sessions.deleteMany({ customer_id: byEmail.id });
      row = await store.customers.findOneAndUpdate(
        { id: byEmail.id },
        {
          $set: {
            id: profile.id,
            name: profile.name,
            phone: profile.phone || byEmail.phone,
          },
        },
        { returnDocument: "after" },
      );
    }
  }
  if (!row) {
    try {
      await store.customers.insertOne({
        ...profile,
        password_hash: "clerk",
        recovery_hash: "clerk",
        auth_version: 0,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }
    row = await store.customers.findOne({ id: profile.id });
  }
  if (!row) return null;
  return publicCustomer(row);
}
async function ensureClerkCustomer(
  profile: Customer,
): Promise<Customer | null> {
  const customer = await syncClerkProfile(profile);
  if (!customer) return null;
  const store = await getStore();
  const guest = await guestHash();
  if (guest)
    await store.appointments.updateMany(
      { guest_hash: guest, email: customer.email, customer_id: null },
      { $set: { customer_id: customer.id, guest_hash: null } },
    );
  return customer;
}
export async function currentCustomer(): Promise<Customer | null> {
  if (clerkConfigured()) {
    const { userId } = await auth();
    if (!userId) return null;
    const user = await currentUser();
    const address = user?.primaryEmailAddress?.emailAddress
      ?.trim()
      .toLowerCase();
    if (!user || !address) return null;
    return ensureClerkCustomer({
      id: userId,
      name:
        [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
        address,
      email: address,
      phone: user.primaryPhoneNumber?.phoneNumber || "",
    });
  }
  const token = (await cookies()).get(SESSION)?.value;
  if (!token) return null;
  const store = await getStore();
  const session = await store.sessions.findOne({
    _id: hash(token),
    expires_at: { $gt: new Date() },
  });
  if (!session) return null;
  const row = await store.customers.findOne({
    id: session.customer_id,
    auth_version: session.auth_version,
  });
  return row ? publicCustomer(row) : null;
}
export async function guestHash() {
  const token = (await cookies()).get(GUEST)?.value;
  return token ? hash(token) : null;
}
function setCookie(
  response: NextResponse,
  name: string,
  value: string,
  request: NextRequest,
  maxAge: number,
) {
  response.cookies.set(name, value, {
    httpOnly: true,
    secure:
      new URL(process.env.APP_ORIGIN || request.url).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}
async function signInResponse(
  request: NextRequest,
  customer: Customer,
  authVersion: number,
  recoveryCode?: string,
) {
  const token = randomBytes(32).toString("hex");
  const store = await getStore();
  await store.sessions.insertOne({
    _id: hash(token),
    customer_id: customer.id,
    auth_version: authVersion,
    expires_at: new Date(Date.now() + 30 * 86400000),
  });
  const guest = await guestHash();
  if (guest)
    await store.appointments.updateMany(
      { guest_hash: guest, email: customer.email, customer_id: null },
      { $set: { customer_id: customer.id, guest_hash: null } },
    );
  const response = json({
    customer,
    ...(recoveryCode ? { recoveryCode } : {}),
  });
  setCookie(response, SESSION, token, request, 30 * 86400);
  return response;
}
export async function rateLimit(
  request: NextRequest,
  action: string,
  identity = "",
  limit = 20,
) {
  const peer =
    process.env.TRUST_PROXY === "true"
      ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "unknown"
      : "site";
  const key = hash(`${action}:${peer}:${identity}`);
  const now = new Date();
  const store = await getStore();
  const increment = () =>
    store.limits.findOneAndUpdate(
      { _id: key },
      [
        {
          $set: {
            count: {
              $cond: [
                { $gt: ["$expires_at", now] },
                { $add: [{ $ifNull: ["$count", 0] }, 1] },
                1,
              ],
            },
            expires_at: {
              $cond: [
                { $gt: ["$expires_at", now] },
                "$expires_at",
                new Date(now.getTime() + 900000),
              ],
            },
          },
        },
      ],
      { upsert: true, returnDocument: "after" },
    );
  let row;
  try {
    row = await increment();
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    row = await increment();
  }
  if (row && row.count > limit)
    throw new ApiError(
      429,
      "Too many attempts. Please try again in 15 minutes.",
    );
}
export async function authAction(request: NextRequest, action: string) {
  const data = await input(request);
  if (action === "logout") {
    const token = (await cookies()).get(SESSION)?.value;
    if (token)
      await (await getStore()).sessions.deleteOne({ _id: hash(token) });
    const response = json({ success: true });
    setCookie(response, SESSION, "", request, 0);
    return response;
  }
  if (clerkConfigured())
    throw new ApiError(
      410,
      "Sign in with Google or email from the sign-in page.",
    );
  const address = email(data);
  await rateLimit(request, "auth-global", "", 80);
  await rateLimit(request, action, address, 8);
  const store = await getStore();
  if (action === "register") {
    const name = text(data, "name");
    const secret = password(data);
    const phone = text(data, "phone", 32, false);
    const recoveryCode = randomBytes(20).toString("hex");
    const customer = { id: randomUUID(), name, email: address, phone };
    try {
      await store.customers.insertOne({
        ...customer,
        password_hash: passwordHash(secret),
        recovery_hash: hash(recoveryCode),
        auth_version: 0,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      if (isDuplicateKey(error))
        throw new ApiError(
          409,
          "An account already uses this email. Sign in or use your recovery code.",
          "email",
        );
      throw error;
    }
    return signInResponse(request, customer, 0, recoveryCode);
  }
  const row = await store.customers.findOne({ email: address });
  if (action === "login") {
    const secret = typeof data.password === "string" ? data.password : "";
    if (!secret || secret.length > 128)
      throw new ApiError(
        401,
        "That email and password don’t match. Please try again.",
      );
    const stored =
      row?.password_hash ||
      `00000000000000000000000000000000:${"0".repeat(128)}`;
    if (!passwordMatches(secret, stored) || !row)
      throw new ApiError(
        401,
        "That email and password don’t match. Please try again.",
      );
    return signInResponse(request, publicCustomer(row), row.auth_version);
  }
  if (action === "recover") {
    const recoveryCode = text(data, "recoveryCode", 100);
    const secret = password(data);
    if (!row || row.recovery_hash !== hash(recoveryCode))
      throw new ApiError(401, "That email and recovery code don’t match.");
    const nextCode = randomBytes(20).toString("hex");
    const nextPassword = passwordHash(secret);
    const updated = await transaction(async (store, session) => {
      const customer = await store.customers.findOneAndUpdate(
        {
          id: row.id,
          recovery_hash: hash(recoveryCode),
          auth_version: row.auth_version,
        },
        {
          $set: { password_hash: nextPassword, recovery_hash: hash(nextCode) },
          $inc: { auth_version: 1 },
        },
        { session, returnDocument: "after" },
      );
      if (!customer)
        throw new ApiError(401, "That email and recovery code don’t match.");
      await store.sessions.deleteMany({ customer_id: row.id }, { session });
      return customer;
    });
    return signInResponse(
      request,
      publicCustomer(updated),
      updated.auth_version,
      nextCode,
    );
  }
  throw new ApiError(404, "That action isn’t available.");
}

export function appointmentView(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    reference: row.reference,
    serviceId: row.service_id,
    serviceName: serviceById(row.service_id)?.name || "Appointment",
    mode: row.mode,
    start: row.start_at,
    end: row.end_at,
    timezone: row.timezone,
    name: row.name,
    email: row.email,
    phone: row.phone,
    country: row.country,
    region: row.region,
    organization: row.organization,
    program: row.program,
    status: row.status,
    reviewStatus: row.admin_status || "requested",
    paymentStatus:
      row.payment_status === "pending_quote"
        ? "due_at_visit"
        : row.payment_status,
    amount: row.amount,
    couponCode: row.coupon_code || "",
    couponName: row.coupon_name || "",
    discount: row.discount || 0,
    intake: row.intake || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
export function staffAppointment(row: AppointmentRow) {
  return {
    ...appointmentView(row),
    reviewStatus: row.admin_status || "requested",
    collectedAt: row.collected_at || "",
    collectedBy: row.collected_by || "",
  };
}
export async function ownedAppointment(id: string) {
  const customer = await currentCustomer();
  const guest = await guestHash();
  const row = await (await getStore()).appointments.findOne({ id });
  if (
    !row ||
    (!(customer && row.customer_id === customer.id) &&
      !(guest && !row.customer_id && row.guest_hash === guest))
  )
    throw new ApiError(
      404,
      "This booking isn’t available in this session. Sign in to the account used to book, or use the browser where you booked as a guest.",
    );
  return row;
}
export function clinicDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: clinic.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function atClinicTime(date: string, hour: number) {
  const candidate = new Date(`${date}T${String(hour).padStart(2, "0")}:00:00Z`);
  const offsetText =
    new Intl.DateTimeFormat("en-US", {
      timeZone: clinic.timezone,
      timeZoneName: "shortOffset",
    })
      .formatToParts(candidate)
      .find((p) => p.type === "timeZoneName")?.value || "GMT-8";
  const match = offsetText.match(/GMT([+-])(\d+)(?::(\d+))?/);
  const offset = match
    ? (match[1] === "+" ? 1 : -1) *
      (Number(match[2]) * 60 + Number(match[3] || 0))
    : 0;
  return new Date(candidate.getTime() - offset * 60000).toISOString();
}
export async function availability(
  date?: string,
  excludeId = "",
  session?: ClientSession,
) {
  const today = clinicDate(new Date());
  const base = new Date(`${today}T12:00:00Z`);
  const dates: { date: string; count: number }[] = [];
  const store = await getStore();
  const rows = await store.appointments
    .find(
      {
        status: "requested",
        id: { $ne: excludeId },
        end_at: { $gt: new Date().toISOString() },
        start_at: {
          $lt: new Date(base.getTime() + 28 * 86400000).toISOString(),
        },
      },
      { session, projection: { _id: 0, start_at: 1, end_at: 1 } },
    )
    .toArray();
  const blockedDates = new Set((await store.database.collection<{_id:string}>("booking_blocks").find({}, {session}).toArray()).map(row=>row._id));
  const all = new Map<
    string,
    { start: string; end: string; label: string }[]
  >();
  for (let day = 0; day < 28; day++) {
    const current = new Date(base.getTime() + day * 86400000);
    const key = current.toISOString().slice(0, 10);
    // These are configurable request windows, not a synchronized clinical calendar.
    const hours = blockedDates.has(key) || [0, 6].includes(current.getUTCDay())
      ? []
      : [9, 10, 11, 12, 13, 17, 18, 19];
    const slots = hours.flatMap((hour) => {
      const start = atClinicTime(key, hour);
      const end = new Date(new Date(start).getTime() + 3600000).toISOString();
      if (
        new Date(start).getTime() < Date.now() + 7200000 ||
        rows.some((row) => row.start_at < end && row.end_at > start)
      )
        return [];
      return [
        {
          start,
          end,
          label: new Intl.DateTimeFormat("en-US", {
            timeZone: clinic.timezone,
            hour: "numeric",
            minute: "2-digit",
          }).format(new Date(start)),
        },
      ];
    });
    all.set(key, slots);
    dates.push({ date: key, count: slots.length });
  }
  const selected = date || dates.find((d) => d.count)?.date || today;
  if (!all.has(selected))
    throw new ApiError(400, "Choose a date within the next 28 days.", "date");
  return {
    dates,
    date: selected,
    slots: all.get(selected)!,
    timezone: clinic.timezone,
  };
}
function appointmentInput(data: Record<string, unknown>) {
  const serviceId = text(data, "serviceId");
  const service = serviceById(serviceId);
  if (!service)
    throw new ApiError(
      400,
      "Choose one of the available services.",
      "serviceId",
    );
  const mode = text(data, "mode") as VisitMode;
  if (!service.modes.includes(mode))
    throw new ApiError(
      400,
      "Choose a visit type offered for this service.",
      "mode",
    );
  const start = text(data, "start");
  const parsed = new Date(start);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== start)
    throw new ApiError(400, "Choose an available appointment time.", "start");
  const timezone = text(data, "timezone", 80);
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(parsed);
  } catch {
    throw new ApiError(400, "Choose a valid time zone.", "timezone");
  }
  const name = text(data, "name");
  const address = email(data);
  const phone = text(data, "phone", 32);
  if (phone.replace(/\D/g, "").length < 7 || !/^[+\d\s().-]+$/.test(phone))
    throw new ApiError(
      400,
      "Enter a valid phone number, including country code.",
      "phone",
    );
  const country = text(data, "country", 80);
  const region = text(data, "region", 80);
  const organization = text(
    data,
    "organization",
    160,
    service.category === "workplace",
  );
  const program = text(data, "program", 100, false);
  if (program && !service.options?.includes(program))
    throw new ApiError(400, "Choose an available program.", "program");
  if (data.consent !== true)
    throw new ApiError(
      400,
      "Please confirm we may contact you about your appointment.",
      "consent",
    );
  return {
    service,
    serviceId,
    mode,
    start,
    timezone,
    name,
    address,
    phone,
    country,
    region,
    organization,
    program,
  };
}
export async function createAppointment(request: NextRequest) {
  const data = await input(request);
  const fields = appointmentInput(data);
  const customer = await currentCustomer();
  let guest = await guestHash();
  const guestToken =
    !customer && !guest ? randomBytes(32).toString("hex") : null;
  if (guestToken) guest = hash(guestToken);
  await rateLimit(
    request,
    "booking",
    customer?.id || guest || fields.address,
    20,
  );
  const key = text(data, "idempotencyKey", 80);
  if (!/^[a-zA-Z0-9-]{20,80}$/.test(key))
    throw new ApiError(400, "Please refresh the booking form and try again.");
  const couponCode = text(data, "couponCode", 24, false);
  const { findCoupon, priceWithCoupon, notifyBookingSaved } = await import(
    "./booking-notify"
  );
  const couponLookup = couponCode ? await findCoupon(couponCode) : null;
  if (couponLookup && "error" in couponLookup)
    throw new ApiError(400, couponLookup.error, "couponCode");
  const coupon = couponLookup && "coupon" in couponLookup ? couponLookup.coupon : null;
  const idempotency = hash(`${customer?.id || guest}:${key}`);
  const row = await transaction(async (store, session) => {
    const previous = await store.appointments.findOne(
      { idempotency_key: idempotency },
      { session },
    );
    if (previous) {
      if (
        previous.service_id !== fields.serviceId ||
        previous.start_at !== fields.start ||
        previous.mode !== fields.mode ||
        previous.email !== fields.address ||
        (previous.coupon_code || "") !== (coupon?.code || "")
      ) {
        throw new ApiError(
          409,
          "A request from this form was already saved. Open My bookings to review it before starting another.",
        );
      }
      return previous;
    }
    const slot = (
      await availability(clinicDate(new Date(fields.start)), "", session)
    ).slots.find((s) => s.start === fields.start);
    if (!slot)
      throw new ApiError(
        409,
        "That time was just taken or is no longer available. Please choose another.",
        "start",
      );
    const id = randomUUID();
    const now = new Date().toISOString();
    const reference = `TG-${randomBytes(4).toString("hex").toUpperCase()}`;
    const listAmount = fields.service.price;
    const priced =
      listAmount && listAmount > 0 ? priceWithCoupon(listAmount, coupon) : null;
    const amount = priced ? priced.amount : listAmount;
    const appointment: AppointmentRow = {
      id,
      reference,
      customer_id: customer?.id || null,
      guest_hash: customer ? null : guest,
      service_id: fields.serviceId,
      mode: fields.mode,
      start_at: slot.start,
      end_at: slot.end,
      timezone: fields.timezone,
      name: fields.name,
      email: fields.address,
      phone: fields.phone,
      country: fields.country,
      region: fields.region,
      organization: fields.organization,
      program: fields.program,
      status: "requested",
      payment_status: amount === 0 ? "not_required" : "due_at_visit",
      amount,
      coupon_code: coupon?.code || "",
      coupon_name: coupon?.name || "",
      coupon_kind: coupon?.kind,
      coupon_value: coupon?.value,
      discount: priced?.discount || 0,
      list_amount: listAmount,
      idempotency_key: idempotency,
      created_at: now,
      updated_at: now,
    };
    await store.appointments.insertOne(appointment, { session });
    return appointment;
  }, true);
  await notifyBookingSaved(row);
  const response = json({ appointment: appointmentView(row) }, 201);
  if (guestToken) setCookie(response, GUEST, guestToken, request, 30 * 86400);
  return response;
}
export async function updateAppointment(request: NextRequest, id: string) {
  const data = await input(request);
  const previous = await ownedAppointment(id);
  await rateLimit(
    request,
    "update",
    previous.customer_id || previous.guest_hash || id,
    40,
  );
  if (!["cancel", "reschedule", "intake"].includes(String(data.action)))
    throw new ApiError(400, "Choose a valid booking action.");
  if (data.action === "intake") {
    const hope = text(data, "hope", 300);
    const timing = text(data, "timing", 300, false);
    const contact = text(data, "contact", 20);
    if (!["email", "phone", "either"].includes(contact))
      throw new ApiError(400, "Choose how we should reach you.", "contact");
    const store = await getStore();
    const intake = { hope, timing, contact };
    await store.appointments.updateOne(
      { id, customer_id: previous.customer_id, guest_hash: previous.guest_hash },
      { $set: { intake, updated_at: new Date().toISOString() } },
    );
    return json({ appointment: appointmentView({ ...previous, intake }) });
  }
  const start = data.action === "reschedule" ? text(data, "start") : "";
  if (start && !Number.isFinite(new Date(start).getTime()))
    throw new ApiError(400, "Choose an available time.");
  const updated = await transaction(async (store, session) => {
    // Ownership may change if a guest attaches this request to an account while
    // a mutation is in flight; recheck the authorized owner inside the transaction.
    const current = await store.appointments.findOne(
      {
        id,
        customer_id: previous.customer_id,
        guest_hash: previous.guest_hash,
      },
      { session },
    );
    if (!current)
      throw new ApiError(404, "This booking isn’t available in this session.");
    if (
      current.status === "cancelled" ||
      new Date(current.start_at).getTime() <= Date.now()
    )
      throw new ApiError(
        409,
        "This appointment can no longer be changed online. Please contact the clinic.",
      );
    const changes: Partial<AppointmentRow> = {
      updated_at: new Date().toISOString(),
    };
    if (data.action === "cancel") changes.status = "cancelled";
    else {
      const slot = (
        await availability(clinicDate(new Date(start)), id, session)
      ).slots.find((slot) => slot.start === start);
      if (!slot)
        throw new ApiError(
          409,
          "That time is no longer available. Please choose another.",
          "start",
        );
      changes.start_at = slot.start;
      changes.end_at = slot.end;
    }
    await store.appointments.updateOne({ id }, { $set: changes }, { session });
    return { ...current, ...changes };
  }, true);
  const { notifyBookingEvent, releaseWaitlist } = await import("./booking-notify");
  if (data.action === "cancel") {
    await releaseWaitlist(previous.start_at);
    await notifyBookingEvent(updated, "cancelled");
  } else {
    await releaseWaitlist(previous.start_at);
    await notifyBookingEvent(updated, "rescheduled");
  }
  return json({ appointment: appointmentView(updated) });
}
export async function listAppointments() {
  const customer = await currentCustomer();
  const guest = await guestHash();
  if (!customer && !guest) return [];
  const store = await getStore();
  const rows = await store.appointments
    .find(
      customer
        ? { customer_id: customer.id }
        : { guest_hash: guest, customer_id: null },
    )
    .sort({ start_at: -1 })
    .toArray();
  return rows.map(appointmentView);
}
