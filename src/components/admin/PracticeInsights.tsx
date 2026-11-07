"use client";

import { useEffect, useState } from "react";
import { bookingServices, clinic, visitModes } from "@/lib/booking-catalog";
import { AdminSkeleton } from "@/components/admin/AdminSkeleton";
import { toast } from "@/components/Toast";

type Totals = {
  bookings: number;
  people: number;
  collected: number;
  due: number;
  cancelled: number;
  confirmed: number;
};
type Insight = {
  from: string;
  to: string;
  totals: Totals;
  series: { label: string; bookings: number; collected: number }[];
  services: { name: string; bookings: number; collected: number }[];
  statuses: { status: string; count: number }[];
};
type Lead = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  interest: string;
  note: string;
  source: string;
  status: string;
  updated_at: string;
};

const presets = [
  ["7d", "7 days"],
  ["30d", "30 days"],
  ["90d", "90 days"],
  ["month", "This month"],
  ["all", "All time"],
] as const;

function clinicToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: clinic.timezone });
}

function shiftDay(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function presetRange(key: string) {
  const today = clinicToday();
  if (key === "7d") return { from: shiftDay(today, -6), to: today };
  if (key === "90d") return { from: shiftDay(today, -89), to: today };
  if (key === "month") return { from: `${today.slice(0, 7)}-01`, to: today };
  if (key === "all") return { from: "2020-01-01", to: today };
  return { from: shiftDay(today, -29), to: today };
}

async function readJson<T>(path: string, body?: Record<string, unknown>) {
  const response = await fetch(`/api/admin/${path}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Please try again.");
  return data as T;
}

export function ExportControl({
  module,
  from,
  to,
}: {
  module: string;
  from?: string;
  to?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <span className="admin-export">
      <button
        className="admin-btn admin-btn-secondary"
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          const query = new URLSearchParams({ module });
          if (from) query.set("from", from);
          if (to) query.set("to", to);
          void fetch(`/api/admin/export?${query}`)
            .then(async (response) => {
              if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || "The export could not be prepared.");
              }
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `theragurus-${module}.csv`;
              link.click();
              URL.revokeObjectURL(url);
            })
            .then(() => toast({ title: "Export ready." }))
            .catch((reason) =>
              toast({
                title: reason instanceof Error ? reason.message : "Export failed.",
                tone: "alert",
              }),
            )
            .finally(() => setBusy(false));
        }}
      >
        {busy ? "Preparing…" : "Export"}
      </button>
    </span>
  );
}

function RangeBar({
  from,
  to,
  preset,
  onChange,
}: {
  from: string;
  to: string;
  preset: string;
  onChange: (from: string, to: string, preset: string) => void;
}) {
  return (
    <div className="admin-range">
      {presets.map(([key, label]) => (
        <button
          key={key}
          type="button"
          aria-pressed={preset === key}
          onClick={() => {
            const next = presetRange(key);
            onChange(next.from, next.to, key);
          }}
        >
          {label}
        </button>
      ))}
      <div className="admin-range-dates">
        <label>
          From
          <input
            type="date"
            value={from}
            onChange={(event) => onChange(event.target.value, to, "custom")}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={to}
            onChange={(event) => onChange(from, event.target.value, "custom")}
          />
        </label>
      </div>
    </div>
  );
}

function Bars({
  rows,
}: {
  rows: { label: string; value: number; detail?: string }[];
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  if (!rows.length)
    return <p className="admin-intro">Nothing in this range yet.</p>;
  return (
    <div className="admin-bars">
      {rows.map((row) => (
        <div key={row.label}>
          <span>{row.label}</span>
          <i style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }} />
          <b>
            {row.value}
            {row.detail ? <small>{row.detail}</small> : null}
          </b>
        </div>
      ))}
    </div>
  );
}

export function PracticeBoard({ detailed = false }: { detailed?: boolean }) {
  const initial = presetRange("30d");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [preset, setPreset] = useState("30d");
  const [value, setValue] = useState<Insight | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    readJson<Insight>(`analytics?from=${from}&to=${to}`)
      .then((data) => {
        if (active) {
          setValue(data);
          setError("");
        }
      })
      .catch((reason) => {
        if (active)
          setError(reason instanceof Error ? reason.message : "Please try again.");
      });
    return () => {
      active = false;
    };
  }, [from, to]);
  const money = (amount: number) =>
    amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
  return (
    <section className="admin-insight">
      <div className="admin-panel-heading">
        <div>
          <h2>{detailed ? "Practice analytics" : "This range"}</h2>
          <p>Cash is what the clinic has already marked collected.</p>
        </div>
        <ExportControl module={detailed ? "analytics" : "bookings"} from={from} to={to} />
      </div>
      <RangeBar
        from={from}
        to={to}
        preset={preset}
        onChange={(nextFrom, nextTo, nextPreset) => {
          if (nextFrom && nextTo && nextFrom <= nextTo) {
            setFrom(nextFrom);
            setTo(nextTo);
            setPreset(nextPreset);
          }
        }}
      />
      {error && (
        <p className="admin-alert" role="alert">
          {error}
        </p>
      )}
      {!value && !error && <AdminSkeleton kind="analytics" />}
      {value && (
        <>
          <div className="admin-metrics">
            {(
              [
                ["Bookings", value.totals.bookings, "In this range"],
                ["People", value.totals.people, "Unique emails"],
                ["Cash collected", money(value.totals.collected), "Marked at the visit"],
                ["Due at visit", value.totals.due, "Not collected yet"],
                ["Confirmed", value.totals.confirmed, "Clinic confirmed"],
                ["Cancelled", value.totals.cancelled, "Called off"],
              ] as const
            ).map(([label, total, detail]) => (
              <article key={label}>
                <span>{label}</span>
                <strong>{total}</strong>
                <small>{detail}</small>
              </article>
            ))}
          </div>
          <div className={detailed ? "admin-detail-columns" : ""}>
            <div className="admin-panel admin-pad">
              <h3>{value.series.some((row) => row.label.length === 7) ? "By month" : "By day"}</h3>
              <Bars
                rows={value.series.map((row) => ({
                  label: row.label.slice(5),
                  value: row.bookings,
                  detail: money(row.collected),
                }))}
              />
            </div>
            {detailed && (
              <div className="admin-panel admin-pad">
                <h3>By service</h3>
                <Bars
                  rows={value.services.map((row) => ({
                    label: row.name,
                    value: row.bookings,
                    detail: money(row.collected),
                  }))}
                />
                <h3>By status</h3>
                <Bars
                  rows={value.statuses.map((row) => ({
                    label: row.status.replaceAll("_", " "),
                    value: row.count,
                  }))}
                />
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export function DeskBooking() {
  const [date, setDate] = useState(clinicToday);
  const [serviceId, setServiceId] = useState(bookingServices[0]?.id || "");
  const [preferredMode, setMode] = useState(bookingServices[0]?.modes[0] || "clinic");
  const [start, setStart] = useState("");
  const [slots, setSlots] = useState<{ start: string; label: string }[]>([]);
  const [slotsReady, setSlotsReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const service = bookingServices.find((item) => item.id === serviceId);
  const mode = service?.modes.includes(preferredMode) ? preferredMode : service?.modes[0] || preferredMode;
  useEffect(() => {
    let active = true;
    readJson<{ slots: { start: string; label: string }[] }>(`availability?date=${date}`)
      .then((data) => {
        if (active) {
          setSlots(data.slots || []);
          setSlotsReady(true);
        }
      })
      .catch(() => {
        if (active) {
          setSlots([]);
          setSlotsReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [date]);
  return (
    <section className="admin-panel admin-pad">
      <h2>Book someone who called or walked in</h2>
      <p>
        This saves a confirmed visit. They still pay cash when they arrive, unless
        the service is complimentary.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setBusy(true);
          void readJson("desk", {
            name: form.get("name"),
            email: form.get("email"),
            phone: form.get("phone"),
            serviceId,
            mode,
            start,
            country: form.get("country"),
            region: form.get("region"),
            couponCode: form.get("couponCode"),
          })
            .then(() => {
              toast({ title: "Visit saved.", detail: "It’s on the calendar." });
              setStart("");
            })
            .catch((reason) =>
              toast({
                title: reason instanceof Error ? reason.message : "Please try again.",
                tone: "alert",
              }),
            )
            .finally(() => setBusy(false));
        }}
      >
        <div className="admin-coupon-fields">
          <label>
            Name
            <input name="name" required maxLength={100} />
          </label>
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Phone
            <input name="phone" required maxLength={32} />
          </label>
          <label>
            Service
            <select
              value={serviceId}
              onChange={(event) => setServiceId(event.target.value)}
            >
              {bookingServices.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Visit
            <select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>
              {(service?.modes || []).map((item) => (
                <option key={item} value={item}>
                  {visitModes[item]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input
              type="date"
              value={date}
              required
              onChange={(event) => { setDate(event.target.value); setStart(""); setSlotsReady(false); }}
            />
          </label>
        </div>
        <p>Open times</p>
        <div className="admin-slot-list">
          {!slotsReady ? (
            <AdminSkeleton kind="table" />
          ) : slots.length ? (
            slots.map((slot) => (
              <button
                key={slot.start}
                type="button"
                aria-pressed={start === slot.start}
                onClick={() => setStart(slot.start)}
              >
                {slot.label}
              </button>
            ))
          ) : (
            <span>No open times on this date.</span>
          )}
        </div>
        <label>
          Country
          <input name="country" defaultValue="United States" maxLength={80} />
        </label>
        <label>
          Region
          <input name="region" maxLength={80} />
        </label>
        <label>
          Coupon <small>(optional)</small>
          <input name="couponCode" maxLength={24} autoComplete="off" />
        </label>
        <button className="admin-btn" disabled={busy || !start}>
          Save visit
        </button>
      </form>
    </section>
  );
}

const leadStatuses = ["new", "contacted", "follow-up", "converted", "lost"];

export function RemarketBoard({ canEdit }: { canEdit: boolean }) {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [filter, setFilter] = useState("open");
  const [error, setError] = useState("");
  const load = () =>
    readJson<{ leads: Lead[] }>("remarket")
      .then((data) => setLeads(data.leads))
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Please try again."),
      );
  useEffect(() => {
    void load();
  }, []);
  const shown = (leads || []).filter((lead) =>
    filter === "all"
      ? true
      : filter === "open"
        ? lead.status !== "converted" && lead.status !== "lost"
        : lead.status === filter,
  );
  return (
    <>
      <div className="admin-panel-heading">
        <div>
          <p className="admin-intro">
            People who asked about care and have not booked yet. Move them from
            new, to contacted, to a visit, or mark them lost.
          </p>
        </div>
        <ExportControl module="remarket" />
      </div>
      {canEdit && (
        <section className="admin-panel admin-pad">
          <h2>Add a lead</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const data = new FormData(form);
              void readJson("remarket", {
                action: "create",
                name: data.get("name"),
                email: data.get("email"),
                phone: data.get("phone"),
                interest: data.get("interest"),
                note: data.get("note"),
                source: data.get("source"),
              })
                .then(() => {
                  form.reset();
                  toast({ title: "Lead saved." });
                  return load();
                })
                .catch((reason) =>
                  toast({
                    title: reason instanceof Error ? reason.message : "Please try again.",
                    tone: "alert",
                  }),
                );
            }}
          >
            <div className="admin-coupon-fields">
              <label>
                Name
                <input name="name" required maxLength={100} />
              </label>
              <label>
                Email
                <input name="email" type="email" />
              </label>
              <label>
                Phone
                <input name="phone" maxLength={32} />
              </label>
              <label>
                Interested in
                <input name="interest" required maxLength={120} />
              </label>
              <label>
                Source
                <select name="source" defaultValue="phone">
                  <option value="phone">Phone</option>
                  <option value="walk-in">Walk-in</option>
                  <option value="website">Website</option>
                </select>
              </label>
              <label className="admin-field-span">
                Note
                <input name="note" maxLength={500} />
              </label>
            </div>
            <button className="admin-btn">Save lead</button>
          </form>
        </section>
      )}
      <div className="admin-range">
        {["open", "new", "contacted", "follow-up", "converted", "lost", "all"].map(
          (status) => (
            <button
              key={status}
              type="button"
              aria-pressed={filter === status}
              onClick={() => setFilter(status)}
            >
              {status}
            </button>
          ),
        )}
      </div>
      {error && (
        <p className="admin-alert" role="alert">
          {error}
        </p>
      )}
      <section className="admin-panel">
        {leads === null && !error ? (
          <AdminSkeleton kind="table" />
        ) : leads && shown.length ? (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Interest</th>
                  <th>Source</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((lead) => (
                  <tr key={lead._id}>
                    <td>
                      <strong>{lead.name}</strong>
                      <small>
                        {lead.email || "No email"} · {lead.phone || "No phone"}
                      </small>
                    </td>
                    <td>
                      {lead.interest}
                      {lead.note && <small>{lead.note}</small>}
                    </td>
                    <td>{lead.source}</td>
                    <td>
                      {canEdit ? (
                        <select
                          value={lead.status}
                          onChange={(event) => {
                            const status = event.target.value;
                            void readJson("remarket", {
                              action: "status",
                              id: lead._id,
                              status,
                            })
                              .then(() => {
                                toast({ title: "Lead updated." });
                                return load();
                              })
                              .catch((reason) =>
                                toast({
                                  title: reason instanceof Error ? reason.message : "Please try again.",
                                  tone: "alert",
                                }),
                              );
                          }}
                        >
                          {leadStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      ) : (
                        lead.status
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-intro">No leads in this view.</p>
        )}
      </section>
    </>
  );
}

export function SecurityPanel({ canEdit }: { canEdit: boolean }) {
  const [hours, setHours] = useState(8);
  const [twoFactor, setTwoFactor] = useState(false);
  const [mailReady, setMailReady] = useState(false);
  const [sessions, setSessions] = useState(0);
  useEffect(() => {
    void readJson<{
      security: {
        sessionHours: number;
        twoFactor: boolean;
        emailReady: boolean;
        activeSessions: number;
      };
    }>("settings").then((data) => {
      setHours(data.security.sessionHours);
      setTwoFactor(data.security.twoFactor);
      setMailReady(data.security.emailReady);
      setSessions(data.security.activeSessions);
    });
  }, []);
  return (
    <section className="admin-panel admin-pad">
      <h2>Security</h2>
      <p>
        Staff sign in with an invitation, not a public account. A session ends
        on its own after the length you set. Password changes already sign every
        session out.
      </p>
      <p>{sessions} active session{sessions === 1 ? "" : "s"} on this account.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void readJson<{ sessionHours: number; twoFactor: boolean }>("security", {
            action: "timeout",
            hours,
            twoFactor,
          })
            .then((data) =>
              toast({
                title: "Security saved.",
                detail: data.twoFactor
                  ? `New sign-ins last ${data.sessionHours} hours and ask for a code.`
                  : `New sign-ins last ${data.sessionHours} hours.`,
              }),
            )
            .catch((reason) =>
              toast({
                title: reason instanceof Error ? reason.message : "Please try again.",
                tone: "alert",
              }),
            );
        }}
      >
        <label className="admin-check">
          <input
            type="checkbox"
            checked={twoFactor}
            disabled={!canEdit}
            onChange={(event) => setTwoFactor(event.target.checked)}
          />
          Require a sign-in code after the password
        </label>
        <p>
          {mailReady
            ? "The code is emailed and expires in 10 minutes."
            : "The checkbox is saved now. Codes are emailed once clinic mail is connected."}
        </p>
        <label>
          Session length in hours
          <input
            type="number"
            min={1}
            max={72}
            value={hours}
            disabled={!canEdit}
            onChange={(event) => setHours(Number(event.target.value))}
          />
        </label>
        <div className="admin-security-actions">
          <button className="admin-btn" disabled={!canEdit}>
            Save security
          </button>
          <button
            className="admin-btn admin-btn-secondary"
            type="button"
            disabled={!canEdit}
            onClick={() => {
              void readJson("security", { action: "revoke" })
                .then(() => toast({ title: "Other sessions were signed out." }))
                .catch((reason) =>
                  toast({
                    title: reason instanceof Error ? reason.message : "Please try again.",
                    tone: "alert",
                  }),
                );
            }}
          >
            Sign out other sessions
          </button>
        </div>
      </form>
    </section>
  );
}
