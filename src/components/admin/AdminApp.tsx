"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { toast } from "@/components/Toast";
import {
  bookingServices,
  clinic,
  formatAppointment,
  googleCalendarLink,
  type Appointment,
  type Availability,
} from "@/lib/booking-catalog";
import {
  adminModules,
  fullAccess,
  staffTemplate,
  type AccessLevel,
  type AccessMap,
  type ModuleKey,
  type StaffProfile,
} from "@/lib/admin-access";
import { LiveBoard } from "@/components/admin/LiveBoard";
import {
  DeskBooking,
  ExportControl,
  PracticeBoard,
  RemarketBoard,
  SecurityPanel,
} from "@/components/admin/PracticeInsights";
import { AdminSkeleton, type SkeletonKind } from "@/components/admin/AdminSkeleton";
import "./admin.css";

type Staff = StaffProfile;
let clientStaff: Staff | null | undefined;
type Booking = Appointment & {
  reviewStatus: string;
  collectedAt?: string;
  collectedBy?: string;
};
type Event = {
  _id: string;
  actor: string;
  action: string;
  detail: string;
  created_at: string;
  booking_id?: string;
};
type Campaign = {
  _id: string;
  title: string;
  subject: string;
  body: string;
  status: string;
  created_at: string;
};
type Contact = {
  _id: string;
  email: string;
  name: string;
  status: string;
  consent_source: string;
};
type Overview = {
  counts: { _id: string; count: number }[];
  customers: number;
  upcoming: Booking[];
  activity: Event[];
  emailReady: boolean;
};
async function api<T>(
  path: string,
  data?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`/api/admin/${path}`, {
    method: data ? "POST" : "GET",
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok) {
    if (response.status === 401)
      window.dispatchEvent(new Event("admin-session-expired"));
    throw new Error(body.error || "Please try again.");
  }
  return body;
}
function useRead<T>(url: string, revision = 0) {
  const [snapshot, setSnapshot] = useState<{
    value: T | null;
    error: string;
    url: string;
    revision: number;
  }>({ value: null, error: "", url: "", revision: -1 });
  useEffect(() => {
    let active = true;
    api<T>(url)
      .then((v) => {
        if (active) {
          setSnapshot({ value: v, error: "", url, revision });
        }
      })
      .catch((e) => {
        if (active) {
          setSnapshot({ value: null, error: e.message, url, revision });
        }
      });
    return () => {
      active = false;
    };
  }, [url, revision]);
  const samePage = snapshot.url === url;
  const fresh = samePage && snapshot.revision === revision;
  return {
    value: samePage ? snapshot.value : null,
    error: fresh ? snapshot.error : "",
  };
}
function useWrite(refresh: () => void) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function save(path: string, data: Record<string, unknown>) {
    setBusy(true);
    setMessage("");
    try {
      const result = await api<Record<string, unknown>>(path, data);
      toast({ title: savedTitle(data) });
      refresh();
      return result;
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Please try again.",
        tone: "alert",
      });
      return null;
    } finally {
      setBusy(false);
    }
  }
  return { busy, message, save };
}
function savedTitle(data: Record<string, unknown>) {
  const action = typeof data.action === "string" ? data.action : "";
  const status = typeof data.status === "string" ? data.status : "";
  if (action === "status" && status === "cancelled") return "Booking cancelled.";
  if (action === "status" && status === "confirmed") return "Booking confirmed.";
  if (action === "status" && status === "completed") return "Marked complete.";
  if (action === "status" && status === "no_show") return "Marked as a no-show.";
  if (action === "status") return "Status updated.";
  if (action === "note") return "Note saved.";
  if (action === "quote") return "Quote saved.";
  if (action === "collect") return "Cash collected.";
  if (action === "uncollect") return "Marked not yet collected.";
  if (action === "reschedule") return "Time updated.";
  if (action === "offer") return "Time offered.";
  if (action === "close") return "Waitlist closed.";
  if (action === "remove") return "Removed.";
  return "Saved.";
}
function payload(e: FormEvent<HTMLFormElement>) {
  e.preventDefault();
  return Object.fromEntries(new FormData(e.currentTarget).entries());
}
const human = (value: string) =>
  (
    ({
      requested: "Awaiting confirmation",
      confirmed: "Confirmed",
      completed: "Completed",
      no_show: "No-show",
      cancelled: "Cancelled",
      pending_quote: "Due at visit",
      due_at_visit: "Due at visit",
      collected: "Cash collected",
      not_required: "Complimentary",
      waiting: "Waiting",
      offered: "Offered",
      subscribed: "Subscribed",
      unsubscribed: "Unsubscribed",
      pending: "Awaiting opt-in",
      sent: "Accepted by Resend",
      sending: "Sending",
      draft: "Draft",
    }) as Record<string, string>
  )[value] || value;
function Status({ value }: { value: string }) {
  return (
    <span className={`admin-status admin-status-${value}`}>{human(value)}</span>
  );
}
function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="admin-empty">
      <Icon name="calendar" />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function Loading({
  error,
  kind = "table",
}: {
  error?: string;
  kind?: SkeletonKind;
}) {
  return <AdminSkeleton error={error} kind={kind} />;
}
function Message({ children }: { children: string }) {
  return children ? (
    <p className="admin-message" role="status">
      {children}
    </p>
  ) : null;
}
function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    overview: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    bookings: (
      <>
        <path d="M7 3h10v3H7zM6 5H4v16h16V5h-2M8 11h8M8 15h5" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2" />
      </>
    ),
    customers: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5" />
      </>
    ),
    marketing: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 6 9 7 9-7" />
      </>
    ),
    services: (
      <>
        <path d="M4 4h16v5H4zM4 15h16v5H4zM8 6v1m0 10v1" />
      </>
    ),
    activity: (
      <>
        <path d="M12 8v5l3 2M4 7a9 9 0 1 1-1 7M3 3v5h5" />
      </>
    ),
    settings: (
      <>
        <path d="M4 6h16M4 12h16M4 18h16" />
        <circle cx="8" cy="6" r="2" />
        <circle cx="16" cy="12" r="2" />
        <circle cx="10" cy="18" r="2" />
      </>
    ),
    live: (
      <>
        <circle cx="12" cy="12" r="7" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
      </>
    ),
    analytics: (
      <>
        <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
      </>
    ),
    desk: (
      <>
        <path d="M12 5v14M5 12h14" />
        <rect x="3" y="3" width="18" height="18" rx="4" />
      </>
    ),
    remarket: (
      <>
        <path d="M4 12a8 8 0 1 0 2.3-5.7" />
        <path d="M4 4v4h4" />
      </>
    ),
    coupons: (
      <>
        <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z" />
        <path d="M9 7v10" />
      </>
    ),
    collapse: <path d="m15 6-6 6 6 6" />,
    expand: <path d="m9 6 6 6-6 6" />,
    external: (
      <>
        <path d="M14 5h5v5" />
        <path d="M19 5 10 14" />
        <path d="M17 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.overview}
    </svg>
  );
}
function AdminMark({
  href = "/admin",
  compact = false,
  light = false,
}: {
  href?: string;
  compact?: boolean;
  light?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`admin-brand${light ? " admin-brand-light" : ""}`}
      aria-label="TheraGurus workspace"
    >
      <span className="admin-logo">
        <Image
          src="/theragurus-logo.png"
          alt=""
          width={1489}
          height={1056}
          sizes="48px"
          priority
        />
      </span>
      {!compact && (
        <span className="admin-wordmark">
          Thera<span>Gurus</span>
          <small>Practice workspace</small>
        </span>
      )}
    </Link>
  );
}

function normalizeStaff(next: Staff | null | undefined) {
  if (!next) return next;
  if (next.access && next.role) return next;
  return {
    ...next,
    owner: next.owner !== false,
    role: next.role || "Owner",
    access: next.access || fullAccess(),
  };
}

function assignStaff(
  next: Staff | null,
  setAdmin: (value: Staff | null) => void,
) {
  const value = normalizeStaff(next) ?? null;
  clientStaff = value;
  setAdmin(value);
}

