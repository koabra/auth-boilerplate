"use client";

type EventPayload = {
  eventType: "page_view" | "click" | "custom" | "heartbeat";
  pageUrl: string;
  elementId?: string;
  elementText?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
};

const queue: EventPayload[] = [];
const SESSION_KEY = "analytics_session_token";

function getSessionToken() {
  let token = localStorage.getItem(SESSION_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, token);
  }
  return token;
}

async function flushEvents() {
  if (!queue.length) return;
  const events = queue.splice(0, queue.length);
  await fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionToken: getSessionToken(),
      events,
    }),
    keepalive: true,
  });
}

function flushEventsWithBeacon() {
  if (!queue.length || typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") return;
  const events = queue.splice(0, queue.length);
  const payload = JSON.stringify({
    sessionToken: getSessionToken(),
    events,
  });
  navigator.sendBeacon("/api/analytics/track", payload);
}

export function trackEvent(payload: EventPayload) {
  queue.push(payload);
}

export function initAnalyticsTracking() {
  let pageStart = Date.now();
  let currentPath = window.location.pathname;

  trackEvent({ eventType: "page_view", pageUrl: currentPath });

  const clickHandler = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    const trackedElement = target?.closest("[data-track]") as HTMLElement | null;
    if (!trackedElement) return;

    trackEvent({
      eventType: "click",
      pageUrl: window.location.pathname,
      elementId: trackedElement.getAttribute("data-track") ?? undefined,
      elementText: trackedElement.textContent?.trim().slice(0, 120),
    });
  };

  document.addEventListener("click", clickHandler);

  const interval = setInterval(() => {
    void flushEvents();
  }, 5000);
  const heartbeat = setInterval(() => {
    trackEvent({
      eventType: "heartbeat",
      pageUrl: window.location.pathname,
      metadata: { kind: "active_heartbeat" },
    });
  }, 30000);

  const visibilityHandler = () => {
    if (document.visibilityState === "hidden") {
      trackEvent({
        eventType: "page_view",
        pageUrl: currentPath,
        durationMs: Date.now() - pageStart,
        metadata: { kind: "time_on_page" },
      });
      flushEventsWithBeacon();
    }
  };

  document.addEventListener("visibilitychange", visibilityHandler);

  const routePoll = setInterval(() => {
    if (window.location.pathname !== currentPath) {
      trackEvent({
        eventType: "page_view",
        pageUrl: currentPath,
        durationMs: Date.now() - pageStart,
        metadata: { kind: "time_on_page" },
      });
      currentPath = window.location.pathname;
      pageStart = Date.now();
      trackEvent({ eventType: "page_view", pageUrl: currentPath });
    }
  }, 400);

  const unloadHandler = () => {
    trackEvent({
      eventType: "page_view",
      pageUrl: currentPath,
      durationMs: Date.now() - pageStart,
      metadata: { kind: "time_on_page" },
    });
    flushEventsWithBeacon();
  };

  window.addEventListener("beforeunload", unloadHandler);

  return () => {
    clearInterval(interval);
    clearInterval(heartbeat);
    clearInterval(routePoll);
    document.removeEventListener("click", clickHandler);
    document.removeEventListener("visibilitychange", visibilityHandler);
    window.removeEventListener("beforeunload", unloadHandler);
  };
}
