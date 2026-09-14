"use client";

import { useEffect, useState } from "react";

/**
 * Analytics and visitor identification, behind one notice.
 *
 * Google Analytics loads with every storage type denied (Consent Mode v2):
 * no cookie, pings carry no identifier, reports are modelled. LeadLens — the
 * visitor-identification pixel shared across the group's sites — sets one
 * first-party cookie and looks up the organisation behind a network address,
 * which in the EU and UK needs prior agreement, so it is never on the page
 * until the reader says yes. Accepting grants analytics storage and appends
 * the pixel; rejecting (or withdrawing later) denies storage, removes the
 * script and expires the cookies it set. Accepting and rejecting are one
 * click each, side by side.
 *
 * Do Not Track and Global Privacy Control are a standing "no": no notice, no
 * tag, no pixel.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GRANTED = "granted";
const DENIED = "denied";
const LL_COOKIE = "_ll_vid";

type Decision = typeof GRANTED | typeof DENIED | null;

export interface ConsentTagProps {
  /** GA4 measurement id (G-…). */
  ga?: string;
  /** The site's row in the LeadLens `sites` table. */
  leadlensSiteId?: string;
  /** Hostnames the pixel may report from; previews and localhost never do. */
  hostnames: string[];
  /** localStorage key the decision is kept under. */
  storageKey: string;
  /** Window event any control may dispatch to reopen the notice. */
  reopenEvent: string;
  /** Link to the privacy page named in the notice. */
  privacyHref?: string;
  /** Where leadlens.js is served from. */
  origin?: string;
}

function readDecision(key: string): Decision {
  try {
    const v = localStorage.getItem(key);
    return v === GRANTED || v === DENIED ? v : null;
  } catch {
    return null;
  }
}

function writeDecision(key: string, d: Exclude<Decision, null>) {
  try {
    localStorage.setItem(key, d);
  } catch {
    /* private mode: the notice simply returns next visit */
  }
}

export function privacySignalSet(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { msDoNotTrack?: string; globalPrivacyControl?: boolean };
  const win = window as Window & { doNotTrack?: string };
  return nav.doNotTrack === "1" || nav.msDoNotTrack === "1" || win.doNotTrack === "1" || nav.globalPrivacyControl === true;
}

function hostAllowed(hostnames: string[]): boolean {
  const host = location.hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1") return false;
  if (host.endsWith(".netlify.app") && host.includes("--")) return false;
  return hostnames.map((h) => h.toLowerCase()).includes(host);
}

