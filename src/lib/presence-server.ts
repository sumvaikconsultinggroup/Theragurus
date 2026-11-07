import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { getStore } from "./booking-store";
import { clerkConfigured, rateLimit } from "./booking-server";

const ONLINE_MS = 20_000;
const RECENT_MS = 15 * 60_000;
const KEEP_MS = 24 * 60 * 60_000;

type PageHit = { path: string; title: string; at: string };

type PresenceRecord = {
  _id: string;
  ip: string;
  userId: string;
  name: string;
  email: string;
  path: string;
  title: string;
  referrer: string;
  language: string;
  width: number;
  device: string;
  pages: PageHit[];
  pathStarted: string;
  firstSeen: string;
  lastSeen: string;
  left: boolean;
};

export type LiveVisitor = {
  id: string;
  ip: string;
  name: string;
  email: string;
  signedIn: boolean;
  path: string;
  title: string;
  referrer: string;
  language: string;
  width: number;
  device: string;
  pages: PageHit[];
  onPageFor: string;
  onSiteFor: string;
  firstSeen: string;
  lastSeen: string;
  online: boolean;
};

function visitorAddress(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const real = request.headers.get("x-real-ip")?.trim() || "";
  const candidate = process.env.TRUST_PROXY === "true" ? forwarded || real : real;
  if (/^[\da-f:.]+$/i.test(candidate) && candidate !== "::1" && candidate !== "127.0.0.1") return candidate;
  if (process.env.TRUST_PROXY === "true" && /^[\da-f:.]+$/i.test(forwarded)) return forwarded;
  return "This computer";
}

function deviceLabel(agent: string) {
  const phone = /Mobile|Android|iPhone|iPad/i.test(agent);
  const browser = /Edg\//.test(agent)
    ? "Edge"
    : /Chrome\//.test(agent)
      ? "Chrome"
      : /Firefox\//.test(agent)
        ? "Firefox"
        : /Safari\//.test(agent)
          ? "Safari"
          : "Browser";
  const system = /Windows/.test(agent)
    ? "Windows"
    : /Mac OS|Macintosh/.test(agent)
      ? "Mac"
      : /Android/.test(agent)
        ? "Android"
        : /iPhone|iPad/.test(agent)
          ? "iPhone or iPad"
          : "Unknown system";
  return `${phone ? "Phone" : "Computer"} · ${system} · ${browser}`;
}

function safePath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "";
  try {
    const url = new URL(value, "http://local");
    for (const key of ["token", "code", "confirm", "secret", "email", "password"]) {
      url.searchParams.delete(key);
    }
    const search = url.searchParams.toString();
    return `${url.pathname}${search ? `?${search}` : ""}`.slice(0, 240);
  } catch {
    return "";
  }
}

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f]/g, "").trim().slice(0, max) : "";
}

function span(from: string, to = Date.now()) {
  const seconds = Math.max(0, Math.round((to - new Date(from).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function present(row: PresenceRecord, online: boolean): LiveVisitor {
  return {
    id: row._id,
    ip: row.ip,
    name: row.name || "Guest",
    email: row.email,
    signedIn: Boolean(row.userId),
    path: row.path,
    title: row.title,
    referrer: row.referrer,
    language: row.language,
    width: row.width,
    device: row.device,
    pages: row.pages || [],
    onPageFor: span(row.pathStarted || row.lastSeen),
    onSiteFor: span(row.firstSeen),
    firstSeen: row.firstSeen,
    lastSeen: row.lastSeen,
    online,
  };
}

export async function recordPresence(request: NextRequest, data: Record<string, unknown>) {
  const path = safePath(data.path);
  if (!path || path.startsWith("/admin") || path.startsWith("/api")) return { ok: true };
  const id = text(data.id, 40);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false };
  await rateLimit(request, "presence", id, 240);
  const store = await getStore();
  const visits = store.database.collection<PresenceRecord>("site_presence");
  const now = new Date().toISOString();
  const current = await visits.findOne({ _id: id });
  const title = text(data.title, 140) || path;
  const samePage = current?.path === path;
  const pages = current?.pages ? [...current.pages] : [];
  if (!samePage) pages.push({ path, title, at: now });
  let name = "Guest";
  let email = "";
  let userId = "";
  if (clerkConfigured()) {
    try {
      const session = await auth();
      if (session.userId) {
        userId = session.userId;
        const user = await currentUser();
        const full = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
        name = full || "Signed-in customer";
        email = user?.primaryEmailAddress?.emailAddress || "";
      }
    } catch {
      userId = "";
    }
  }
  const next: PresenceRecord = {
    _id: id,
    ip: visitorAddress(request),
    userId,
    name: userId ? name : current?.name && current.name !== "Guest" ? current.name : "Guest",
    email: userId ? email : "",
    path,
    title,
    referrer: current?.referrer || text(data.referrer, 240),
    language: text(data.language, 20),
    width: Math.max(0, Math.min(4000, Number(data.width) || 0)),
    device: deviceLabel(request.headers.get("user-agent") || ""),
    pages: pages.slice(-20),
    pathStarted: samePage ? current?.pathStarted || now : now,
    firstSeen: current?.firstSeen || now,
    lastSeen: now,
    left: data.leaving === true,
  };
  await visits.updateOne({ _id: id }, { $set: next }, { upsert: true });
  return { ok: true };
}

export async function liveVisitors() {
  const store = await getStore();
  const visits = store.database.collection<PresenceRecord>("site_presence");
  const now = Date.now();
  await visits.deleteMany({ lastSeen: { $lt: new Date(now - KEEP_MS).toISOString() } });
  const rows = await visits
    .find({ lastSeen: { $gte: new Date(now - RECENT_MS).toISOString() } })
    .sort({ lastSeen: -1 })
    .limit(80)
    .toArray();
  const online = rows
    .filter((row) => !row.left && now - new Date(row.lastSeen).getTime() <= ONLINE_MS)
    .map((row) => present(row, true));
  const recent = rows
    .filter((row) => row.left || now - new Date(row.lastSeen).getTime() > ONLINE_MS)
    .map((row) => present(row, false));
  return { online, recent, updatedAt: new Date(now).toISOString() };
}
