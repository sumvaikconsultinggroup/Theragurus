"use client";

import { useEffect, useState } from "react";
import { AdminSkeleton } from "./AdminSkeleton";

type PageHit = { path: string; title: string; at: string };
type Visitor = {
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
  lastSeen: string;
  online: boolean;
};

export function LiveBoard() {
  const [online, setOnline] = useState<Visitor[] | null>(null);
  const [recent, setRecent] = useState<Visitor[]>([]);
  const [updated, setUpdated] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/admin/live", { cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Live status is unavailable.");
        if (!active) return;
        setOnline(body.online || []);
        setRecent(body.recent || []);
        setUpdated(body.updatedAt || "");
        setError("");
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Please try again.");
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 4000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  if (!online) return <AdminSkeleton error={error} kind="table" />;

  return (
    <>
      <p className="admin-intro">
        People on the public site right now. This refreshes every few seconds. Addresses show the connection seen by the server.
      </p>
      {error && <p className="admin-alert" role="alert">{error}</p>}
      <section className="admin-panel admin-pad">
        <div className="admin-panel-heading">
          <div>
            <h2>{online.length} on the site</h2>
            <p>{updated ? `Updated ${new Date(updated).toLocaleTimeString()}` : "Waiting for the first visit."}</p>
          </div>
        </div>
        {online.length ? (
          <div className="admin-live-list">
            {online.map((visitor) => (
              <VisitorCard key={visitor.id} visitor={visitor} open={open === visitor.id} onOpen={() => setOpen(open === visitor.id ? "" : visitor.id)} />
            ))}
          </div>
        ) : (
          <p className="admin-live-empty">No one is browsing right now. Open the public site in another tab and they will appear here.</p>
        )}
      </section>
      <section className="admin-panel admin-pad">
        <h2>Left in the last 15 minutes</h2>
        {recent.length ? (
          <div className="admin-live-list">
            {recent.map((visitor) => (
              <VisitorCard key={visitor.id} visitor={visitor} open={open === visitor.id} onOpen={() => setOpen(open === visitor.id ? "" : visitor.id)} />
            ))}
          </div>
        ) : (
          <p className="admin-live-empty">No recent visits beyond the people still here.</p>
        )}
      </section>
    </>
  );
}

function VisitorCard({
  visitor,
  open,
  onOpen,
}: {
  visitor: Visitor;
  open: boolean;
  onOpen: () => void;
}) {
  return (
    <article className={`admin-live-card${visitor.online ? " is-online" : ""}`}>
      <header>
        <div>
          <strong>{visitor.name}</strong>
          <span>{visitor.signedIn ? "Signed in" : "Guest"}</span>
        </div>
        <span className="admin-live-ip">{visitor.ip}</span>
      </header>
      <p className="admin-live-path">{visitor.path}</p>
      <p>{visitor.title}</p>
      <dl>
        <div><dt>On this page</dt><dd>{visitor.onPageFor}</dd></div>
        <div><dt>On the site</dt><dd>{visitor.onSiteFor}</dd></div>
        <div><dt>Device</dt><dd>{visitor.device}</dd></div>
        <div><dt>Screen</dt><dd>{visitor.width ? `${visitor.width}px wide` : "Unknown"}</dd></div>
        <div><dt>Language</dt><dd>{visitor.language || "Unknown"}</dd></div>
        {visitor.email && <div><dt>Email</dt><dd>{visitor.email}</dd></div>}
        {visitor.referrer && <div><dt>Arrived from</dt><dd>{visitor.referrer}</dd></div>}
      </dl>
      <button type="button" className="admin-text-button" aria-expanded={open} onClick={onOpen}>
        {open ? "Hide pages" : `Pages this visit (${visitor.pages.length})`}
      </button>
      {open && (
        <ol className="admin-live-pages">
          {visitor.pages.map((page, index) => (
            <li key={`${page.at}-${index}`}>
              <span>{page.path}</span>
              <small>{new Date(page.at).toLocaleTimeString()}</small>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
