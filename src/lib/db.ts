import type {
  AuditReport,
  CheckoutPayload,
  ClientOrder,
  Lead,
  ServiceItem,
} from "@/lib/types";
import { SERVICE_MAP } from "@/data/services";

/**
 * Demo persistence layer.
 *
 * When Supabase env vars are present, `demoEnabled` is false and callers
 * should talk to Supabase directly (see src/lib/supabase). In demo mode the
 * app stores records in browser localStorage keyed by a session id, so the
 * full funnel (audit -> order -> dashboard) works end-to-end without any
 * external services.
 */

const SESSION_KEY = "biz-reborn-demo-session";
export const AUDITS_KEY = "biz-reborn-demo-audits";
export const ORDERS_KEY = "biz-reborn-demo-orders";
export const LEADS_KEY = "biz-reborn-demo-leads";

export const demoEnabled = () =>
  !(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

export function getSessionId() {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `demo_${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function readDemo<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}

export function writeDemo<T>(key: string, rows: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(rows));
}

export function saveAudit(report: AuditReport) {
  const rows = readDemo<AuditReport>(AUDITS_KEY);
  rows.unshift(report);
  writeDemo(AUDITS_KEY, rows.slice(0, 50));
}

export function getAudits() {
  return readDemo<AuditReport>(AUDITS_KEY);
}

export function getAudit(id: string) {
  return getAudits().find((a) => a.id === id);
}

export function saveOrder(payload: CheckoutPayload) {
  const order = buildOrder(payload);
  const rows = readDemo<ClientOrder>(ORDERS_KEY);
  rows.unshift(order);
  writeDemo(ORDERS_KEY, rows);
  return order;
}

export function getOrders() {
  return readDemo<ClientOrder>(ORDERS_KEY);
}

export function saveLead(lead: Omit<Lead, "id" | "createdAt">) {
  const row: Lead = {
    ...lead,
    id: `L-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
  };
  const rows = readDemo<Lead>(LEADS_KEY);
  rows.unshift(row);
  writeDemo(LEADS_KEY, rows.slice(0, 200));
  return row;
}

export function getLeads() {
  return readDemo<Lead>(LEADS_KEY);
}

export function buildOrder(payload: CheckoutPayload): ClientOrder {
  const services = payload.services
    .map((id) => SERVICE_MAP[id])
    .filter(Boolean) as ServiceItem[];
  const oneTime = services.reduce((s, x) => s + x.oneTime, 0);
  const monthly = services.reduce((s, x) => s + x.monthly, 0);
  const leadsPerMonth = Math.round((10 + monthly / 25) * (1 + payload.leadIncrease / 100));
  const projectedMonthly = Math.round(leadsPerMonth * (payload.acv || 500) * 0.35);

  return {
    id: `BR-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    businessName: payload.businessName,
    email: payload.email,
    vertical: payload.vertical,
    services,
    counts: { services: services.length, oneTime, monthly },
    projection: {
      leadIncreasePct: payload.leadIncrease,
      leadsPerMonth,
      acv: payload.acv,
      projectedMonthly,
      roas: monthly > 0 ? Math.round(projectedMonthly / monthly) : 0,
    },
    status: "active",
    fulfillment: services.map((s) => ({
      serviceId: s.id,
      title: s.title,
      status: "queued",
      progress: 0,
    })),
  };
}