function subscribeToPreferences(listener: () => void) {
  window.addEventListener("storage", listener);
  return () => window.removeEventListener("storage", listener);
}
function useStoredFlag(key: string, checkedValue: string) {
  const stored = useSyncExternalStore(subscribeToPreferences, () => {
    try { return localStorage.getItem(key) === checkedValue; } catch { return false; }
  }, () => false);
  const [override, setOverride] = useState<boolean | undefined>(undefined);
  const value = override ?? stored;
  const update = (next: boolean | ((previous: boolean) => boolean)) => {
    setOverride(typeof next === "function" ? next(value) : next);
  };
  return [value, update] as const;
}
export function AdminApp() {
  const pathname = usePathname(),
    router = useRouter();
  const [admin, setAdmin] = useState<Staff | null | undefined>(
      typeof window === "undefined" ? undefined : normalizeStaff(clientStaff),
    ),
    [revision, setRevision] = useState(0),
    [menu, setMenu] = useState(false),
    [collapsed, setCollapsed] = useStoredFlag("tg-admin-sidebar", "1"),
    [dark, setDark] = useStoredFlag("tg-admin-theme", "dark");
  const refresh = () => setRevision((v) => v + 1);
  const barRef = useRef<HTMLElement>(null);
  const theme = dark ? " is-dark" : "";
  useEffect(() => {
    const el = barRef.current;
    const root = el?.closest(".admin-root");
    if (!el || !(root instanceof HTMLElement)) return;
    const apply = () => root.style.setProperty("--admin-bar", `${el.offsetHeight}px`);
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, [admin]);
  useEffect(() => {
    if (!menu) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);
  useEffect(() => {
    if (dark) document.documentElement.setAttribute("data-admin-theme", "dark");
    else document.documentElement.removeAttribute("data-admin-theme");
    return () => document.documentElement.removeAttribute("data-admin-theme");
  }, [dark]);
  function revealTheme(event: MouseEvent<HTMLButtonElement>) {
    const next = !dark;
    const apply = () => {
      setDark(next);
      if (next) document.documentElement.setAttribute("data-admin-theme", "dark");
      else document.documentElement.removeAttribute("data-admin-theme");
      try {
        localStorage.setItem("tg-admin-theme", next ? "dark" : "light");
      } catch {}
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const view = document as Document & {
      startViewTransition?: (update: () => void) => { ready: Promise<void> };
    };
    if (reduce || !view.startViewTransition) {
      apply();
      return;
    }
    const x = event.clientX;
    const y = event.clientY;
    const end = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );
    const transition = view.startViewTransition(() => {
      flushSync(apply);
    });
    void transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${end}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 700,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });
  }
  useEffect(() => {
    let active = true;
    api<{ admin: Staff | null }>("session")
      .then((d) => {
        if (active) assignStaff(d.admin, setAdmin);
      })
      .catch(() => {
        if (active && !clientStaff) assignStaff(null, setAdmin);
      });
    const expired = () => assignStaff(null, setAdmin);
    window.addEventListener("admin-session-expired", expired);
    return () => {
      active = false;
      window.removeEventListener("admin-session-expired", expired);
    };
  }, []);
  useEffect(() => {
    if (!menu) return;
    document.querySelector<HTMLAnchorElement>(".admin-sidebar nav a")?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(false);
        document.querySelector<HTMLButtonElement>(".admin-menu")?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [menu]);
  const segments = pathname.split("/").filter(Boolean).slice(1),
    section = segments[0] || "overview",
    activeModule = (
      adminModules.some((module) => module.key === section)
        ? section
        : "overview"
    ) as ModuleKey;
  const known = adminModules.some((module) => module.key === activeModule);
  useEffect(() => {
    if (!admin || !known || admin.access[activeModule] !== "hidden") return;
    const next = adminModules.find(
      (module) => admin.access[module.key] !== "hidden",
    );
    if (next)
      router.replace(next.key === "overview" ? "/admin" : `/admin/${next.key}`);
  }, [admin, activeModule, known, router]);
  if (admin === undefined)
    return <div className={`admin-root admin-pending${theme}`} aria-busy="true" />;
  if (!admin)
    return (
      <AdminLogin
        setup={section === "setup"}
        dark={dark}
        onLogin={(a) => {
          assignStaff(a, setAdmin);
          router.replace("/admin");
        }}
      />
    );
  const title =
    adminModules.find((module) => module.key === activeModule)?.label ||
    "Overview";
  const permitted = known && admin.access[activeModule] !== "hidden";
  const visible = adminModules.filter(
    (module) => admin.access[module.key] !== "hidden",
  );
  async function signOut() {
    await api("logout", {});
    assignStaff(null, setAdmin);
    router.replace("/admin/login");
  }
  function toggleSidebar() {
    setCollapsed((value) => {
      const next = !value;
      try {
        localStorage.setItem("tg-admin-sidebar", next ? "1" : "0");
      } catch {}
      return next;
    });
  }
  return (
    <div
      className={`admin-root admin-workspace${collapsed ? " is-collapsed" : ""}${theme}`}
    >
      {menu ? (
        <button
          type="button"
          className="admin-scrim"
          aria-label="Close menu"
          onClick={() => setMenu(false)}
        />
      ) : null}
      <aside className={`admin-sidebar ${menu ? "is-open" : ""}`}>
        <AdminMark />
        <nav aria-label="Administration">
          {visible.map((module) => (
            <Link
              key={module.key}
              href={module.key === "overview" ? "/admin" : `/admin/${module.key}`}
              aria-current={activeModule === module.key ? "page" : undefined}
              title={module.label}
              onClick={() => setMenu(false)}
            >
              <Icon name={module.key} />
              <span className="admin-nav-label">{module.label}</span>
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <button
            className="admin-collapse"
            type="button"
            aria-pressed={collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={toggleSidebar}
          >
            <Icon name={collapsed ? "expand" : "collapse"} />
            <span>Collapse</span>
          </button>
          <Link href="/" title="View website" aria-label="View website">
            <Icon name="external" />
            <span className="admin-nav-label">View website</span>
          </Link>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar" ref={barRef}>
          <button
            className="admin-menu"
            aria-label="Toggle admin navigation"
            aria-expanded={menu}
            onClick={() => setMenu((v) => !v)}
          >
            Menu
          </button>
          <HeaderSearch />
          <div className="admin-topbar-end">
            <button
              className="admin-theme"
              type="button"
              aria-pressed={dark}
              aria-label={dark ? "Use light mode" : "Use dark mode"}
              onClick={revealTheme}
            >
              {dark ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <path d="M20 14.5A7.5 7.5 0 0 1 9.5 4 6.5 6.5 0 1 0 20 14.5Z" />
                </svg>
              )}
            </button>
            <AccountMenu admin={admin} onSignOut={signOut} />
          </div>
        </header>
        <div className="admin-content">
          <div className="admin-heading">
            <div>
              <h1>
                {segments[1] && activeModule === "bookings"
                  ? "Booking details"
                  : title}
              </h1>
            </div>
            <button className="admin-btn admin-btn-secondary" onClick={refresh}>
              Refresh data
            </button>
          </div>
          {!permitted ? (
            <Empty title="This section is not on your account.">
              Ask an owner to change what you can open.
            </Empty>
          ) : activeModule === "live" ? (
            <LiveBoard />
          ) : activeModule === "analytics" ? (
            <PracticeBoard detailed />
          ) : activeModule === "desk" ? (
            <DeskBooking />
          ) : activeModule === "remarket" ? (
            <RemarketBoard canEdit={admin.access.remarket === "edit"} />
          ) : activeModule === "bookings" ? (
            segments[1] ? (
              <BookingDetailAdmin
                id={segments[1]}
                revision={revision}
                refresh={refresh}
              />
            ) : (
              <Bookings
                revision={revision}
                refresh={refresh}
                canEdit={admin.access.bookings === "edit"}
              />
            )
          ) : activeModule === "calendar" ? (
            <Calendar revision={revision} />
          ) : activeModule === "customers" ? (
            <Customers revision={revision} />
          ) : activeModule === "marketing" ? (
            <Marketing revision={revision} refresh={refresh} />
          ) : activeModule === "services" ? (
            <Services revision={revision} />
          ) : activeModule === "coupons" ? (
            <Coupons revision={revision} refresh={refresh} canEdit={admin.access.coupons === "edit"} />
          ) : activeModule === "activity" ? (
            <Activity revision={revision} />
          ) : activeModule === "settings" ? (
            <Settings
              revision={revision}
              refresh={refresh}
              canEdit={admin.access.settings === "edit"}
            />
          ) : (
            <Dashboard revision={revision} />
          )}
        </div>
        <footer className="admin-footer">
          TheraGurus practice workspace{" "}
          <span>Appointments and fees are managed by the clinic.</span>
        </footer>
      </div>
    </div>
  );
}
function AccountMenu({
  admin,
  onSignOut,
}: {
  admin: Staff;
  onSignOut: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <div className="admin-account" ref={root}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="admin-avatar" aria-hidden="true">
          {admin.name.slice(0, 1)}
        </span>
        <span className="admin-account-name">{admin.name}</span>
      </button>
      {open && (
        <div className="admin-account-menu" role="menu">
          <p>
            {admin.name}
            <small>{admin.email}</small>
            <small>{admin.owner ? "Owner" : admin.role}</small>
          </p>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void onSignOut();
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function HeaderSearch() {
  const [q, setQ] = useState(""),
    [open, setOpen] = useState(false),
    [results, setResults] = useState<
      { id: string; kind: string; title: string; detail: string; href: string }[]
    >([]),
    [status, setStatus] = useState("");
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (q.trim().length < 2) return;
    let active = true;
    const query = q.trim();
    const timer = window.setTimeout(() => {
      api<{ results: typeof results }>(`search?q=${encodeURIComponent(query)}`)
        .then((data) => {
          if (!active) return;
          setResults(data.results);
          setStatus(data.results.length ? "" : "Nothing matches that.");
          setOpen(true);
        })
        .catch((error) => {
          if (!active) return;
          setResults([]);
          setStatus(error instanceof Error ? error.message : "Search failed.");
          setOpen(true);
        });
    }, 220);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [q]);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <div className="admin-search" ref={root}>
      <label>
        <span className="admin-sr">Search the workspace</span>
        <input
          type="search"
          placeholder="Search bookings, people, coupons"
          value={q}
          role="combobox"
          aria-expanded={open}
          aria-controls="admin-search-results"
          onChange={(event) => {
            setQ(event.target.value);
            if (event.target.value.trim().length < 2) {
              setOpen(false);
              setResults([]);
              setStatus("");
            }
          }}
          onFocus={() => {
            if (q.trim().length >= 2) setOpen(true);
          }}
        />
      </label>
      {open && (
        <div className="admin-search-results" id="admin-search-results" role="listbox">
          {results.map((result) => (
            <Link
              key={`${result.kind}-${result.id}`}
              href={result.href}
              role="option"
              onClick={() => setOpen(false)}
            >
              <strong>{result.title}</strong>
              <small>
                {result.kind} · {result.detail}
              </small>
            </Link>
          ))}
          {!results.length && <p>{status}</p>}
        </div>
      )}
    </div>
  );
}

function AdminLogin({
  setup,
  dark,
  onLogin,
}: {
  setup: boolean;
  dark: boolean;
  onLogin: (admin: Staff) => void;
}) {
  const [busy, setBusy] = useState(false),
    [codeStep, setCodeStep] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    const values = payload(e);
    setBusy(true);
    try {
      const token = new URLSearchParams(location.hash.slice(1)).get("token");
      const result = await api<{ admin?: Staff; twoFactor?: boolean }>(
        setup ? "setup" : "login",
        {
          ...values,
          ...(setup ? { token } : {}),
        },
      );
      if (result.twoFactor) {
        setCodeStep(true);
        return;
      }
      if (setup) history.replaceState(null, "", location.pathname);
      if (result.admin) onLogin(result.admin);
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Please try again.",
        tone: "alert",
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={`admin-root admin-signin${dark ? " is-dark" : ""}`}>
      <div className="admin-signin-stage">
        <Image
          className="admin-signin-photo"
          src="/admin-practice.jpg"
          alt=""
          fill
          priority
          quality={90}
          sizes="100vw"
        />
        <div className="admin-signin-shade" />
        <div className="admin-signin-copy">
          <AdminMark href="/" light />
          <h1>
            The practice,
            <br />
            quietly in order.
          </h1>
          <p>
            {setup
              ? "Use your invitation to open the workspace."
              : "Bookings, people, and the day ahead."}
          </p>
        </div>
      </div>
      <div className="admin-signin-panel">
        <div className="admin-signin-card">
        <form onSubmit={submit}>
          <h2>{setup ? "Create your account." : "Sign in."}</h2>
            {setup ? (
              <label>
                Your name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={100}
                />
              </label>
            ) : (
              <label>
                Email address
                <input
                  type="email"
                  name="email"
                  autoComplete="username"
                  required
                />
              </label>
            )}
            <label>
              {setup ? "Create a password" : "Password"}
              <input
                name="password"
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete={setup ? "new-password" : "current-password"}
                required
              />
            </label>
            {codeStep && (
              <label>
                Sign-in code
                <input
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  minLength={6}
                  maxLength={6}
                  required
                />
              </label>
            )}
            {setup && (
              <small>
                Use at least 12 characters. Your admin account is separate from
                customer accounts.
              </small>
            )}
            <button className="admin-signin-submit" disabled={busy}>
              {busy
                ? "Please wait…"
                : setup
                  ? "Create administrator account"
                  : "Enter the workspace"}
            </button>
          </form>
          <p className="admin-signin-note">
            Invitation only. For access or a password reset, contact the
            practice owner.
          </p>
          <Link href="/">Back to the website</Link>
        </div>
      </div>
    </div>
  );
}
function BookingTable({ rows }: { rows: Booking[] }) {
  return (
    <div className="admin-table-scroll">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Client</th>
            <th>Service</th>
            <th>Appointment</th>
            <th>Status</th>
            <th>
              <span className="sr-only">Details</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id}>
              <td>
                <strong>{b.name}</strong>
                <small>
                  {b.reference} · {b.email}
                </small>
              </td>
              <td>
                {b.serviceName}
                <small>{b.mode}</small>
              </td>
              <td>{formatAppointment(b.start)}</td>
              <td>
                <Status
                  value={
                    b.status === "cancelled" ? "cancelled" : b.reviewStatus
                  }
                />
              </td>
              <td>
                <Link href={`/admin/bookings/${b.id}`}>
                  View<span className="sr-only"> booking for {b.name}</span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function EventList({ events }: { events: Event[] }) {
  return (
    <ol className="admin-events">
      {events.map((e) => (
        <li key={e._id}>
          <span className="admin-event-dot" />
          <div>
            <strong>{e.action}</strong>
            <p>{e.detail}</p>
            <small>
              {new Date(e.created_at).toLocaleString("en-US", {
                timeZone: clinic.timezone,
              })}{" "}
              · {e.actor}
            </small>
          </div>
        </li>
      ))}
    </ol>
  );
}
function Dashboard({ revision }: { revision: number }) {
  const { value, error } = useRead<Overview>("overview", revision);
  if (!value) return <Loading error={error} kind="overview" />;
  return (
    <>
      <PracticeBoard />
      <div className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>Coming up</h2>
            <p>Upcoming appointments and requests.</p>
          </div>
          <Link href="/admin/bookings">All bookings</Link>
        </div>
        {value.upcoming.length ? (
          <BookingTable rows={value.upcoming} />
        ) : (
          <Empty title="Your next booking will appear here.">
            Share your booking page with clients to start receiving appointment
            requests.
          </Empty>
        )}
      </div>
      <div className="admin-dashboard-bottom">
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>Recent activity</h2>
            <Link href="/admin/activity">View activity</Link>
          </div>
          {value.activity.length ? (
            <EventList events={value.activity} />
          ) : (
            <Empty title="A clear record, from day one.">
              Booking updates, notes and campaign actions will appear here.
            </Empty>
          )}
        </section>
        <section className="admin-panel admin-next">
          <h2>Keep the day moving.</h2>
          <p>
            Review new requests, plan the week, and stay connected with your
            community.
          </p>
          <Link href="/admin/live">
            <Icon name="live" />
            <span>
              On the site now
              <small>Pages, addresses, and the path of each visit</small>
            </span>
            →
          </Link>
          <Link href="/admin/calendar">
            <Icon name="calendar" />
            <span>
              Plan your calendar<small>See the month and each visit</small>
            </span>
            →
          </Link>
          <Link href="/admin/marketing">
            <Icon name="marketing" />
            <span>
              Write your next update
              <small>
                {value.emailReady
                  ? "Resend connected"
                  : "Drafts ready · Resend setup pending"}
              </small>
            </span>
            →
          </Link>
          <Link href="/admin/settings">
            <Icon name="settings" />
            <span>
              Manage availability<small>Block clinic closure dates</small>
            </span>
            →
          </Link>
        </section>
      </div>
    </>
  );
}
const bookingColumns = [
  "requested",
  "confirmed",
  "completed",
  "no_show",
  "cancelled",
] as const;

function bookingColumn(booking: Booking) {
  return booking.status === "cancelled" ? "cancelled" : booking.reviewStatus || "requested";
}

function Bookings({
  revision,
  refresh,
  canEdit,
}: {
  revision: number;
  refresh: () => void;
  canEdit: boolean;
}) {
  const [q, setQ] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [view, setView] = useState<"list" | "board">("list"),
    [over, setOver] = useState("");
  const { busy, message, save } = useWrite(refresh);
  useEffect(() => {
    const saved = localStorage.getItem("tg-admin-bookings-view");
    if (saved === "board" || saved === "list") setView(saved);
  }, []);
  function chooseView(next: "list" | "board") {
    setView(next);
    localStorage.setItem("tg-admin-bookings-view", next);
  }
  const { value, error } = useRead<{
    appointments: Booking[];
    total: number;
    limit: number;
  }>(
    `bookings?q=${encodeURIComponent(q)}&status=${view === "board" ? "" : status}&page=${view === "board" ? 1 : page}&view=${view === "board" ? "board" : "list"}`,
    revision,
  );
  return (
    <>
      <div className="admin-panel-heading">
        <p className="admin-intro">Download visits from the last 30 days as a spreadsheet.</p>
        <ExportControl module="bookings" />
      </div>
      <div className="admin-filters">
        <label>
          Search bookings
          <input
            type="search"
            placeholder="Name, email or reference"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </label>
        {view === "list" && (
          <label>
            Status
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              {bookingColumns.map((s) => (
                <option key={s} value={s}>
                  {human(s)}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="admin-view-toggle" role="group" aria-label="Bookings layout">
          <button
            type="button"
            aria-pressed={view === "list"}
            onClick={() => chooseView("list")}
          >
            List
          </button>
          <button
            type="button"
            aria-pressed={view === "board"}
            onClick={() => chooseView("board")}
          >
            Board
          </button>
        </div>
      </div>
      {message && <p className="admin-message" role="status">{message}</p>}
      <section className="admin-panel">
        {!value ? (
          <Loading error={error} kind="table" />
        ) : value.appointments.length ? (
          view === "board" ? (
            <>
              <BookingBoard
                rows={value.appointments}
                canEdit={canEdit && !busy}
                over={over}
                onOver={setOver}
                onMove={(id, next) => {
                  const current = value.appointments.find((row) => row.id === id);
                  if (!current || bookingColumn(current) === next) return;
                  void save(`bookings/${id}`, { action: "status", status: next });
                }}
              />
              {value.total > value.appointments.length && (
                <p className="admin-board-note">
                  Showing the {value.appointments.length} most recent of {value.total} bookings.
                </p>
              )}
            </>
          ) : (
            <>
              <BookingTable rows={value.appointments} />
              <div className="admin-pagination">
                <span>
                  {value.total} bookings · Page {page}
                </span>
                <div>
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <button
                    disabled={page * value.limit >= value.total}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )
        ) : (
          <Empty
            title={
              q || status
                ? "No bookings match these filters."
                : "You’re ready for your first booking."
            }
          >
            {q || status
              ? "Try another name or clear the filters."
              : "New customer and guest appointment requests appear here automatically."}
          </Empty>
        )}
      </section>
      <Waitlist revision={revision} canEdit={canEdit} refresh={refresh} />
    </>
  );
}
function Waitlist({
  revision,
  canEdit,
  refresh,
}: {
  revision: number;
  canEdit: boolean;
  refresh: () => void;
}) {
  const { value, error } = useRead<{
    waitlist: {
      id: string;
      name: string;
      email: string;
      phone: string;
      serviceName: string;
      mode: string;
      start: string;
      status: string;
    }[];
  }>("waitlist", revision);
  const { busy, message, save } = useWrite(refresh);
  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <h2>Waitlist</h2>
          <p className="admin-intro">
            People who asked to hear if a taken time opens. Offering a time emails them when email sending is connected.
          </p>
        </div>
      </div>
      {message && <p className="admin-message" role="status">{message}</p>}
      {!value ? (
        <Loading error={error} kind="table" />
      ) : value.waitlist.length ? (
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Person</th>
                <th>Visit</th>
                <th>Time</th>
                <th>Status</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {value.waitlist.map((person) => (
                <tr key={person.id}>
                  <td>
                    <strong>{person.name}</strong>
                    <small>{person.email} · {person.phone}</small>
                  </td>
                  <td>
                    {person.serviceName}
                    <small>{person.mode}</small>
                  </td>
                  <td>{formatAppointment(person.start)}</td>
                  <td><Status value={person.status} /></td>
                  <td>
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void save("waitlist", { action: "offer", id: person.id })}
                        >
                          Offer time
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void save("waitlist", { action: "close", id: person.id })}
                        >
                          Close
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No one is waiting on a time.">
          If a guest asks for a time that was just taken, they can join from the booking form.
        </Empty>
      )}
    </section>
  );
}
function BookingBoard({
  rows,
  canEdit,
  over,
  onOver,
  onMove,
}: {
  rows: Booking[];
  canEdit: boolean;
  over: string;
  onOver: (status: string) => void;
  onMove: (id: string, status: string) => void;
}) {
  return (
    <div className="admin-kanban">
      {bookingColumns.map((column) => {
        const cards = rows.filter((row) => bookingColumn(row) === column);
        return (
          <section
            key={column}
            className={`admin-kanban-column${over === column ? " is-over" : ""}`}
            aria-label={human(column)}
            onDragOver={(event) => {
              if (!canEdit) return;
              event.preventDefault();
              onOver(column);
            }}
            onDragLeave={() => onOver("")}
            onDrop={(event) => {
              event.preventDefault();
              onOver("");
              const id = event.dataTransfer.getData("text/plain");
              if (id) onMove(id, column);
            }}
          >
            <header>
              <h2>{human(column)}</h2>
              <span>{cards.length}</span>
            </header>
            {cards.length ? (
              cards.map((booking) => (
                <article
                  key={booking.id}
                  className="admin-kanban-card"
                  draggable={canEdit}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", booking.id);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                >
                  <div>
                    <strong>{booking.name}</strong>
                    <Status value={booking.paymentStatus} />
                  </div>
                  <small>
                    {booking.serviceName} · {booking.mode}
                  </small>
                  <small>{formatAppointment(booking.start)}</small>
                  <small>
                    {booking.reference}
                  </small>
                  <Link href={`/admin/bookings/${booking.id}`}>
                    Open<span className="sr-only"> booking for {booking.name}</span>
                  </Link>
                </article>
              ))
            ) : (
              <p>None</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
function BookingDetailAdmin({
  id,
  revision,
  refresh,
}: {
  id: string;
  revision: number;
  refresh: () => void;
}) {
  const { value, error } = useRead<{ appointment: Booking; events: Event[] }>(
      `bookings/${id}`,
      revision,
    ),
    [date, setDate] = useState(""),
    [chosenStart, setChosenStart] = useState("");
  const availability = useRead<Availability>(
    `availability?booking=${id}${date ? `&date=${date}` : ""}`,
    revision,
  );
  const { busy, message, save } = useWrite(refresh);
  if (!value) return <Loading error={error} kind="detail" />;
  const b = value.appointment;
  return (
    <>
      <Link className="admin-back" href="/admin/bookings">
        ← All bookings
      </Link>
      <div className="admin-detail-columns">
        <div>
          <section className="admin-panel admin-pad">
            <div className="admin-panel-heading">
              <div>
                <h2>{b.name}</h2>
                <p>{b.reference}</p>
              </div>
              <Status
                value={b.status === "cancelled" ? "cancelled" : b.reviewStatus}
              />
            </div>
            <p>
              <a
                href={googleCalendarLink({
                  serviceName: b.serviceName,
                  start: b.start,
                  end: b.end,
                  reference: b.reference,
                  mode: b.mode,
                })}
                target="_blank"
                rel="noreferrer"
              >
                Add this visit to Google Calendar
              </a>
            </p>
            <dl className="admin-definition">
              {[
                ["Service", b.serviceName],
                ["Appointment", formatAppointment(b.start)],
                ["Visit type", b.mode],
                ["Email", b.email],
                ["Phone", b.phone],
                ["Location", [b.region, b.country].filter(Boolean).join(", ")],
                ["Organization", b.organization || "—"],
                ["Program", b.program || "—"],
                ["Created", formatAppointment(b.createdAt)],
                ["Payment", human(b.paymentStatus)],
                [
                  "Coupon",
                  b.couponCode
                    ? `${b.couponName || b.couponCode}${b.discount ? ` · USD ${b.discount.toFixed(2)} off` : ""}`
                    : "—",
                ],
                ["Before the visit", b.intake?.hope || "—"],
                [
                  "Quoted fee",
                  b.amount === null
                    ? "Not quoted"
                    : `USD ${b.amount.toFixed(2)}`,
                ],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="admin-panel admin-pad">
            <h2>Booking timeline</h2>
            <EventList
              events={[
                ...value.events,
                {
                  _id: "created",
                  action: "Booking requested",
                  detail: `${b.serviceName} · ${b.reference}`,
                  actor: b.email,
                  created_at: b.createdAt,
                },
              ]}
            />
          </section>
          <section className="admin-panel admin-pad">
            <h2>Add an internal note</h2>
            <p>
              Appointment logistics only. Keep clinical records in your clinical
              system.
            </p>
            <form
              onSubmit={(e) => {
                const d = payload(e);
                void save(`bookings/${id}`, { action: "note", ...d });
              }}
            >
              <label>
                Note
                <textarea name="note" rows={3} maxLength={2000} required />
              </label>
              <button className="admin-btn" disabled={busy}>
                Save note
              </button>
            </form>
          </section>
        </div>
        <aside>
          <section className="admin-panel admin-pad">
            <h2>Manage appointment</h2>
            <form
              onSubmit={(e) => {
                const d = payload(e);
                void save(`bookings/${id}`, { action: "status", ...d });
              }}
            >
              <label>
                Status
                <select
                  name="status"
                  defaultValue={
                    b.status === "cancelled" ? "cancelled" : b.reviewStatus
                  }
                >
                  {[
                    "requested",
                    "confirmed",
                    "completed",
                    "no_show",
                    "cancelled",
                  ].map((s) => (
                    <option key={s} value={s}>
                      {human(s)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="admin-btn"
                disabled={busy || b.status === "cancelled"}
              >
                Update status
              </button>
            </form>
            <form
              className="admin-separated"
              onSubmit={(e) => {
                const d = payload(e);
                void save(`bookings/${id}`, { action: "quote", ...d });
              }}
            >
              <label>
                Quote · USD
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100000"
                  defaultValue={b.amount ?? ""}
                  required
                />
              </label>
              <button
                className="admin-btn admin-btn-secondary"
                disabled={busy || b.status === "cancelled"}
              >
                Save quote
              </button>
              <small>
                A quote is the amount to collect in cash. It does not charge a
                card.
              </small>
            </form>
            <form
              className="admin-separated"
              onSubmit={(e) => {
                const d = payload(e);
                void save(`bookings/${id}`, { action: "collect", ...d });
              }}
            >
              <h3>Cash at the visit</h3>
              <p>
                {b.paymentStatus === "not_required"
                  ? "This visit is complimentary. There is nothing to collect."
                  : b.paymentStatus === "collected"
                    ? `Cash collected${b.collectedBy ? ` by ${b.collectedBy}` : ""}.`
                    : "The customer pays in cash when they arrive. Nothing is charged online."}
              </p>
              {b.paymentStatus !== "not_required" &&
                b.paymentStatus !== "collected" && (
                  <>
                    <label>
                      Amount received · USD
                      <input
                        name="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100000"
                        defaultValue={b.amount ?? ""}
                        required
                      />
                    </label>
                    <button
                      className="admin-btn admin-btn-secondary"
                      disabled={busy || b.status === "cancelled"}
                    >
                      Mark cash collected
                    </button>
                  </>
                )}
            </form>
            {b.paymentStatus === "collected" && (
              <button
                type="button"
                className="admin-text-button"
                disabled={busy}
                onClick={() => {
                  void save(`bookings/${id}`, { action: "uncollect" });
                }}
              >
                Mark as not yet collected
              </button>
            )}
          </section>
          <section className="admin-panel admin-pad">
            <h2>Reschedule</h2>
            <form
              onSubmit={(e) => {
                const d = payload(e);
                void save(`bookings/${id}`, {
                  action: "reschedule",
                  ...d,
                }).then((result) => {
                  if (result) setChosenStart("");
                });
              }}
            >
              <label>
                Date
                <input
                  type="date"
                  value={date || availability.value?.date || ""}
                  required
                  onChange={(e) => {
                    setDate(e.target.value);
                    setChosenStart("");
                  }}
                  min={availability.value?.dates[0]?.date}
                  max={availability.value?.dates.at(-1)?.date}
                />
              </label>
              <label>
                Available time
                <select
                  name="start"
                  value={chosenStart}
                  onChange={(e) => setChosenStart(e.target.value)}
                  required
                  disabled={
                    busy ||
                    !availability.value ||
                    !availability.value.slots.length
                  }
                >
                  <option value="">
                    {availability.error
                      ? "Times unavailable"
                      : !availability.value
                        ? "Loading available times…"
                        : !availability.value.slots.length
                          ? "No times on this date"
                          : "Select an available time"}
                  </option>
                  {availability.value?.slots.map((s) => (
                    <option value={s.start} key={s.start}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="admin-btn admin-btn-secondary"
                disabled={
                  busy ||
                  !availability.value?.slots.some(
                    (slot) => slot.start === chosenStart,
                  ) ||
                  b.status === "cancelled"
                }
              >
                Reschedule appointment
              </button>
              <small>
                Choose a time for the
                displayed date.
              </small>
              {!availability.value && !availability.error && (
                <p role="status">Loading times for this date…</p>
              )}
              {availability.value && !availability.value.slots.length && (
                <p role="status">
                  No times are available on this date. Choose another date.
                </p>
              )}
              {availability.error && (
                <p className="admin-alert" role="alert">
                  {availability.error} Choose another date or refresh the data.
                </p>
              )}
            </form>
          </section>
          <Message>{message}</Message>
        </aside>
      </div>
    </>
  );
}
function Calendar({ revision }: { revision: number }) {
  const [month, setMonth] = useState(() =>
      new Date()
        .toLocaleDateString("en-CA", { timeZone: clinic.timezone })
        .slice(0, 7),
    ),
    [selected, setSelected] = useState("");
  const first = new Date(`${month}-01T12:00:00Z`),
    next = new Date(first);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const { value, error } = useRead<{ appointments: Booking[] }>(
    `bookings?from=${month}-01&to=${next.toISOString().slice(0, 10)}`,
    revision,
  );
  const count = new Date(
      first.getUTCFullYear(),
      first.getUTCMonth() + 1,
      0,
    ).getDate(),
    offset = first.getUTCDay();
  const key = (b: Booking) =>
    new Date(b.start).toLocaleDateString("en-CA", {
      timeZone: clinic.timezone,
    });
  const rows =
    value?.appointments.filter((b) => b.status !== "cancelled") || [];
  return (
    <>
      <div className="admin-filters">
        <label>
          Month
          <input
            type="month"
            value={month}
            onChange={(e) => {
              if (e.target.value) {
                setMonth(e.target.value);
                setSelected("");
              }
            }}
          />
        </label>
        <p>Select a day to see the appointments.</p>
      </div>
      <div className="admin-panel admin-pad">
        {!value ? (
          <Loading error={error} kind="calendar" />
        ) : (
          <>
            <div className="admin-calendar">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <span key={d} className="admin-calendar-weekday">
                  {d}
                </span>
              ))}
              {Array.from({ length: offset }, (_, i) => (
                <span key={`blank-${i}`} />
              ))}
              {Array.from({ length: count }, (_, i) => {
                const date = `${month}-${String(i + 1).padStart(2, "0")}`,
                  entries = rows.filter((b) => key(b) === date);
                return (
                  <button
                    key={date}
                    className={selected === date ? "selected" : ""}
                    onClick={() => setSelected(date)}
                    aria-label={`${date}, ${entries.length} appointments`}
                    aria-pressed={selected === date}
                  >
                    <strong>{i + 1}</strong>
                    <span>
                      {entries.slice(0, 2).map((b) => (
                        <small key={b.id}>{b.name}</small>
                      ))}
                      {entries.length > 2 && (
                        <small>+{entries.length - 2} more</small>
                      )}
                    </span>
                    {entries.length > 0 && <i aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            <h2 className="admin-calendar-date">{selected || "This month"}</h2>
            {(selected ? rows.filter((b) => key(b) === selected) : rows)
              .length ? (
              <BookingTable
                rows={selected ? rows.filter((b) => key(b) === selected) : rows}
              />
            ) : (
              <Empty title="A little space in the calendar.">
                No appointments on {selected || "this month"}. Block closure
                dates in Settings.
              </Empty>
            )}
          </>
        )}
      </div>
    </>
  );
}
function Customers({ revision }: { revision: number }) {
  const searchParams = useSearchParams();
  const { value, error } = useRead<{
      customers: {
        _id: string;
        name: string;
        phone: string;
        bookings: number;
        lastVisit: string;
      }[];
      total: number;
    }>("customers", revision),
    [q, setQ] = useState(searchParams.get("q") || "");
  if (!value) return <Loading error={error} kind="table" />;
  const rows = value.customers.filter((c) =>
    `${c.name} ${c._id}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <div className="admin-panel-heading">
        <p className="admin-intro">
          Customers and guests from booking records. Marketing permission is
          managed separately.
        </p>
        <ExportControl module="customers" />
      </div>
      <div className="admin-filters">
        <label>
          Find a customer
          <input
            type="search"
            placeholder="Name or email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </div>
      <div className="admin-panel">
        {rows.length ? (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Bookings</th>
                  <th>Latest appointment</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <strong>{c.name}</strong>
                    </td>
                    <td>
                      {c._id}
                      <small>{c.phone}</small>
                    </td>
                    <td>{c.bookings}</td>
                    <td>{formatAppointment(c.lastVisit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Your customer directory starts here.">
            Customer and guest contact details appear after their first booking.
          </Empty>
        )}
      </div>
    </>
  );
}
function Marketing({
  revision,
  refresh,
}: {
  revision: number;
  refresh: () => void;
}) {
  const { value, error } = useRead<{
      campaigns: Campaign[];
      subscribers: Contact[];
      subscribedCount: number;
      emailReady: boolean;
    }>("marketing", revision),
    [tab, setTab] = useState("campaigns"),
    [editing, setEditing] = useState<Campaign | null>(null),
    [subject, setSubject] = useState(""),
    [body, setBody] = useState(""),
    [confirm, setConfirm] = useState(false);
  const { busy, message, save } = useWrite(refresh);
  if (!value) return <Loading error={error} kind="table" />;
  const audienceCount = value.subscribedCount;
  return (
    <>
      <div className="admin-panel-heading">
        <p className="admin-intro">
          Thoughtful updates for people who have chosen to hear from you.
        </p>
        <ExportControl module="newsletter" />
      </div>
      <div
        className={`admin-integration ${value.emailReady ? "connected" : ""}`}
      >
        <span />
        <div>
          <strong>
            {value.emailReady
              ? "Resend is connected"
              : "Email drafts are ready. Resend setup is pending."}
          </strong>
          <p>
            {value.emailReady
              ? "Sends are recorded as accepted by the provider; delivery and opens are not assumed."
              : "Add RESEND_API_KEY and RESEND_FROM_EMAIL to enable sending. You can compose and save campaigns now."}
          </p>
        </div>
      </div>
      <div
        className="admin-tabs"
        role="group"
        aria-label="Email marketing views"
      >
        {[
          ["campaigns", "Campaigns"],
          ["audience", `Audience · ${audienceCount} subscribed`],
        ].map(([k, v]) => (
          <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)}>
            {v}
          </button>
        ))}
      </div>
      {tab === "audience" ? (
        <div className="admin-detail-columns">
          <section className="admin-panel">
            {value.subscribers.length ? (
              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Contact</th>
                      <th>Permission</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {value.subscribers.map((c) => (
                      <tr key={c._id}>
                        <td>
                          <strong>{c.name || c.email}</strong>
                          <small>{c.email}</small>
                        </td>
                        <td>
                          <Status value={c.status} />
                          <small>{c.consent_source}</small>
                        </td>
                        <td>
                          <button
                            className="admin-text-button"
                            disabled={busy || c.status === "unsubscribed"}
                            onClick={() =>
                              void save("subscribers", {
                                action: "unsubscribe",
                                email: c.email,
                              })
                            }
                          >
                            Unsubscribe
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="Build a permission-based audience.">
                Newsletter signups appear here after confirmation. Booking
                consent does not subscribe a customer to marketing.
              </Empty>
            )}
          </section>
          <section className="admin-panel admin-pad">
            <h2>Add a subscribed contact</h2>
            <form
              onSubmit={(e) => {
                const d = payload(e);
                void save("subscribers", { ...d, consent: d.consent === "on" });
              }}
            >
              <label>
                Name
                <input name="name" required maxLength={100} />
              </label>
              <label>
                Email
                <input name="email" type="email" required />
              </label>
              <label>
                Where was permission given?
                <input
                  name="source"
                  placeholder="e.g. Signed newsletter opt-in, 5 November"
                  required
                  maxLength={300}
                />
              </label>
              <label className="admin-checkbox">
                <input type="checkbox" name="consent" required />
                This person explicitly agreed to marketing emails.
              </label>
              <button className="admin-btn" disabled={busy}>
                Add contact
              </button>
            </form>
          </section>
        </div>
      ) : (
        <div className="admin-detail-columns">
          <div className="admin-panel admin-pad">
            <h2>{editing ? "Edit campaign" : "Create a campaign"}</h2>
            <form
              key={editing?._id || "new"}
              onSubmit={(e) => {
                const d = payload(e);
                void save(
                  editing ? `campaigns/${editing._id}/save` : "campaigns",
                  { ...d, subject, body },
                );
              }}
            >
              <label>
                Campaign name
                <input
                  name="title"
                  defaultValue={editing?.title || ""}
                  maxLength={120}
                  placeholder="A name for your team"
                  required
                />
              </label>
              <label>
                Subject
                <input
                  name="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={180}
                  placeholder="What will your subscribers see?"
                  required
                />
              </label>
              <label>
                Message
                <textarea
                  name="body"
                  rows={9}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={6000}
                  placeholder="Write a thoughtful update…"
                  required
                />
              </label>
              <div className="admin-button-row">
                <button className="admin-btn" disabled={busy}>
                  Save draft
                </button>
                {editing && (
                  <button
                    className="admin-btn admin-btn-secondary"
                    type="button"
                    onClick={() => {
                      setEditing(null);
                      setSubject("");
                      setBody("");
                    }}
                  >
                    New campaign
                  </button>
                )}
              </div>
            </form>
            <div className="admin-mail-preview">
              <h3>Email preview</h3>
              <strong>{subject || "Your subject line"}</strong>
              <p>{body || "Your message will appear here."}</p>
              <small>Every campaign includes an unsubscribe link.</small>
            </div>
          </div>
          <div>
            <section className="admin-panel admin-pad">
              <h2>Your campaigns</h2>
              {value.campaigns.length ? (
                value.campaigns.map((c) => (
                  <article className="admin-campaign" key={c._id}>
                    <div>
                      <h3>{c.title}</h3>
                      <Status value={c.status} />
                    </div>
                    <p>{c.subject}</p>
                    <div className="admin-button-row">
                      {c.status === "draft" && (
                        <button
                          className="admin-btn admin-btn-secondary"
                          onClick={() => {
                            setEditing(c);
                            setSubject(c.subject);
                            setBody(c.body);
                          }}
                        >
                          Edit
                        </button>
                      )}
                      {c.status !== "sent" && (
                        <button
                          className="admin-btn"
                          disabled={
                            busy ||
                            !value.emailReady ||
                            !confirm ||
                            !audienceCount
                          }
                          onClick={() =>
                            void save(`campaigns/${c._id}/send`, {
                              confirm: true,
                            })
                          }
                        >
                          {c.status === "sending"
                            ? "Send next batch"
                            : "Send campaign"}
                        </button>
                      )}
                    </div>
                    <CampaignDelivery id={c._id} revision={revision} />
                    <small>
                      {c.status === "sending"
                        ? "Sending in batches of up to 5. Continue until all recipients are processed."
                        : c.status === "sent"
                          ? "All email requests accepted by Resend."
                          : ""}
                    </small>
                  </article>
                ))
              ) : (
                <p>No campaigns yet. Save your first draft to get started.</p>
              )}
            </section>
            <section className="admin-panel admin-pad">
              <h2>Before you send</h2>
              <p>
                {audienceCount} currently subscribed{" "}
                {audienceCount === 1 ? "contact" : "contacts"}. Unsubscribed
                contacts are excluded automatically.
              </p>
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={confirm}
                  onChange={(e) => setConfirm(e.target.checked)}
                />
                I have reviewed the saved campaign and its subscribed audience.
              </label>
              <small>
                Each recipient receives a separate email. Customer addresses are
                never shared with other recipients.
              </small>
            </section>
          </div>
        </div>
      )}
      <Message>{message}</Message>
    </>
  );
}
function CampaignDelivery({ id, revision }: { id: string; revision: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="admin-delivery-report">
      <button
        className="admin-text-button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Hide delivery report" : "View delivery report"}
      </button>
      {open && <DeliveryCounts id={id} revision={revision} />}
    </div>
  );
}
function DeliveryCounts({ id, revision }: { id: string; revision: number }) {
  const { value, error } = useRead<{
    counts: { _id: string; count: number }[];
  }>(`campaigns/${id}`, revision);
  if (!value) return <Loading error={error} kind="table" />;
  return (
    <div>
      <p>
        {value.counts.length
          ? value.counts
              .map(
                (c) =>
                  `${c.count} ${c._id === "accepted" ? "accepted by Resend" : c._id}`,
              )
              .join(" · ")
          : "No messages have been sent."}
      </p>
      <small>
        Provider acceptance is recorded. Delivery, opens and clicks are not
        inferred.
      </small>
    </div>
  );
}
function Activity({ revision }: { revision: number }) {
  const { value, error } = useRead<{ events: Event[] }>("activity", revision);
  if (!value) return <Loading error={error} kind="table" />;
  return (
    <section className="admin-panel admin-pad">
      <h2>Practice activity</h2>
      <p>Latest 200 staff actions, with the actor and time recorded.</p>
      {value.events.length ? (
        <EventList events={value.events} />
      ) : (
        <Empty title="Your activity record starts here.">
          Staff actions will be recorded as you work.
        </Empty>
      )}
    </section>
  );
}
function Services({ revision }: { revision: number }) {
  const { value, error } = useRead<{
    services: typeof bookingServices;
  }>("services", revision);
  if (!value) return <Loading error={error} kind="table" />;
  return (
    <>
      <p className="admin-intro">
        The published service catalog used by customer booking. Final fees are
        quoted per appointment.
      </p>
      <div className="admin-panel">
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Visit types</th>
                <th>Fee</th>
                <th>Public page</th>
              </tr>
            </thead>
            <tbody>
              {value.services.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong>
                    <small>{s.category}</small>
                  </td>
                  <td>{s.modes.join(", ")}</td>
                  <td>
                    {s.price === 0 ? "Complimentary" : "Confirmed by clinic"}
                  </td>
                  <td>
                    <Link
                      href={s.id === "free-consultation" ? "/book" : `/${s.id}`}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
function AccessMatrix({
  value,
  onChange,
}: {
  value: AccessMap;
  onChange: (next: AccessMap) => void;
}) {
  return (
    <div className="admin-access">
      {adminModules.map((module) => (
        <label key={module.key}>
          <span>{module.label}</span>
          <select
            value={value[module.key]}
            onChange={(event) =>
              onChange({
                ...value,
                [module.key]: event.target.value as AccessLevel,
              })
            }
          >
            <option value="hidden">Hidden</option>
            <option value="view">View only</option>
            <option value="edit">Can edit</option>
          </select>
        </label>
      ))}
    </div>
  );
}

function Team({
  revision,
  refresh,
  canEdit,
}: {
  revision: number;
  refresh: () => void;
  canEdit: boolean;
}) {
  const { value, error } = useRead<{
    members: Staff[];
    invites: { email: string; role: string; expiresAt: string }[];
  }>("team", revision);
  const { busy, message, save } = useWrite(refresh);
  const [role, setRole] = useState("Front desk");
  const [access, setAccess] = useState<AccessMap>(staffTemplate);
  const [link, setLink] = useState("");
  const [editing, setEditing] = useState("");
  const [confirmRemove, setConfirmRemove] = useState("");
  if (!value) return <Loading error={error} kind="settings" />;
  return (
    <div className="admin-detail-columns">
      <section className="admin-panel admin-pad">
        <h2>Invite someone</h2>
        <p>
          They receive one setup link, choose their own password, and then see
          only the sections you allow. View only means they can look, not
          change anything.
        </p>
        {canEdit ? (
          <form
            onSubmit={(event) => {
              const values = payload(event);
              void save("team", {
                action: "invite",
                email: values.email,
                role,
                access,
              }).then((result) => {
                const url =
                  result && typeof result.setupUrl === "string"
                    ? result.setupUrl
                    : "";
                if (url) setLink(url);
              });
            }}
          >
            <label>
              Email address
              <input name="email" type="email" required />
            </label>
            <label>
              Role name
              <input
                value={role}
                maxLength={40}
                required
                onChange={(event) => setRole(event.target.value)}
              />
            </label>
            <AccessMatrix value={access} onChange={setAccess} />
            <button className="admin-btn" disabled={busy}>
              Create invitation
            </button>
          </form>
        ) : (
          <p>Only someone who can edit Settings can send an invitation.</p>
        )}
        {link && (
          <div className="admin-invite-link">
            <p>Share this link. It expires in 24 hours and works once.</p>
            <input readOnly value={link} aria-label="Invitation link" />
            <button
              className="admin-btn admin-btn-secondary"
              type="button"
              onClick={() => void navigator.clipboard.writeText(link)}
            >
              Copy link
            </button>
          </div>
        )}
        <Message>{message}</Message>
      </section>
      <section className="admin-panel admin-pad">
        <h2>People with access</h2>
        {value.members.map((member) => (
          <article className="admin-member" key={member.id}>
            <div>
              <strong>{member.name}</strong>
              <small>{member.email}</small>
              <small>{member.owner ? "Owner · every section" : member.role}</small>
            </div>
            {canEdit && !member.owner && (
              <div className="admin-member-actions">
                <button
                  className="admin-text-button"
                  type="button"
                  onClick={() =>
                    setEditing((current) =>
                      current === member.id ? "" : member.id,
                    )
                  }
                >
                  {editing === member.id ? "Close" : "Change access"}
                </button>
                <button
                  className="admin-text-button"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (confirmRemove !== member.id) {
                      setConfirmRemove(member.id);
                      return;
                    }
                    void save("team", { action: "remove", id: member.id });
                    setConfirmRemove("");
                  }}
                >
                  {confirmRemove === member.id ? "Confirm remove" : "Remove"}
                </button>
              </div>
            )}
            {editing === member.id && (
              <MemberAccess
                member={member}
                busy={busy}
                onSave={(nextRole, nextAccess) =>
                  void save("team", {
                    action: "update",
                    id: member.id,
                    role: nextRole,
                    access: nextAccess,
                  }).then((result) => {
                    if (result) setEditing("");
                  })
                }
              />
            )}
          </article>
        ))}
        {value.invites.length > 0 && (
          <>
            <h3>Waiting to join</h3>
            {value.invites.map((invite) => (
              <div className="admin-block" key={invite.email}>
                <span>
                  <strong>{invite.email}</strong>
                  <small>
                    {invite.role} · expires{" "}
                    {new Date(invite.expiresAt).toLocaleString("en-US", {
                      timeZone: clinic.timezone,
                    })}
                  </small>
                </span>
              </div>
            ))}
          </>
        )}
      </section>
    </div>
  );
}

function MemberAccess({
  member,
  busy,
  onSave,
}: {
  member: Staff;
  busy: boolean;
  onSave: (role: string, access: AccessMap) => void;
}) {
  const [role, setRole] = useState(member.role);
  const [access, setAccess] = useState<AccessMap>(member.access);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(role, access);
      }}
    >
      <label>
        Role name
        <input
          value={role}
          maxLength={40}
          required
          onChange={(event) => setRole(event.target.value)}
        />
      </label>
      <AccessMatrix value={access} onChange={setAccess} />
      <button className="admin-btn" disabled={busy}>
        Save access
      </button>
    </form>
  );
}

type Coupon = {
  _id: string;
  code: string;
  name: string;
  kind: "percent" | "amount";
  value: number;
  active: boolean;
  expires_on: string;
  note: string;
};

function Coupons({
  revision,
  refresh,
  canEdit,
}: {
  revision: number;
  refresh: () => void;
  canEdit: boolean;
}) {
  const { value, error } = useRead<{ coupons: Coupon[] }>("coupons", revision);
  const { busy, message, save } = useWrite(refresh);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [open, setOpen] = useState(false);
  function closeForm() {
    setOpen(false);
    setEditing(null);
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeForm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  if (!value) return <Loading error={error} kind="table" />;
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: clinic.timezone,
  });
  return (
    <>
      <div className="admin-panel-heading">
        <p className="admin-intro">
          Codes for the front desk. Look one up when you take cash, then record
          the amount on the booking. Nothing is charged online.
        </p>
        {canEdit && (
          <button
            className="admin-btn"
            type="button"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            Add coupon
          </button>
        )}
      </div>
      {open && (
        <div
          className="admin-modal"
          onClick={closeForm}
        >
          <div
            className="admin-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="coupon-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="coupon-dialog-title">
              {editing ? `Edit ${editing.code}` : "Add a coupon"}
            </h2>
            <form
              key={editing?._id || "new"}
              onSubmit={(event) => {
                const values = payload(event);
                void save("coupons", {
                  action: editing ? "update" : "create",
                  ...(editing ? { id: editing._id } : {}),
                  code: values.code,
                  name: values.name,
                  kind: values.kind,
                  value: Number(values.value),
                  expiresOn: values.expiresOn,
                  note: values.note,
                  active: values.active === "on",
                }).then((result) => {
                  if (result) closeForm();
                });
              }}
            >
              <div className="admin-coupon-fields">
                <label>
                  Code
                  <input
                    name="code"
                    defaultValue={editing?.code || ""}
                    minLength={3}
                    maxLength={24}
                    required
                  />
                </label>
                <label>
                  Name
                  <input
                    name="name"
                    defaultValue={editing?.name || ""}
                    maxLength={80}
                    required
                  />
                </label>
                <label>
                  Discount
                  <select name="kind" defaultValue={editing?.kind || "percent"}>
                    <option value="percent">Percent off</option>
                    <option value="amount">Fixed amount off</option>
                  </select>
                </label>
                <label>
                  Value
                  <input
                    name="value"
                    type="number"
                    min={1}
                    step="1"
                    defaultValue={editing?.value ?? 10}
                    required
                  />
                </label>
                <label>
                  Expires
                  <input
                    name="expiresOn"
                    type="date"
                    defaultValue={editing?.expires_on || ""}
                  />
                </label>
                <label className="admin-field-span">
                  Note
                  <input
                    name="note"
                    defaultValue={editing?.note || ""}
                    maxLength={240}
                    placeholder="Optional, for the front desk"
                  />
                </label>
              </div>
              <label className="admin-check">
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={editing ? editing.active : true}
                />
                Active
              </label>
              <div className="admin-security-actions">
                <button className="admin-btn" disabled={busy}>
                  {editing ? "Save coupon" : "Add coupon"}
                </button>
                <button
                  className="admin-btn admin-btn-secondary"
                  type="button"
                  onClick={closeForm}
                >
                  Cancel
                </button>
              </div>
            </form>
            <Message>{message}</Message>
          </div>
        </div>
      )}
      <section className="admin-panel">
        {value.coupons.length ? (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Off</th>
                  <th>Status</th>
                  <th>Expires</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {value.coupons.map((coupon) => {
                  const expired =
                    !!coupon.expires_on && coupon.expires_on < today;
                  return (
                    <tr key={coupon._id}>
                      <td>
                        <strong>{coupon.code}</strong>
                      </td>
                      <td>
                        {coupon.name}
                        {coupon.note && <small>{coupon.note}</small>}
                      </td>
                      <td>
                        {coupon.kind === "percent"
                          ? `${coupon.value}%`
                          : `USD ${coupon.value}`}
                      </td>
                      <td>
                        {!coupon.active
                          ? "Paused"
                          : expired
                            ? "Expired"
                            : "Active"}
                      </td>
                      <td>{coupon.expires_on || "No expiry"}</td>
                      {canEdit && (
                        <td>
                          <button
                            className="admin-text-button"
                            type="button"
                            onClick={() => {
                              setEditing(coupon);
                              setOpen(true);
                            }}
                          >
                            Edit
                          </button>
                          {coupon.active && (
                            <button
                              className="admin-text-button"
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void save("coupons", {
                                  action: "archive",
                                  id: coupon._id,
                                })
                              }
                            >
                              Pause
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No coupons yet.">
            Add a code the front desk can look up when taking cash.
          </Empty>
        )}
      </section>
    </>
  );
}

function Settings({
  revision,
  refresh,
  canEdit,
}: {
  revision: number;
  refresh: () => void;
  canEdit: boolean;
}) {
  const [section, setSection] = useState<"general" | "team" | "security">(
    "general",
  );
  const { value, error } = useRead<{
    blocks: { _id: string; reason: string }[];
    emailReady: boolean;
    clerkReady: boolean;
  }>("settings", revision);
  const { busy, message, save } = useWrite(refresh);
  if (!value) return <Loading error={error} kind="settings" />;
  return (
    <>
      <div className="admin-tabs" role="tablist" aria-label="Settings">
        <button
          type="button"
          aria-pressed={section === "general"}
          onClick={() => setSection("general")}
        >
          General
        </button>
        <button
          type="button"
          aria-pressed={section === "team"}
          onClick={() => setSection("team")}
        >
          Team and access
        </button>
        <button
          type="button"
          aria-pressed={section === "security"}
          onClick={() => setSection("security")}
        >
          Security
        </button>
      </div>
      {section === "team" ? (
        <Team revision={revision} refresh={refresh} canEdit={canEdit} />
      ) : section === "security" ? (
        <SecurityPanel canEdit={canEdit} />
      ) : (
      <div className="admin-detail-columns">
        <section className="admin-panel admin-pad">
          <h2>Clinic availability</h2>
          <p>
            Request windows use the clinic’s published hours. Block a
            date to prevent new requests; existing bookings are preserved for
            you to manage.
          </p>
          <form onSubmit={(e) => void save("blocks", payload(e))}>
            <label>
              Closure date
              <input type="date" name="date" required disabled={!canEdit} />
            </label>
            <label>
              Reason
              <input
                name="reason"
                placeholder="Holiday, leave or clinic closure"
                maxLength={180}
                required
                disabled={!canEdit}
              />
            </label>
            <button className="admin-btn" disabled={busy || !canEdit}>
              Block date
            </button>
          </form>
          <div className="admin-separated">
            {value.blocks.map((b) => (
              <div className="admin-block" key={b._id}>
                <span>
                  <strong>{b._id}</strong>
                  <small>{b.reason}</small>
                </span>
                <button
                  disabled={busy || !canEdit}
                  onClick={() =>
                    void save("blocks", { action: "remove", date: b._id })
                  }
                >
                  Reopen
                </button>
              </div>
            ))}
          </div>
        </section>
        <div>
          <section className="admin-panel admin-pad">
            <h2>Practice details</h2>
            <dl className="admin-definition">
              {Object.entries({
                Provider: clinic.provider,
                Address: clinic.address,
                Phone: clinic.phone,
                Email: clinic.email,
                Timezone: clinic.timezone,
                Hours: clinic.hours,
              }).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <p>
              These published details are maintained in the service catalog.
            </p>
          </section>
          <section className="admin-panel admin-pad">
            <h2>Connections</h2>
            <p>
              Resend:{" "}
              {value.emailReady ? "Configured" : "Environment settings pending"}
            </p>
            <p>Customer sign-in: {value.clerkReady ? "Clerk configured" : "Clerk keys pending"}</p>
            <p>Payment: Cash when the customer arrives</p>
            <p>Provider calendar sync: Not connected</p>
          </section>
          <section className="admin-panel admin-pad">
            <h2>Change admin password</h2>
            <form
              onSubmit={(e) => {
                const d = payload(e);
                void save("password", d).then((r) => {
                  if (r) window.location.reload();
                });
              }}
            >
              <label>
                Current password
                <input
                  type="password"
                  name="currentPassword"
                  autoComplete="current-password"
                  required
                />
              </label>
              <label>
                New password
                <input
                  type="password"
                  name="password"
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                />
              </label>
              <button className="admin-btn admin-btn-secondary" disabled={busy}>
                Change password and sign out
              </button>
            </form>
          </section>
        </div>
      </div>
      )}
      {section === "general" && <Message>{message}</Message>}
    </>
  );
}
