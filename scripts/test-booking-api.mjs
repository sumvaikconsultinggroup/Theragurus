import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const origin = process.env.TEST_ORIGIN || "http://localhost:3001";
let checks = 0;
class Client {
  constructor(base = origin) {
    this.base = base;
  }
  jar = new Map();
  async request(path, body, method = "POST", options = {}) {
    const response = await fetch(`${this.base}${path}`, {
      method: body === undefined ? "GET" : method,
      headers: {
        Origin: options.origin || this.base,
        "Content-Type": "application/json",
        Cookie: [...this.jar].map(([k, v]) => `${k}=${v}`).join(";"),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";")[0];
      const index = pair.indexOf("=");
      const key = pair.slice(0, index);
      const value = pair.slice(index + 1);
      if (value) this.jar.set(key, value);
      else this.jar.delete(key);
    }
    const content = response.headers.get("content-type");
    const data = content?.includes("json")
      ? await response.json()
      : await response.text();
    return { status: response.status, data, headers: response.headers };
  }
}
function check(condition, label) {
  assert.ok(condition, label);
  checks++;
  console.log(`PASS ${label}`);
}
function payload(start, changes = {}) {
  return {
    serviceId: "free-consultation",
    mode: "phone",
    start,
    timezone: "Asia/Kolkata",
    name: "Booking API Test",
    email: `api-${run}@example.invalid`,
    phone: "+1 555 010 0199",
    country: "United States",
    region: "California",
    organization: "",
    program: "",
    consent: true,
    idempotencyKey: randomUUID(),
    ...changes,
  };
}
async function nextSlots(client, booking = "") {
  const r = await client.request(
    `/api/availability${booking ? `?booking=${booking}` : ""}`,
  );
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return r.data;
}
const run = randomUUID();
const guest = new Client();
const stranger = new Client();
const member = new Client();
const catalog = await guest.request("/api/services");
check(
  catalog.status === 200 && catalog.data.services.length === 7,
  "published service catalog and gateway-disabled flag",
);
check(
  catalog.data.paymentGatewayEnabled === false,
  "gateway explicitly disabled",
);
const initial = await nextSlots(guest);
check(
  initial.dates.length === 28 && initial.slots.length > 2,
  "28-day request windows with available slots",
);
check(
  (await guest.request("/api/availability?date=2099-01-01")).status === 400,
  "out-of-window date rejected",
);
const body = payload(initial.slots[0].start);
check(
  (
    await guest.request("/api/bookings", body, "POST", {
      origin: "https://untrusted.example",
    })
  ).status === 403,
  "cross-origin booking rejected",
);
check(
  (await guest.request("/api/bookings", { ...body, consent: false })).status ===
    400,
  "server requires contact consent",
);
check(
  (await guest.request("/api/bookings", { ...body, mode: "home" })).status ===
    400,
  "service and visit mode validated",
);
check(
  (await guest.request("/api/bookings", { ...body, timezone: "Invalid/Zone" }))
    .status === 400,
  "invalid time zone rejected",
);
const created = await guest.request("/api/bookings", body);
assert.equal(created.status, 201, JSON.stringify(created.data));
const booking = created.data.appointment;
check(
  booking.status === "requested" &&
    booking.paymentStatus === "not_required" &&
    booking.amount === 0,
  "guest booking saved with honest status",
);
check(
  created.headers
    .getSetCookie()
    .some((c) => c.includes("HttpOnly") && c.includes("SameSite=lax")),
  "guest ownership cookie is HttpOnly and SameSite",
);
check(
  (await guest.request("/api/bookings", body)).data.appointment.id ===
    booking.id,
  "duplicate submission is idempotent",
);
check(
  (
    await guest.request("/api/bookings", {
      ...body,
      start: initial.slots[1].start,
    })
  ).status === 409,
  "reused idempotency key cannot silently change appointment",
);
check(
  created.headers.get("cache-control") === "no-store",
  "private booking response is never cached",
);
check(
  (await stranger.request(`/api/bookings/${booking.id}/calendar`)).status ===
    404,
  "calendar export requires booking ownership",
);
check(
  !(await nextSlots(stranger)).slots.some((s) => s.start === booking.start),
  "reserved window removed for all services",
);
check(
  (await stranger.request(`/api/bookings/${booking.id}`)).status === 404,
  "stranger cannot view booking details",
);
check(
  (
    await stranger.request(
      `/api/bookings/${booking.id}`,
      { action: "cancel" },
      "PATCH",
    )
  ).status === 404,
  "stranger cannot cancel booking",
);
check(
  (await stranger.request(`/api/availability?booking=${booking.id}`)).status ===
    404,
  "reschedule availability requires ownership",
);
check(
  (await guest.request("/api/bookings")).data.appointments.some(
    (a) => a.id === booking.id,
  ),
  "guest can list own bookings",
);
const ics = await guest.request(`/api/bookings/${booking.id}/calendar`);
check(
  ics.status === 200 &&
    ics.data.includes("STATUS:TENTATIVE") &&
    ics.data.includes("TRANSP:TRANSPARENT"),
  "calendar export marks request tentative",
);
const payment = await guest.request(`/api/bookings/${booking.id}/payment`, {});
check(
  payment.status === 200 &&
    payment.data.charged === false &&
    payment.data.code === "CASH_AT_VISIT",
  "payment endpoint never pretends to charge",
);
const auth = {
  name: "Account API Test",
  email: body.email,
  password: "  long passphrase with spaces  ",
};
const registered = await guest.request("/api/auth/register", auth);
check(
  registered.status === 200 && registered.data.recoveryCode?.length === 40,
  "registration returns a one-time recovery code",
);
check(
  (await guest.request("/api/bookings")).data.appointments.some(
    (a) => a.id === booking.id,
  ),
  "matching guest booking attaches using guest possession",
);
check(
  (
    await member.request("/api/auth/login", {
      email: auth.email,
      password: auth.password,
    })
  ).status === 200,
  "password login preserves intentional whitespace",
);
check(
  (await member.request(`/api/bookings/${booking.id}`)).status === 200,
  "signed-in owner sees bookings across sessions",
);
check(
  (
    await stranger.request("/api/auth/login", {
      email: auth.email,
      password: "wrong password",
    })
  ).status === 401,
  "wrong password rejected",
);
const available = await nextSlots(member);
const start = available.slots[0].start;
const secondProcess = new Client(process.env.TEST_SECOND_ORIGIN || origin);
secondProcess.jar = new Map(member.jar);
check(
  (await secondProcess.request("/api/auth/session")).data.customer?.email ===
    auth.email,
  "customer session is shared across app instances",
);
const simultaneous = await Promise.all([
  member.request(
    "/api/bookings",
    payload(start, {
      email: auth.email,
      serviceId: "holistic-pelvic-floor-therapy",
      mode: "clinic",
      amount: 1,
      paymentStatus: "paid",
    }),
  ),
  secondProcess.request("/api/bookings", payload(start, { email: auth.email })),
]);
check(
  simultaneous.filter((r) => r.status === 201).length === 1 &&
    simultaneous.filter((r) => r.status === 409).length === 1,
  "concurrent app instances cannot double-book provider",
);
const other = simultaneous.find((r) => r.status === 201).data.appointment;
check(
  (
    await member.request(
      `/api/bookings/${booking.id}`,
      { action: "reschedule", start: other.start },
      "PATCH",
    )
  ).status === 409,
  "rescheduling into occupied window rejected",
);
check(
  (await member.request(`/api/bookings/${booking.id}`)).data.appointment
    .start === booking.start,
  "failed reschedule preserves original time",
);
const move = (await nextSlots(member, booking.id)).slots.find(
  (s) => s.start !== booking.start,
);
const moved = await member.request(
  `/api/bookings/${booking.id}`,
  { action: "reschedule", start: move.start },
  "PATCH",
);
check(
  moved.status === 200 && moved.data.appointment.start === move.start,
  "owner can reschedule atomically",
);
const quoteSlot = (await nextSlots(member)).slots[0];
const quote = await member.request(
  "/api/bookings",
  payload(quoteSlot.start, {
    email: auth.email,
    serviceId: "holistic-pelvic-floor-therapy",
    mode: "clinic",
    amount: 1,
    paymentStatus: "paid",
  }),
);
check(
  quote.status === 201 &&
    quote.data.appointment.amount === null &&
    quote.data.appointment.paymentStatus === "due_at_visit",
  "server controls price and rejects forged paid state",
);
check(
  (
    await member.request(
      `/api/bookings/${booking.id}`,
      { action: "cancel" },
      "PATCH",
    )
  ).data.appointment.status === "cancelled",
  "owner can cancel request",
);
check(
  (await nextSlots(member)).slots.some((s) => s.start === move.start),
  "cancellation releases preferred time",
);
check(
  (
    await member.request(
      `/api/bookings/${booking.id}`,
      { action: "reschedule", start: move.start },
      "PATCH",
    )
  ).status === 409,
  "cancelled booking cannot be resurrected",
);
const oldSession = new Client();
oldSession.jar = new Map(member.jar);
await member.request("/api/auth/logout", {});
check(
  (await member.request("/api/auth/session")).data.customer === null,
  "logout clears customer session",
);
check(
  (await oldSession.request("/api/auth/session")).data.customer === null,
  "logout revokes the server-side session",
);
const recovery = await stranger.request("/api/auth/recover", {
  email: auth.email,
  recoveryCode: registered.data.recoveryCode,
  password: "replacement long passphrase",
});
check(
  recovery.status === 200 &&
    recovery.data.recoveryCode !== registered.data.recoveryCode,
  "recovery rotates code and password",
);
check(
  (await guest.request("/api/auth/session")).data.customer === null,
  "password recovery revokes other sessions",
);
check(
  (
    await member.request("/api/auth/login", {
      email: auth.email,
      password: auth.password,
    })
  ).status === 401,
  "old password invalid after recovery",
);
check(
  (
    await member.request("/api/auth/recover", {
      email: auth.email,
      recoveryCode: registered.data.recoveryCode,
      password: "another long passphrase",
    })
  ).status === 401,
  "recovery code cannot be reused",
);
check(
  (
    await member.request("/api/auth/login", {
      email: auth.email,
      password: "replacement long passphrase",
    })
  ).status === 200,
  "new password works",
);
const bad = new Client();
const registrationRaceEmail = `race-${run}@example.invalid`;
const registrationRace = await Promise.all(
  [new Client(), new Client(process.env.TEST_SECOND_ORIGIN || origin)].map(
    (client, index) =>
      client.request("/api/auth/register", {
        name: "Concurrent Account",
        email: index
          ? registrationRaceEmail.toUpperCase()
          : registrationRaceEmail,
        password: "a long concurrent passphrase",
      }),
  ),
);
check(
  registrationRace.filter((result) => result.status === 200).length === 1 &&
    registrationRace.filter((result) => result.status === 409).length === 1,
  "case-normalized emails are unique across concurrent registrations",
);
const recoveryRaceCode = registrationRace.find(
  (result) => result.status === 200,
).data.recoveryCode;
const recoveryRace = await Promise.all(
  [new Client(), new Client(process.env.TEST_SECOND_ORIGIN || origin)].map(
    (client, index) =>
      client.request("/api/auth/recover", {
        email: registrationRaceEmail,
        recoveryCode: recoveryRaceCode,
        password: `another recovery passphrase ${index}`,
      }),
  ),
);
check(
  recoveryRace.filter((result) => result.status === 200).length === 1 &&
    recoveryRace.filter((result) => result.status === 401).length === 1,
  "one-time recovery code cannot be consumed concurrently",
);
for (let i = 0; i < 8; i++)
  await bad.request("/api/auth/login", {
    email: `rate-${run}@example.invalid`,
    password: "invalid",
  });
check(
  (
    await bad.request("/api/auth/login", {
      email: `rate-${run}@example.invalid`,
      password: "invalid",
    })
  ).status === 429,
  "authentication attempts rate limited",
);
for (const a of (await member.request("/api/bookings")).data.appointments)
  if (a.status !== "cancelled")
    await member.request(
      `/api/bookings/${a.id}`,
      { action: "cancel" },
      "PATCH",
    );
console.log(
  `\n${checks} booking API checks passed. Test requests cancelled.\n`,
);
