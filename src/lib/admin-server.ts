import "server-only";
import {
  randomBytes,
  randomInt,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getStore, transaction } from "./booking-store";
import {
  ApiError,
  atClinicTime,
  clerkConfigured,
  staffAppointment,
  availability,
  clinicDate,
  email,
  hash,
  input,
  json,
  password,
  rateLimit,
  text,
} from "./booking-server";
import { bookingServices, clinic } from "./booking-catalog";
import { sendEmail, emailReady } from "./email-server";
import {
  accountAccess,
  allows,
  grantFits,
  hasAnyAccess,
  parseAccess,
  type AccessMap,
  type ModuleKey,
  type StaffProfile,
} from "./admin-access";

type Admin = {
  _id: string;
  name: string;
  email: string;
  password_hash: string;
  version: number;
  created_at: string;
  owner?: boolean;
  role?: string;
  access?: AccessMap;
};
type AdminSession = {
  _id: string;
  admin_id: string;
  version: number;
  expires_at: Date;
};
type Invite = {
  _id: string;
  email: string;
  expires_at: Date;
  used?: boolean;
  role?: string;
  access?: AccessMap;
};
type Coupon = {
  _id: string;
  code: string;
  name: string;
  kind: "percent" | "amount";
  value: number;
  active: boolean;
  expires_on: string;
  note: string;
  created_at: string;
  updated_at: string;
};
export type Campaign = {
  _id: string;
  subject: string;
  body: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  lease_until?: Date;
};
export type Subscriber = {
  _id: string;
  email: string;
  name: string;
  status: string;
  consent_source: string;
  created_at: string;
  token_hash: string;
  unsubscribe_token: string;
};
const COOKIE = "tg_admin_session";
export async function adminStore() {
  const { database } = await getStore();
  return {
    accounts: database.collection<Admin>("admin_accounts"),
    sessions: database.collection<AdminSession>("admin_sessions"),
    invites: database.collection<Invite>("admin_invites"),
    audit: database.collection<{
      _id: string;
      actor: string;
      action: string;
      booking_id?: string;
      detail: string;
      created_at: string;
    }>("admin_audit"),
    campaigns: database.collection<Campaign>("email_campaigns"),
    subscribers: database.collection<Subscriber>("email_subscribers"),
    deliveries: database.collection<{
      _id: string;
      campaign_id: string;
      subscriber_id: string;
      email: string;
      status: string;
      created_at: string;
      provider_id?: string;
      error?: string;
    }>("email_deliveries"),
    blocks: database.collection<{ _id: string; reason: string }>(
      "booking_blocks",
    ),
    coupons: database.collection<Coupon>("admin_coupons"),
    leads: database.collection<Lead>("clinic_leads"),
    settings: database.collection<{
      _id: string;
      session_hours?: number;
      two_factor?: boolean;
    }>("admin_settings"),
    challenges: database.collection<{
      _id: string;
      email: string;
      expires_at: Date;
    }>("admin_challenges"),
  };
}
type Lead = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  interest: string;
  note: string;
  source: string;
  status: "new" | "contacted" | "follow-up" | "converted" | "lost";
  created_at: string;
  updated_at: string;
};
function profile(admin: Admin): StaffProfile {
  return {
    id: admin._id,
    name: admin.name,
    email: admin.email,
    ...accountAccess(admin),
  };
}
function allow(admin: StaffProfile, key: ModuleKey, level: "view" | "edit") {
  if (!allows(admin.access, key, level))
    throw new ApiError(
      403,
      "You do not have access to this part of the workspace.",
    );
}
function encodePassword(value: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(value, salt, 64).toString("hex")}`;
}
function verifyPassword(value: string, encoded: string) {
  const [salt, h] = encoded.split(":");
  if (!salt || !h) return false;
  const actual = scryptSync(value, salt, 64),
    expected = Buffer.from(h, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export async function currentAdmin() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const store = await adminStore();
  const session = await store.sessions.findOne({
    _id: hash(token),
    expires_at: { $gt: new Date() },
  });
  if (!session) return null;
  const admin = await store.accounts.findOne({
    _id: session.admin_id,
    version: session.version,
  });
  return admin ? profile(admin) : null;
}
async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin) throw new ApiError(401, "Sign in to your administrator account.");
  return admin;
}
async function audit(
  actor: string,
  action: string,
  detail: string,
  booking_id?: string,
) {
  const s = await adminStore();
  await s.audit.insertOne({
    _id: randomUUID(),
    actor,
    action,
    detail,
    booking_id,
    created_at: new Date().toISOString(),
  });
}
const multiline = (data: Record<string, unknown>, key: string, max = 6000) => {
  const value = typeof data[key] === "string" ? data[key].trim() : "";
  if (
    !value ||
    value.length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)
  )
    throw new ApiError(400, `Enter a valid ${key}.`);
  return value;
};
export async function adminGet(request: NextRequest, path: string[]) {
  if (path[0] === "session") return json({ admin: await currentAdmin() });
  if (path[0] === "live") {
    const admin = await requireAdmin();
    allow(admin, "live", "view");
    const { liveVisitors } = await import("./presence-server");
    return json(await liveVisitors());
  }
  const admin = await requireAdmin(),
    s = await adminStore(),
    store = await getStore();
  if (path[0] === "bookings" && path[1]) {
    allow(admin, "bookings", "view");
    const row = await store.appointments.findOne({ id: path[1] });
    if (!row) throw new ApiError(404, "Booking not found.");
    return json({
      appointment: staffAppointment(row),
      events: await s.audit
        .find({ booking_id: row.id })
        .sort({ created_at: -1 })
        .limit(100)
        .toArray(),
    });
  }
  if (path[0] === "bookings") {
    const q = (request.nextUrl.searchParams.get("q") || "").slice(0, 100),
      status = request.nextUrl.searchParams.get("status"),
      page = Math.max(
        1,
        Math.min(10000, Number(request.nextUrl.searchParams.get("page")) || 1),
      );
    const query: Record<string, unknown> = {};
    if (q) {
      const re = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = ["name", "email", "reference"].map((k) => ({
        [k]: { $regex: re, $options: "i" },
      }));
    }
    if (status === "cancelled") query.status = "cancelled";
    else if (
      status &&
      ["requested", "confirmed", "completed", "no_show"].includes(status)
    ) {
      query.status = "requested";
      query.admin_status =
        status === "requested" ? { $in: [null, "requested"] } : status;
    }
    const from = request.nextUrl.searchParams.get("from"),
      to = request.nextUrl.searchParams.get("to");
    if (from || to) {
      if (
        !allows(admin.access, "bookings", "view") &&
        !allows(admin.access, "calendar", "view")
      )
        allow(admin, "calendar", "view");
    } else allow(admin, "bookings", "view");
    if (from || to) {
      const validDate = (value: string | null) =>
        !!value &&
        /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        Number.isFinite(new Date(`${value}T12:00:00Z`).getTime()) &&
        new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
      if (!validDate(from) || !validDate(to) || from! >= to!)
        throw new ApiError(400, "Choose a valid calendar date range.");
      query.start_at = {
        $gte: atClinicTime(from!, 0),
        $lt: atClinicTime(to!, 0),
      };
    }
    const board = request.nextUrl.searchParams.get("view") === "board";
    const limit = from ? 500 : board ? 120 : 25;
    const [total, rows] = await Promise.all([
      store.appointments.countDocuments(query),
      store.appointments
        .find(query)
        .sort({ start_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
    ]);
    return json({
      total,
      page,
      limit,
      appointments: rows.map(staffAppointment),
    });
  }
  if (path[0] === "customers") {
    allow(admin, "customers", "view");
    const rows = await store.appointments
      .aggregate([
        {
          $group: {
            _id: "$email",
            name: { $last: "$name" },
            phone: { $last: "$phone" },
            bookings: { $sum: 1 },
            lastVisit: { $max: "$start_at" },
          },
        },
        { $sort: { lastVisit: -1 } },
        { $limit: 1000 },
      ])
      .toArray();
    return json({
      customers: rows,
      total: await store.customers.countDocuments(),
    });
  }
  if (path[0] === "activity") {
    allow(admin, "activity", "view");
    return json({
      events: await s.audit
        .find()
        .sort({ created_at: -1 })
        .limit(200)
        .toArray(),
    });
  }
  if (path[0] === "marketing") {
    allow(admin, "marketing", "view");
    return json({
      subscribedCount: await s.subscribers.countDocuments({
        status: "subscribed",
      }),
      campaigns: await s.campaigns
        .find()
        .sort({ created_at: -1 })
        .limit(100)
        .toArray(),
      subscribers: await s.subscribers
        .find({}, { projection: { token_hash: 0, unsubscribe_token: 0 } })
        .sort({ created_at: -1 })
        .limit(1000)
        .toArray(),
      emailReady: emailReady(),
    });
  }
  if (path[0] === "campaigns" && path[1]) {
    allow(admin, "marketing", "view");
    const campaign = await s.campaigns.findOne({ _id: path[1] });
    if (!campaign) throw new ApiError(404, "Campaign not found.");
    return json({
      campaign,
      counts: await s.deliveries
        .aggregate([
          { $match: { campaign_id: campaign._id } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ])
        .toArray(),
    });
  }
  if (path[0] === "availability") {
    if (
      !allows(admin.access, "bookings", "view") &&
      !allows(admin.access, "calendar", "view") &&
      !allows(admin.access, "desk", "view")
    )
      allow(admin, "bookings", "view");
    return json(
      await availability(
        request.nextUrl.searchParams.get("date") || undefined,
        request.nextUrl.searchParams.get("booking") || "",
      ),
    );
  }
  if (path[0] === "settings") {
    allow(admin, "settings", "view");
    return json({
      blocks: await s.blocks.find().sort({ _id: 1 }).toArray(),
      services: bookingServices,
      clinic,
      emailReady: emailReady(),
      clerkReady: clerkConfigured(),
      security: {
        sessionHours: await sessionHours(s),
        twoFactor: Boolean(
          (await s.settings.findOne({ _id: "security" }))?.two_factor,
        ),
        emailReady: emailReady(),
        activeSessions: await s.sessions.countDocuments({
          admin_id: admin.id,
          expires_at: { $gt: new Date() },
        }),
      },
    });
  }
  if (path[0] === "services") {
    allow(admin, "services", "view");
    return json({ services: bookingServices });
  }
  if (path[0] === "coupons") {
    allow(admin, "coupons", "view");
    return json({ coupons: await couponList(s) });
  }
  if (path[0] === "team") {
    allow(admin, "settings", "view");
    return json(await teamList(s));
  }
  if (path[0] === "search") return json(await workspaceSearch(admin, request));
  if (path[0] === "analytics") {
    if (
      !allows(admin.access, "analytics", "view") &&
      !allows(admin.access, "overview", "view")
    )
      allow(admin, "analytics", "view");
    return json(await practiceInsights(request));
  }
  if (path[0] === "remarket") {
    allow(admin, "remarket", "view");
    return json({ leads: await s.leads.find().sort({ updated_at: -1 }).limit(300).toArray() });
  }
  if (path[0] === "waitlist") {
    allow(admin, "bookings", "view");
    const rows = await store.database
      .collection("booking_waitlist")
      .find({ status: { $in: ["waiting", "offered"] } })
      .sort({ created_at: -1 })
      .limit(100)
      .toArray();
    return json({
      waitlist: rows.map((row) => ({
        id: row._id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        serviceId: row.service_id,
        serviceName: bookingServices.find((service) => service.id === row.service_id)?.name || row.service_id,
        mode: row.mode,
        start: row.start_at,
        status: row.status,
        createdAt: row.created_at,
      })),
    });
  }
  if (path[0] === "export") return exportCsv(admin, request);
  if (path[0] !== "overview") throw new ApiError(404, "Module not found.");
  allow(admin, "overview", "view");
  const [counts, upcoming, activity, customers] = await Promise.all([
    store.appointments
      .aggregate([
        {
          $group: {
            _id: {
              $cond: [
                { $eq: ["$status", "cancelled"] },
                "cancelled",
                { $ifNull: ["$admin_status", "requested"] },
              ],
            },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    store.appointments
      .find({
        status: "requested",
        end_at: { $gt: new Date().toISOString() },
        admin_status: { $nin: ["completed", "no_show"] },
      })
      .sort({ start_at: 1 })
      .limit(8)
      .toArray(),
    s.audit.find().sort({ created_at: -1 }).limit(8).toArray(),
    store.customers.countDocuments(),
  ]);
  return json({
    admin,
    counts,
    upcoming: upcoming.map(staffAppointment),
    activity,
    customers,
    emailReady: emailReady(),
  });
}
export async function adminPost(request: NextRequest, path: string[]) {
  const data = await input(request),
    s = await adminStore();
  if (path[0] === "login" || path[0] === "setup") {
    await rateLimit(request, "admin-auth-global", "", 40);
    const address = path[0] === "login" ? email(data) : "setup";
    await rateLimit(request, "admin-auth", address, 8);
    let row: Admin | null;
    if (path[0] === "setup") {
      const token = text(data, "token", 128);
      const pass = password(data),
        name = text(data, "name", 100);
      row = await transaction(async (store, session) => {
        const invite = await store.database
          .collection<Invite>("admin_invites")
          .findOneAndUpdate(
            {
              _id: hash(token),
              expires_at: { $gt: new Date() },
              used: { $ne: true },
            },
            { $set: { used: true } },
            { session, returnDocument: "before" },
          );
        if (!invite)
          throw new ApiError(
            400,
            "This invitation is invalid or expired. Ask for a new one.",
          );
        if (await s.accounts.findOne({ email: invite.email }, { session }))
          throw new ApiError(
            409,
            "This administrator already exists. Sign in instead.",
          );
        const invited = invite.access
          ? accountAccess({
              owner: false,
              role: invite.role,
              access: invite.access,
            })
          : null;
        const account: Admin = {
          _id: randomUUID(),
          name,
          email: invite.email,
          password_hash: encodePassword(pass),
          version: 1,
          created_at: new Date().toISOString(),
          ...(invited
            ? { owner: false, role: invited.role, access: invited.access }
            : {}),
        };
        await s.accounts.insertOne(account, { session });
        return account;
      });
    } else {
      const pass = password(data);
      row = await s.accounts.findOne({ email: address });
      const valid = verifyPassword(
        pass,
        row?.password_hash ||
          `00000000000000000000000000000000:${"0".repeat(128)}`,
      );
      if (!row || !valid)
        throw new ApiError(401, "The email or password is incorrect.");
    }
    const security = await s.settings.findOne({ _id: "security" });
    if (path[0] === "login" && security?.two_factor && emailReady()) {
      const supplied = typeof data.code === "string" ? data.code.trim() : "";
      if (!/^\d{6}$/.test(supplied)) {
        const code = randomInt(100000, 1000000).toString();
        await s.challenges.deleteMany({ email: row.email });
        await s.challenges.insertOne({
          _id: hash(`${row.email}:${code}`),
          email: row.email,
          expires_at: new Date(Date.now() + 10 * 60 * 1000),
        });
        await sendEmail({
          to: row.email,
          subject: "Your TheraGurus sign-in code",
          body: `Your sign-in code is ${code}. It expires in 10 minutes.`,
          key: hash(`${row.email}:${code}:mail`),
        });
        return json({ twoFactor: true });
      }
      const match = await s.challenges.findOne({
        _id: hash(`${row.email}:${supplied}`),
        expires_at: { $gt: new Date() },
      });
      if (!match)
        throw new ApiError(401, "That sign-in code is incorrect or expired.");
      await s.challenges.deleteOne({ _id: match._id });
    }
    const token = randomBytes(32).toString("hex");
    await s.sessions.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
    const hours = await sessionHours(s);
    await s.sessions.insertOne({
      _id: hash(token),
      admin_id: row._id,
      version: row.version,
      expires_at: new Date(Date.now() + hours * 3600000),
    });
    const response = json({ admin: profile(row) });
    response.cookies.set(COOKIE, token, {
      httpOnly: true,
      sameSite: "strict",
      secure:
        new URL(process.env.APP_ORIGIN || request.url).protocol === "https:",
      path: "/",
      maxAge: hours * 3600,
    });
    await audit(row.email, "Signed in", "Administrator session started.");
    return response;
  }
  const admin = await requireAdmin();
  await rateLimit(request, "admin-write", admin.id, 150);
  if (path[0] === "logout") {
    const token = (await cookies()).get(COOKIE)?.value;
    if (token) await s.sessions.deleteOne({ _id: hash(token) });
    const response = json({ ok: true });
    response.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  }
  if (path[0] === "password") {
    const old = text(data, "currentPassword", 128),
      pass = password(data);
    const account = await s.accounts.findOne({ _id: admin.id });
    if (!account || !verifyPassword(old, account.password_hash))
      throw new ApiError(400, "Current password is incorrect.");
    await s.accounts.updateOne(
      { _id: admin.id },
      { $set: { password_hash: encodePassword(pass) }, $inc: { version: 1 } },
    );
    await s.sessions.deleteMany({ admin_id: admin.id });
    await audit(
      admin.email,
      "Password changed",
      "All administrator sessions revoked.",
    );
    return json({ ok: true });
  }
  if (path[0] === "bookings" && path[1]) {
    allow(admin, "bookings", "edit");
    const id = path[1],
      action = text(data, "action");
    if (action === "note") {
      await audit(admin.email, "Note added", multiline(data, "note", 2000), id);
      return json({ ok: true });
    }
    const before = await (await getStore()).appointments.findOne({ id });
    await transaction(async (store, session) => {
      const row = await store.appointments.findOne({ id }, { session });
      if (!row) throw new ApiError(404, "Booking not found.");
      if (row.status === "cancelled")
        throw new ApiError(409, "This booking is cancelled.");
      const changes: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (action === "status") {
        const status = text(data, "status");
        if (
          ![
            "requested",
            "confirmed",
            "completed",
            "no_show",
            "cancelled",
          ].includes(status)
        )
          throw new ApiError(400, "Choose a valid status.");
        if (
          ["completed", "no_show"].includes(status) &&
          row.end_at > new Date().toISOString()
        )
          throw new ApiError(400, "This appointment has not finished yet.");
        if (status === "cancelled") changes.status = "cancelled";
        else changes.admin_status = status;
      } else if (action === "reschedule") {
        const start = text(data, "start");
        if (!Number.isFinite(new Date(start).getTime()))
          throw new ApiError(400, "Choose a valid appointment time.");
        const slot = (
          await availability(clinicDate(new Date(start)), id, session)
        ).slots.find((x) => x.start === start);
        if (!slot) throw new ApiError(409, "That time is not available.");
        changes.start_at = slot.start;
        changes.end_at = slot.end;
      } else if (action === "quote") {
        const amount = Number(data.amount);
        if (!Number.isFinite(amount) || amount < 0 || amount > 100000)
          throw new ApiError(400, "Enter a valid quote in USD.");
        if (
          bookingServices.find((service) => service.id === row.service_id)
            ?.price === 0 &&
          amount !== 0
        )
          throw new ApiError(400, "This service is complimentary.");
        const listAmount = Math.round(amount * 100) / 100;
        const { priceWithCoupon } = await import("./booking-notify");
        const coupon =
          row.coupon_kind && typeof row.coupon_value === "number"
            ? {
                code: row.coupon_code || "",
                name: row.coupon_name || "",
                kind: row.coupon_kind,
                value: row.coupon_value,
              }
            : null;
        const priced = priceWithCoupon(listAmount, coupon);
        changes.list_amount = listAmount;
        changes.amount = priced.amount;
        changes.discount = priced.discount;
        if (
          row.payment_status !== "collected" &&
          row.payment_status !== "not_required"
        )
          changes.payment_status = priced.amount === 0 ? "not_required" : "due_at_visit";
      } else if (action === "collect" || action === "uncollect") {
        if (
          bookingServices.find((service) => service.id === row.service_id)
            ?.price === 0
        )
          throw new ApiError(400, "This visit has no fee to collect.");
        if (action === "uncollect") {
          changes.payment_status = "due_at_visit";
          changes.collected_at = "";
          changes.collected_by = "";
        } else {
          const amount = Number(data.amount);
          if (!Number.isFinite(amount) || amount < 0 || amount > 100000)
            throw new ApiError(400, "Enter the cash amount received in USD.");
          changes.amount = Math.round(amount * 100) / 100;
          changes.payment_status = "collected";
          changes.collected_at = new Date().toISOString();
          changes.collected_by = admin.email;
        }
      } else throw new ApiError(400, "Choose a booking action.");
      await store.appointments.updateOne(
        { id },
        { $set: changes },
        { session },
      );
      await s.audit.insertOne(
        {
          _id: randomUUID(),
          actor: admin.email,
          action: `Booking ${action}`,
          detail:
            action === "status"
              ? `${row.admin_status || row.status} → ${data.status}`
              : action === "reschedule"
                ? `${row.start_at} → ${changes.start_at}`
                : action === "collect"
                  ? `Cash collected: USD ${changes.amount}`
                  : action === "uncollect"
                    ? "Cash collection cleared. Still due at the visit."
                    : `Quote: USD ${changes.amount}`,
          booking_id: id,
          created_at: new Date().toISOString(),
        },
        { session },
      );
    }, true);
    const after = await (await getStore()).appointments.findOne({ id });
    if (after) {
      const { notifyBookingEvent, releaseWaitlist } = await import("./booking-notify");
      if (action === "status" && data.status === "cancelled") {
        await releaseWaitlist(after.start_at);
        await notifyBookingEvent(after, "cancelled");
      } else if (action === "status" && data.status === "confirmed") {
        await notifyBookingEvent(after, "confirmed");
      } else if (action === "status" && data.status === "no_show") {
        await notifyBookingEvent(after, "no_show");
      } else if (action === "reschedule" && before) {
        await releaseWaitlist(before.start_at);
        await notifyBookingEvent(after, "rescheduled");
      } else if (action === "quote") {
        await notifyBookingEvent(after, "quoted");
      } else if (action === "collect") {
        await notifyBookingEvent(after, "collected");
      }
    }
    return json({ ok: true });
  }
  if (path[0] === "blocks") {
    allow(admin, "settings", "edit");
    const date = text(data, "date");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      throw new ApiError(400, "Choose a date.");
    await transaction(async (store, session) => {
      if (data.action === "remove")
        await s.blocks.deleteOne({ _id: date }, { session });
      else
        await s.blocks.updateOne(
          { _id: date },
          { $set: { reason: text(data, "reason", 180) } },
          { upsert: true, session },
        );
    }, true);
    await audit(
      admin.email,
      "Availability updated",
      `${data.action === "remove" ? "Opened" : "Blocked"}: ${date}`,
    );
    return json({ ok: true });
  }
  if (path[0] === "subscribers") {
    allow(admin, "marketing", "edit");
    const address = email(data);
    if (data.action === "unsubscribe") {
      await s.subscribers.updateOne(
        { _id: address },
        { $set: { status: "unsubscribed" } },
      );
      await audit(admin.email, "Contact unsubscribed", address);
      return json({ ok: true });
    }
    if (data.consent !== true)
      throw new ApiError(400, "Record explicit marketing consent first.");
    await s.subscribers.updateOne(
      { _id: address },
      {
        $set: {
          email: address,
          name: text(data, "name", 100),
          status: "subscribed",
          consent_source: `Admin recorded: ${text(data, "source", 300)}`,
          created_at: new Date().toISOString(),
        },
        $setOnInsert: {
          token_hash: "",
          unsubscribe_token: randomBytes(32).toString("hex"),
        },
      },
      { upsert: true },
    );
    await audit(admin.email, "Subscribed contact added", address);
    return json({ ok: true });
  }
  if (path[0] === "campaigns") {
    allow(admin, "marketing", "edit");
    const id = path[1],
      action = path[2];
    if (!id || action === "save") {
      const values = {
        title: text(data, "title", 120),
        subject: text(data, "subject", 180),
        body: multiline(data, "body"),
        updated_at: new Date().toISOString(),
      };
      if (id) {
        const result = await s.campaigns.updateOne(
          {
            _id: id,
            status: "draft",
            $or: [
              { lease_until: { $exists: false } },
              { lease_until: { $lt: new Date() } },
            ],
          },
          { $set: values },
        );
        if (!result.matchedCount)
          throw new ApiError(409, "Only drafts can be edited.");
      } else
        await s.campaigns.insertOne({
          _id: randomUUID(),
          ...values,
          status: "draft",
          created_at: new Date().toISOString(),
        });
      await audit(admin.email, "Campaign saved", values.title);
      return json({ ok: true });
    }
    if (action === "send") {
      if (!emailReady())
        throw new ApiError(
          503,
          "Add the Resend environment settings before sending email.",
        );
      if (data.confirm !== true)
        throw new ApiError(
          400,
          "Confirm the audience and campaign before sending.",
        );
      const campaign = await s.campaigns.findOneAndUpdate(
        {
          _id: id,
          status: { $in: ["draft", "sending"] },
          $or: [
            { lease_until: { $lt: new Date() } },
            { lease_until: { $exists: false } },
          ],
        },
        { $set: { lease_until: new Date(Date.now() + 60000) } },
        { returnDocument: "after" },
      );
      if (!campaign)
        throw new ApiError(
          409,
          "This campaign is already sending or has finished.",
        );
      try {
        if (campaign.status === "draft") {
          const contacts = await s.subscribers
            .find({ status: "subscribed" })
            .toArray();
          if (!contacts.length)
            throw new ApiError(400, "Add a subscribed contact first.");
          for (const contact of contacts)
            await s.deliveries.updateOne(
              { _id: `${id}:${hash(contact._id)}` },
              {
                $setOnInsert: {
                  campaign_id: id,
                  subscriber_id: contact._id,
                  email: contact.email,
                  status: "pending",
                  created_at: new Date().toISOString(),
                },
              },
              { upsert: true },
            );
          await s.campaigns.updateOne(
            { _id: id },
            { $set: { status: "sending" } },
          );
        }
        const pending = await s.deliveries
          .find({ campaign_id: id, status: "pending" })
          .limit(5)
          .toArray();
        for (const delivery of pending) {
          const contact = await s.subscribers.findOne({
            _id: delivery.subscriber_id,
            status: "subscribed",
          });
          if (!contact) {
            await s.deliveries.updateOne(
              { _id: delivery._id },
              { $set: { status: "skipped" } },
            );
            continue;
          }
          if (
            Date.now() - new Date(delivery.created_at).getTime() >
            23 * 3600000
          )
            throw new ApiError(
              409,
              "This send requires a delivery review before it can be retried.",
            );
          const origin = process.env.APP_ORIGIN || request.nextUrl.origin;
          const unsubscribe = `${origin}/newsletter?unsubscribe=${contact.unsubscribe_token}`;
          const sent = await sendEmail({
            to: contact.email,
            subject: campaign.subject,
            body: `${campaign.body}\n\nUnsubscribe: ${unsubscribe}`,
            key: delivery._id,
          });
          await s.deliveries.updateOne(
            { _id: delivery._id },
            { $set: { status: "accepted", provider_id: sent.id } },
          );
          await new Promise((resolve) => setTimeout(resolve, 550));
        }
        const remaining = await s.deliveries.countDocuments({
          campaign_id: id,
          status: "pending",
        });
        await s.campaigns.updateOne(
          { _id: id },
          {
            $set: {
              status: remaining ? "sending" : "sent",
              updated_at: new Date().toISOString(),
            },
          },
        );
        await audit(
          admin.email,
          "Campaign send batch",
          `${campaign.title}: ${pending.length} processed`,
        );
        return json({ ok: true, remaining });
      } finally {
        await s.campaigns.updateOne(
          { _id: id },
          { $unset: { lease_until: "" } },
        );
      }
    }
  }
  if (path[0] === "coupons") return couponWrite(admin, s, data);
  if (path[0] === "team") return teamWrite(request, admin, s, data);
  if (path[0] === "desk") return deskBooking(admin, data);
  if (path[0] === "waitlist") return waitlistWrite(admin, data);
  if (path[0] === "remarket") return remarketWrite(admin, s, data);
  if (path[0] === "security") return securityWrite(request, admin, s, data);
  throw new ApiError(404, "Action not found.");
}

type AdminDb = Awaited<ReturnType<typeof adminStore>>;
const like = (value: string) => ({
  $regex: value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  $options: "i",
});

async function couponList(s: AdminDb) {
  await s.coupons.createIndex({ code: 1 }, { unique: true });
  return s.coupons.find().sort({ created_at: -1 }).limit(200).toArray();
}

function couponInput(
  data: Record<string, unknown>,
  id = "",
): Omit<Coupon, "created_at" | "updated_at"> {
  const code = text(data, "code", 24).toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z0-9-]{3,24}$/.test(code))
    throw new ApiError(400, "Use 3–24 letters or numbers for the code.", "code");
  const name = text(data, "name", 80);
  const kindValue = text(data, "kind", 16);
  if (kindValue !== "percent" && kindValue !== "amount")
    throw new ApiError(400, "Choose a percent or a fixed amount.", "kind");
  const kind: Coupon["kind"] = kindValue === "amount" ? "amount" : "percent";
  const value = Number(data.value);
  if (
    !Number.isFinite(value) ||
    (kind === "percent" && (!Number.isInteger(value) || value < 1 || value > 100)) ||
    (kind === "amount" && (value < 1 || value > 10000))
  )
    throw new ApiError(
      400,
      kind === "percent"
        ? "Enter a whole percent from 1 to 100."
        : "Enter a cash amount from 1 to 10,000.",
      "value",
    );
  const expires = text(data, "expiresOn", 10, false);
  if (expires && !/^\d{4}-\d{2}-\d{2}$/.test(expires))
    throw new ApiError(400, "Choose a valid expiry date.", "expiresOn");
  return {
    ...(id ? { _id: id } : { _id: randomUUID() }),
    code,
    name,
    kind,
    value: kind === "amount" ? Math.round(value * 100) / 100 : value,
    active: data.active !== false,
    expires_on: expires,
    note: text(data, "note", 240, false),
  };
}

async function couponWrite(
  admin: StaffProfile,
  s: AdminDb,
  data: Record<string, unknown>,
) {
  allow(admin, "coupons", "edit");
  await s.coupons.createIndex({ code: 1 }, { unique: true });
  const action = text(data, "action", 16);
  if (action === "archive") {
    const id = text(data, "id", 80);
    const row = await s.coupons.findOne({ _id: id });
    if (!row) throw new ApiError(404, "Coupon not found.");
    await s.coupons.updateOne(
      { _id: id },
      { $set: { active: false, updated_at: new Date().toISOString() } },
    );
    await audit(admin.email, "Coupon paused", row.code);
    return json({ ok: true });
  }
  if (action !== "create" && action !== "update")
    throw new ApiError(400, "Choose a coupon action.");
  const next = couponInput(data, action === "update" ? text(data, "id", 80) : "");
  const now = new Date().toISOString();
  try {
    if (action === "create") {
      await s.coupons.insertOne({ ...next, created_at: now, updated_at: now });
    } else {
      const { _id, ...fields } = next;
      const saved = await s.coupons.updateOne(
        { _id },
        { $set: { ...fields, updated_at: now } },
      );
      if (!saved.matchedCount) throw new ApiError(404, "Coupon not found.");
    }
  } catch (error) {
    if (
      error instanceof ApiError ||
      !error ||
      typeof error !== "object" ||
      !("code" in error) ||
      error.code !== 11000
    )
      throw error;
    throw new ApiError(409, "That coupon code is already in use.", "code");
  }
  await audit(
    admin.email,
    action === "create" ? "Coupon created" : "Coupon updated",
    `${next.code}: ${next.kind === "percent" ? `${next.value}%` : `USD ${next.value}`}`,
  );
  return json({ coupon: { ...next, created_at: now, updated_at: now } });
}

async function teamList(s: AdminDb) {
  const [members, invites] = await Promise.all([
    s.accounts
      .find(
        {},
        { projection: { password_hash: 0 } },
      )
      .sort({ created_at: 1 })
      .toArray(),
    s.invites
      .find({ used: { $ne: true }, expires_at: { $gt: new Date() } })
      .sort({ expires_at: 1 })
      .toArray(),
  ]);
  return {
    members: members.map((member) => ({
      id: member._id,
      name: member.name,
      email: member.email,
      ...accountAccess(member),
    })),
    invites: invites.map((invite) => ({
      email: invite.email,
      role: invite.role || "Staff",
      expiresAt: invite.expires_at,
    })),
  };
}

async function teamWrite(
  request: NextRequest,
  admin: StaffProfile,
  s: AdminDb,
  data: Record<string, unknown>,
) {
  allow(admin, "settings", "edit");
  const action = text(data, "action", 16);
  if (action === "remove" || action === "update") {
    const id = text(data, "id", 80);
    const member = await s.accounts.findOne({ _id: id });
    if (!member) throw new ApiError(404, "That staff account was not found.");
    if (accountAccess(member).owner)
      throw new ApiError(400, "An owner account keeps full access.");
    if (id === admin.id)
      throw new ApiError(400, "Ask another owner to change your own access.");
    if (action === "remove") {
      await s.accounts.deleteOne({ _id: id });
      await s.sessions.deleteMany({ admin_id: id });
      await audit(admin.email, "Staff removed", member.email);
      return json({ ok: true });
    }
    const role = text(data, "role", 40);
    const access = parseAccess(data.access);
    if (!access || !hasAnyAccess(access))
      throw new ApiError(400, "Choose at least one section they can open.");
    if (!grantFits(admin.access, access, admin.owner))
      throw new ApiError(400, "You can only grant access you already have.");
    await s.accounts.updateOne(
      { _id: id },
      { $set: { role, access, owner: false }, $inc: { version: 1 } },
    );
    await s.sessions.deleteMany({ admin_id: id });
    await audit(admin.email, "Staff access updated", `${member.email}: ${role}`);
    return json({ ok: true });
  }
  if (action !== "invite") throw new ApiError(400, "Choose a team action.");
  const address = email(data);
  const role = text(data, "role", 40);
  const access = parseAccess(data.access);
  if (!access || !hasAnyAccess(access))
    throw new ApiError(400, "Choose at least one section they can open.");
  if (!grantFits(admin.access, access, admin.owner))
    throw new ApiError(400, "You can only grant access you already have.");
  if (await s.accounts.findOne({ email: address }))
    throw new ApiError(409, "That person already has an account. Update their access instead.");
  const token = randomBytes(32).toString("hex");
  await s.invites.deleteMany({ email: address, used: { $ne: true } });
  await s.invites.insertOne({
    _id: hash(token),
    email: address,
    role,
    access,
    expires_at: new Date(Date.now() + 24 * 3600000),
    used: false,
  });
  const setupUrl = `${process.env.APP_ORIGIN || new URL(request.url).origin}/admin/setup#token=${token}`;
  let emailed = false;
  if (emailReady()) {
    try {
      await sendEmail({
        to: address,
        subject: "Your TheraGurus workspace invitation",
        body: `${admin.name} invited you to the practice workspace as ${role}. Open this link within 24 hours and choose your own password:\n${setupUrl}`,
        key: hash(token),
      });
      emailed = true;
    } catch {
      emailed = false;
    }
  }
  await audit(admin.email, "Staff invited", `${address}: ${role}`);
  return json({ setupUrl, emailed, email: address, role });
}