function expireCookies(names: RegExp) {
  const host = location.hostname.replace(/\.$/, "");
  const parts = host.split(".");
  const scopes = ["", `; Domain=${host}`, `; Domain=.${host}`];
  if (parts.length > 2) scopes.push(`; Domain=.${parts.slice(-2).join(".")}`);
  for (const name of document.cookie.split("; ").map((c) => c.split("=")[0]).filter((n) => names.test(n))) {
    for (const scope of scopes) document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${scope}`;
  }
}

function loadGa(id: string, granted: boolean) {
  if (document.getElementById("gtag-js")) {
    window.gtag?.("consent", "update", { analytics_storage: granted ? "granted" : "denied" });
    return;
  }
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: granted ? "granted" : "denied",
    wait_for_update: 0,
  });
  window.gtag("js", new Date());
  window.gtag("config", id, { allow_google_signals: false, allow_ad_personalization_signals: false });
  const s = document.createElement("script");
  s.id = "gtag-js";
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
}

function injectPixel(origin: string, siteId: string, hostnames: string[]) {
  if (document.querySelector("script[data-leadlens-site]")) return;
  const s = document.createElement("script");
  s.src = `${origin}/leadlens.js`;
  s.defer = true;
  s.setAttribute("data-leadlens-site", siteId);
  s.setAttribute("data-leadlens-hosts", hostnames.join(","));
  document.body.appendChild(s);
}

function revokePixel() {
  document.querySelector("script[data-leadlens-site]")?.remove();
  expireCookies(new RegExp(`^${LL_COOKIE}$`));
}

const card: React.CSSProperties = {
  position: "fixed",
  right: 16,
  bottom: 16,
  left: 16,
  zIndex: 60,
  maxWidth: 480,
  marginLeft: "auto",
  padding: "20px 22px",
  background: "#ffffff",
  color: "#151515",
  border: "1px solid rgba(0,0,0,0.12)",
  boxShadow: "0 24px 48px -24px rgba(0,0,0,0.35)",
  fontFamily: "inherit",
  fontSize: 14,
  lineHeight: 1.5,
};

const btn: React.CSSProperties = {
  font: "inherit",
  fontSize: 12,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  padding: "10px 18px",
  border: "1px solid #151515",
  background: "transparent",
  color: "#151515",
  cursor: "pointer",
};

export function ConsentTag({
  ga,
  leadlensSiteId,
  hostnames,
  storageKey,
  reopenEvent,
  privacyHref,
  origin = "https://leadlens-app.netlify.app",
}: ConsentTagProps) {
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<Decision>(null);
  const hostKey = hostnames.join(",");

  useEffect(() => {
    if (privacySignalSet()) return;
    const hosts = hostKey.split(",");
    const stored = readDecision(storageKey);
    setDecision(stored);

    if (ga) loadGa(ga, stored === GRANTED);
    if (leadlensSiteId && hostAllowed(hosts) && stored === GRANTED) injectPixel(origin, leadlensSiteId, hosts);

    const reopen = () => setOpen(true);
    window.addEventListener(reopenEvent, reopen);

    let timer: number | undefined;
    if (stored === null && hostAllowed(hosts)) timer = window.setTimeout(() => setOpen(true), 400);
    return () => {
      window.removeEventListener(reopenEvent, reopen);
      if (timer) window.clearTimeout(timer);
    };
  }, [ga, hostKey, leadlensSiteId, origin, reopenEvent, storageKey]);

  if (!open) return null;

  function accept() {
    writeDecision(storageKey, GRANTED);
    setDecision(GRANTED);
    window.gtag?.("consent", "update", { analytics_storage: "granted" });
    if (leadlensSiteId) injectPixel(origin, leadlensSiteId, hostKey.split(","));
    setOpen(false);
  }

  function decline() {
    const wasRunning = decision === GRANTED;
    writeDecision(storageKey, DENIED);
    setDecision(DENIED);
    window.gtag?.("consent", "update", { analytics_storage: "denied" });
    expireCookies(/^_ga/);
    revokePixel();
    setOpen(false);
    if (wasRunning) location.reload();
  }

  return (
    <div role="dialog" aria-labelledby="ct-heading" aria-describedby="ct-body" style={card}>
      <p id="ct-heading" style={{ margin: 0, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.6 }}>
        Cookies, only if you accept
      </p>
      <p id="ct-body" style={{ margin: "10px 0 0" }}>
        With your agreement this site keeps anonymous visit statistics and sets one first-party cookie that recognises the
        organisation behind your network address, so an enquiry from an institution is recognised as one. It identifies no
        individual unless you give your details in a form here. Reject and the site works exactly the same.
        {privacyHref ? (
          <>
            {" "}
            <a href={privacyHref} style={{ color: "inherit" }}>
              How this site records
            </a>
            .
          </>
        ) : null}
      </p>
      {decision ? (
        <p style={{ margin: "10px 0 0", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.6 }}>
          {decision === GRANTED ? "You accepted on this browser. You can withdraw that below." : "You rejected on this browser. Nothing is set."}
        </p>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
        <button type="button" onClick={accept} style={btn}>
          Accept
        </button>
        <button type="button" onClick={decline} style={btn}>
          Reject
        </button>
      </div>
    </div>
  );
}

/** A standing control, for a footer: reopens the notice. Hidden when the browser already refused. */
export function ConsentChoices({ reopenEvent, className = "" }: { reopenEvent: string; className?: string }) {
  const [shown, setShown] = useState(false);
  useEffect(() => setShown(!privacySignalSet()), []);
  if (!shown) return null;
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(reopenEvent))} className={className}>
      Cookie choices
    </button>
  );
}