async function workspaceSearch(admin: StaffProfile, request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 80);
  if (q.length < 2) return { results: [] };
  const { database } = await getStore();
  const s = await adminStore();
  const results: {
    id: string;
    kind: string;
    title: string;
    detail: string;
    href: string;
  }[] = [];
  if (allows(admin.access, "bookings", "view")) {
    const rows = await database
      .collection<{ id: string; name: string; email: string; reference?: string }>(
        "booking_appointments",
      )
      .find({ $or: ["name", "email", "reference"].map((key) => ({ [key]: like(q) })) })
      .sort({ start_at: -1 })
      .limit(6)
      .toArray();
    for (const row of rows)
      results.push({
        id: row.id,
        kind: "Booking",
        title: row.name,
        detail: row.reference || row.email,
        href: `/admin/bookings/${row.id}`,
      });
  }
  if (allows(admin.access, "customers", "view")) {
    const rows = await database
      .collection<{ name: string; email: string }>("booking_appointments")
      .find({ $or: [{ name: like(q) }, { email: like(q) }] })
      .sort({ start_at: -1 })
      .limit(8)
      .toArray();
    const seen = new Set<string>();
    for (const row of rows) {
      const address = row.email?.toLowerCase();
      if (!address || seen.has(address)) continue;
      seen.add(address);
      results.push({
        id: address,
        kind: "Customer",
        title: row.name,
        detail: address,
        href: `/admin/customers?q=${encodeURIComponent(address)}`,
      });
      if (seen.size === 4) break;
    }
  }
  if (allows(admin.access, "services", "view")) {
    const needle = q.toLowerCase();
    for (const service of bookingServices)
      if (service.name.toLowerCase().includes(needle))
        results.push({
          id: service.id,
          kind: "Service",
          title: service.name,
          detail: service.category,
          href: "/admin/services",
        });
  }
  if (allows(admin.access, "coupons", "view")) {
    const rows = await s.coupons
      .find({ $or: [{ code: like(q.toUpperCase()) }, { name: like(q) }] })
      .limit(4)
      .toArray();
    for (const row of rows)
      results.push({
        id: row._id,
        kind: "Coupon",
        title: row.code,
        detail: row.name,
        href: "/admin/coupons",
      });
  }
  return { results: results.slice(0, 12) };
}

async function sessionHours(s: AdminDb) {
  const row = await s.settings.findOne({ _id: "security" });
  const hours = Number(row?.session_hours);
  return Number.isInteger(hours) && hours >= 1 && hours <= 72 ? hours : 8;
}

function clinicDay(date = new Date()) {
  return date.toLocaleDateString("en-CA", { timeZone: clinic.timezone });
}

function shiftDay(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function validDay(value: string | null): value is string {
  return (
    !!value &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
  );
}

function readRange(request: NextRequest) {
  const today = clinicDay();
  const from = request.nextUrl.searchParams.get("from") || shiftDay(today, -29);
  const to = request.nextUrl.searchParams.get("to") || today;
  if (!validDay(from) || !validDay(to) || from > to)
    throw new ApiError(400, "Choose a valid date range.");
  return { from, to };
}

async function practiceInsights(request: NextRequest) {
  const { from, to } = readRange(request);
  const { appointments } = await getStore();
  const rows = await appointments
    .find({
      start_at: { $gte: atClinicTime(from, 0), $lt: atClinicTime(shiftDay(to, 1), 0) },
    })
    .limit(5000)
    .toArray();
  const people = new Set<string>();
  const services = new Map<string, { bookings: number; collected: number }>();
  const statuses = new Map<string, number>();
  const buckets = new Map<string, { bookings: number; collected: number }>();
  let collected = 0;
  let due = 0;
  let cancelled = 0;
  let confirmed = 0;
  const span =
    Math.round(
      (new Date(`${to}T12:00:00Z`).getTime() -
        new Date(`${from}T12:00:00Z`).getTime()) /
        86400000,
    ) + 1;
  const monthly = span > 62;
  for (const row of rows) {
    people.add(row.email.toLowerCase());
    const status =
      row.status === "cancelled" ? "cancelled" : row.admin_status || "requested";
    statuses.set(status, (statuses.get(status) || 0) + 1);
    if (status === "cancelled") cancelled += 1;
    if (status === "confirmed") confirmed += 1;
    const cash = row.payment_status === "collected" ? Number(row.amount) || 0 : 0;
    if (row.payment_status === "collected") collected += cash;
    if (row.payment_status === "due_at_visit") due += 1;
    const service = services.get(row.service_id) || { bookings: 0, collected: 0 };
    service.bookings += 1;
    service.collected += cash;
    services.set(row.service_id, service);
    const day = new Date(row.start_at).toLocaleDateString("en-CA", {
      timeZone: clinic.timezone,
    });
    const key = monthly ? day.slice(0, 7) : day;
    const bucket = buckets.get(key) || { bookings: 0, collected: 0 };
    bucket.bookings += 1;
    bucket.collected += cash;
    buckets.set(key, bucket);
  }
  const money = (value: number) => Math.round(value * 100) / 100;
  return {
    from,
    to,
    totals: {
      bookings: rows.length,
      people: people.size,
      collected: money(collected),
      due,
      cancelled,
      confirmed,
    },
    series: [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, value]) => ({
        label,
        bookings: value.bookings,
        collected: money(value.collected),
      })),
    services: [...services.entries()]
      .map(([id, value]) => ({
        name: bookingServices.find((service) => service.id === id)?.name || id,
        bookings: value.bookings,
        collected: money(value.collected),
      }))
      .sort((a, b) => b.bookings - a.bookings),
    statuses: [...statuses.entries()].map(([status, count]) => ({ status, count })),
  };
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function csvFile(name: string, rows: unknown[][]) {
  const body = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="theragurus-${name}.csv"`,
    },
  });
}

async function exportCsv(admin: StaffProfile, request: NextRequest) {
  const moduleName = request.nextUrl.searchParams.get("module") || "";
  const { from, to } = readRange(request);
  if (moduleName === "bookings" || moduleName === "analytics") {
    if (moduleName === "analytics") {
      if (
        !allows(admin.access, "analytics", "view") &&
        !allows(admin.access, "overview", "view")
      )
        allow(admin, "analytics", "view");
    } else allow(admin, "bookings", "view");
    const insight = await practiceInsights(request);
    if (moduleName === "analytics") {
      return csvFile("analytics", [
        ["From", "To", "Bookings", "People", "Cash collected", "Due at visit", "Confirmed", "Cancelled"],
        [
          insight.from,
          insight.to,
          insight.totals.bookings,
          insight.totals.people,
          insight.totals.collected,
          insight.totals.due,
          insight.totals.confirmed,
          insight.totals.cancelled,
        ],
        [],
        ["Period", "Bookings", "Cash collected"],
        ...insight.series.map((row) => [row.label, row.bookings, row.collected]),
        [],
        ["Service", "Bookings", "Cash collected"],
        ...insight.services.map((row) => [row.name, row.bookings, row.collected]),
      ]);
    }
    const { appointments } = await getStore();
    const rows = await appointments
      .find({
        start_at: {
          $gte: atClinicTime(from, 0),
          $lt: atClinicTime(shiftDay(to, 1), 0),
        },
      })
      .sort({ start_at: 1 })
      .limit(5000)
      .toArray();
    return csvFile("bookings", [
      ["Reference", "Name", "Email", "Phone", "Service", "Visit", "Start", "Status", "Payment", "Amount"],
      ...rows.map((row) => [
        row.reference,
        row.name,
        row.email,
        row.phone,
        bookingServices.find((service) => service.id === row.service_id)?.name || row.service_id,
        row.mode,
        row.start_at,
        row.status === "cancelled" ? "cancelled" : row.admin_status || "requested",
        row.payment_status,
        row.amount ?? "",
      ]),
    ]);
  }
  if (moduleName === "customers") {
    allow(admin, "customers", "view");
    const { appointments } = await getStore();
    const rows = await appointments
      .aggregate([
        {
          $group: {
            _id: "$email",
            name: { $last: "$name" },
            phone: { $last: "$phone" },
            bookings: { $sum: 1 },
            lastVisit: { $max: "$start_at" },
          },
        },
        { $sort: { lastVisit: -1 } },
        { $limit: 5000 },
      ])
      .toArray();
    return csvFile("customers", [
      ["Name", "Email", "Phone", "Bookings", "Last visit"],
      ...rows.map((row) => [row.name, row._id, row.phone, row.bookings, row.lastVisit]),
    ]);
  }
  if (moduleName === "newsletter") {
    allow(admin, "marketing", "view");
    const s = await adminStore();
    const rows = await s.subscribers
      .find({}, { projection: { token_hash: 0, unsubscribe_token: 0 } })
      .sort({ created_at: -1 })
      .limit(5000)
      .toArray();
    return csvFile("newsletter", [
      ["Email", "Name", "Status", "Source", "Joined"],
      ...rows.map((row) => [row.email, row.name, row.status, row.consent_source, row.created_at]),
    ]);
  }
  if (moduleName === "coupons") {
    allow(admin, "coupons", "view");
    const s = await adminStore();
    const rows = await couponList(s);
    return csvFile("coupons", [
      ["Code", "Name", "Kind", "Value", "Active", "Expires", "Note"],
      ...rows.map((row) => [row.code, row.name, row.kind, row.value, row.active, row.expires_on, row.note]),
    ]);
  }
  if (moduleName === "remarket") {
    allow(admin, "remarket", "view");
    const s = await adminStore();
    const rows = await s.leads.find().sort({ updated_at: -1 }).limit(5000).toArray();
    return csvFile("remarket", [
      ["Name", "Email", "Phone", "Interest", "Source", "Status", "Note", "Updated"],
      ...rows.map((row) => [row.name, row.email, row.phone, row.interest, row.source, row.status, row.note, row.updated_at]),
    ]);
  }
  throw new ApiError(404, "Choose a list to export.");
}

async function waitlistWrite(admin: StaffProfile, data: Record<string, unknown>) {
  allow(admin, "bookings", "edit");
  const action = text(data, "action", 16);
  if (action !== "offer" && action !== "close")
    throw new ApiError(400, "Choose a waitlist action.");
  const { updateWaitlist } = await import("./booking-notify");
  const result = await updateWaitlist(text(data, "id", 80), action);
  if (!result.found) throw new ApiError(404, "That waitlist request was not found.");
  await audit(
    admin.email,
    action === "close" ? "Waitlist closed" : "Waitlist offered",
    text(data, "id", 80),
  );
  return json({ ok: true, emailed: result.sent });
}

async function deskBooking(admin: StaffProfile, data: Record<string, unknown>) {
  allow(admin, "desk", "edit");
  const name = text(data, "name", 100);
  const address = email(data);
  const phone = text(data, "phone", 32);
  const serviceId = text(data, "serviceId", 80);
  const service = bookingServices.find((item) => item.id === serviceId);
  if (!service) throw new ApiError(400, "Choose a service.", "serviceId");
  const mode = text(data, "mode", 20);
  if (!service.modes.includes(mode as (typeof service.modes)[number]))
    throw new ApiError(400, "Choose a visit type for this service.", "mode");
  const start = text(data, "start", 40);
  const slot = (await availability(clinicDate(new Date(start)), "")).slots.find(
    (item) => item.start === start,
  );
  if (!slot)
    throw new ApiError(409, "That time is not open. Choose another.", "start");
  const couponCode = text(data, "couponCode", 24, false);
  const { findCoupon, priceWithCoupon, notifyBookingEvent } = await import("./booking-notify");
  const couponLookup = couponCode ? await findCoupon(couponCode) : null;
  if (couponLookup && "error" in couponLookup)
    throw new ApiError(400, couponLookup.error, "couponCode");
  const coupon = couponLookup && "coupon" in couponLookup ? couponLookup.coupon : null;
  const listAmount = service.price;
  const priced = listAmount && listAmount > 0 ? priceWithCoupon(listAmount, coupon) : null;
  const amount = priced ? priced.amount : listAmount;
  const now = new Date().toISOString();
  const appointment = {
    id: randomUUID(),
    reference: `TG-${randomBytes(4).toString("hex").toUpperCase()}`,
    customer_id: null,
    guest_hash: null,
    service_id: service.id,
    mode: mode as (typeof service.modes)[number],
    start_at: slot.start,
    end_at: slot.end,
    timezone: clinic.timezone,
    name,
    email: address,
    phone,
    country: text(data, "country", 80, false) || "United States",
    region: text(data, "region", 80, false),
    organization: text(data, "organization", 120, false),
    program: "",
    status: "requested" as const,
    admin_status: "confirmed" as const,
    payment_status: amount === 0 ? ("not_required" as const) : ("due_at_visit" as const),
    amount,
    coupon_code: coupon?.code || "",
    coupon_name: coupon?.name || "",
    coupon_kind: coupon?.kind,
    coupon_value: coupon?.value,
    discount: priced?.discount || 0,
    list_amount: listAmount,
    idempotency_key: hash(`desk:${admin.id}:${randomUUID()}`),
    created_at: now,
    updated_at: now,
  };
  const store = await getStore();
  await store.appointments.insertOne(appointment);
  await notifyBookingEvent(appointment, "confirmed");
  await audit(
    admin.email,
    "Booked at the desk",
    `${appointment.reference} · ${name} · ${service.name}`,
    appointment.id,
  );
  return json({ appointment: staffAppointment(appointment) });
}

async function remarketWrite(
  admin: StaffProfile,
  s: AdminDb,
  data: Record<string, unknown>,
) {
  allow(admin, "remarket", "edit");
  const action = text(data, "action", 16);
  const statuses = ["new", "contacted", "follow-up", "converted", "lost"];
  if (action === "status") {
    const id = text(data, "id", 80);
    const status = text(data, "status", 20);
    if (!statuses.includes(status)) throw new ApiError(400, "Choose a lead status.");
    const saved = await s.leads.updateOne(
      { _id: id },
      { $set: { status: status as Lead["status"], updated_at: new Date().toISOString() } },
    );
    if (!saved.matchedCount) throw new ApiError(404, "That lead was not found.");
    await audit(admin.email, "Lead updated", `${id}: ${status}`);
    return json({ ok: true });
  }
  if (action !== "create") throw new ApiError(400, "Choose a remarket action.");
  const lead: Lead = {
    _id: randomUUID(),
    name: text(data, "name", 100),
    email: text(data, "email", 254, false),
    phone: text(data, "phone", 32, false),
    interest: text(data, "interest", 120),
    note: text(data, "note", 500, false),
    source: text(data, "source", 40),
    status: "new",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (!["phone", "walk-in", "website"].includes(lead.source))
    throw new ApiError(400, "Choose where this lead came from.", "source");
  if (!lead.email && !lead.phone)
    throw new ApiError(400, "Add an email or a phone number.");
  await s.leads.insertOne(lead);
  await audit(admin.email, "Lead added", `${lead.name} · ${lead.source}`);
  return json({ lead });
}

async function securityWrite(
  request: NextRequest,
  admin: StaffProfile,
  s: AdminDb,
  data: Record<string, unknown>,
) {
  allow(admin, "settings", "edit");
  const action = text(data, "action", 20);
  if (action === "timeout") {
    const hours = Number(data.hours);
    if (!Number.isInteger(hours) || hours < 1 || hours > 72)
      throw new ApiError(400, "Choose a session length from 1 to 72 hours.");
    const twoFactor = data.twoFactor === true;
    await s.settings.updateOne(
      { _id: "security" },
      { $set: { session_hours: hours, two_factor: twoFactor } },
      { upsert: true },
    );
    await audit(
      admin.email,
      "Security updated",
      `${hours} hours · sign-in code ${twoFactor ? "on" : "off"}`,
    );
    return json({ ok: true, sessionHours: hours, twoFactor });
  }
  if (action !== "revoke") throw new ApiError(400, "Choose a security action.");
  const token = (await cookies()).get(COOKIE)?.value;
  await s.sessions.deleteMany({
    admin_id: admin.id,
    ...(token ? { _id: { $ne: hash(token) } } : {}),
  });
  await audit(admin.email, "Other sessions signed out", "Current session kept.");
  return json({ ok: true });
}
