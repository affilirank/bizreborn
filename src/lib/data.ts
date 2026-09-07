import { createClient } from "@/lib/supabase/client";
import type { AuditInput } from "@/lib/audit";
import {
  demoEnabled,
  getAudit as demoGetAudit,
  getAudits as demoGetAudits,
  getLeads as demoGetLeads,
  getOrders as demoGetOrders,
  saveAudit as demoSaveAudit,
  saveLead as demoSaveLead,
  saveOrder as demoSaveOrder,
} from "@/lib/db";
import { BUSINESS_VERTICALS, SERVICE_MAP } from "@/data/services";
import type {
  AuditReport,
  CheckoutPayload,
  ClientOrder,
  Lead,
  MonthlyReport,
  Offer,
  ServiceItem,
  VerticalId,
  WorkLog,
} from "@/lib/types";

/**
 * Unified data access layer.
 *
 * Every function branches on `demoEnabled()`: in demo mode it delegates to the
 * localStorage layer in `@/lib/db`; in live mode it talks to Supabase through
 * the anon/RLS client (own rows for clients, all rows for admins).
 */

export interface AppUser {
  id: string;
  email: string | null;
}

export interface AdminTask {
  id: string;
  service: string;
  client: string;
  assignee: string | null;
  due: string;
  priority: "high" | "medium" | "low";
  status: string;
  estimatedHours: number;
  completedAt: string | null;
}

export interface AssetItem {
  id: string;
  name: string;
  size: string;
  kind: "image" | "video" | "doc";
  uploadedAt: string;
}

export async function currentUser(): Promise<AppUser | null> {
  if (demoEnabled()) {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("biz-reborn-demo-user");
      if (!raw) return null;
      const u = JSON.parse(raw) as { uid?: string; email?: string };
      return { id: u.uid ?? "demo", email: u.email ?? null };
    } catch {
      return null;
    }
  }

  const supabase = createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { id: user.id, email: user.email ?? null } : null;
}

export async function isAdmin(): Promise<boolean> {
  if (demoEnabled()) return true;
  const supabase = createClient();
  if (!supabase) return false;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return data?.role === "admin";
}

// ---------- Audits ----------

export async function listAudits(): Promise<AuditReport[]> {
  if (demoEnabled()) return demoGetAudits();

  const supabase = createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("audits")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []).map(auditFromRow);
}

export async function getAudit(id: string): Promise<AuditReport | null> {
  if (demoEnabled()) return demoGetAudit(id) ?? null;

  const supabase = createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("audits")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ? auditFromRow(data) : null;
}

export async function createAudit(
  report: AuditReport,
  meta?: {
    contact?: AuditReport["contact"];
    form?: AuditInput;
  },
): Promise<void> {
  if (demoEnabled()) {
    demoSaveAudit({
      ...report,
      contact: meta?.contact,
      formData: meta?.form as unknown as Record<string, unknown> | undefined,
    });
    return;
  }

  const supabase = createClient();
  if (!supabase) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from("audits").insert({
    user_id: user?.id ?? null,
    url: report.url,
    business_name: report.businessName,
    gbp: report.gbp,
    instagram: report.socials.instagram,
    facebook: report.socials.facebook,
    tiktok: report.socials.tiktok,
    health_score: report.healthScore,
    grade: report.grade,
    breakdowns: report.breakdowns,
    pain_points: report.painPoints,
    fixes: report.fixes,
    compared_to: report.comparedTo,
    keyword_searches: report.keywordSearches,
    contact: meta?.contact ?? null,
    form_data: (meta?.form as unknown as Record<string, unknown> | null) ?? null,
  });
}

// ---------- Orders ----------

export async function listOrders(): Promise<ClientOrder[]> {
  if (demoEnabled()) return demoGetOrders();

  const supabase = createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  const rows = data ?? [];
  const orders = rows.map((r) => orderFromRow(r));

  if (orders.length > 0) {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .in(
        "order_id",
        orders.map((o) => o.id),
      );
    for (const order of orders) {
      order.fulfillment = (tasks ?? [])
        .filter((t) => t.order_id === order.id)
        .map((t) => ({
          serviceId: t.service_id,
          title: t.service_title,
          status: t.status,
          progress: t.progress,
        }));
    }
  }

  return orders;
}

export async function createOrder(payload: CheckoutPayload): Promise<ClientOrder> {
  if (demoEnabled()) return demoSaveOrder(payload);

  const supabase = createClient();
  if (!supabase) throw new Error("Storage is not configured.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Please sign in to place an order in live mode.");
  }

  const services = payload.services
    .map((id) => SERVICE_MAP[id])
    .filter(Boolean) as ServiceItem[];
  const oneTime = services.reduce((s, x) => s + x.oneTime, 0);
  const monthly = services.reduce((s, x) => s + x.monthly, 0);
  const leadsPerMonth = Math.round(
    (10 + monthly / 25) * (1 + payload.leadIncrease / 100),
  );
  const projectedMonthly = Math.round(leadsPerMonth * (payload.acv || 500) * 0.35);
  const projection = {
    leadIncreasePct: payload.leadIncrease,
    leadsPerMonth,
    acv: payload.acv,
    projectedMonthly,
    roas: monthly > 0 ? Math.round(projectedMonthly / monthly) : 0,
  };

  const { data, error } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      business_name: payload.businessName,
      email: payload.email,
      phone: payload.phone ?? null,
      vertical: payload.vertical,
      service_ids: payload.services,
      one_time_total: oneTime,
      monthly_total: monthly,
      tier: null,
      status: "active",
      projection,
    })
    .select()
    .single();
  if (error || !data) throw new Error("Could not save your order.");

  await supabase.from("tasks").insert(
    services.map((s) => ({
      order_id: data.id,
      service_id: s.id,
      service_title: s.title,
      status: "queued",
      progress: 0,
    })),
  );

  return orderFromRow(data, services);
}

// ---------- Leads ----------

export async function createLead(
  lead: Omit<Lead, "id" | "createdAt">,
): Promise<Lead> {
  if (demoEnabled()) return demoSaveLead(lead);

  const supabase = createClient();
  if (!supabase) throw new Error("Storage is not configured.");
  const { data, error } = await supabase
    .from("leads")
    .insert({
      name: lead.name,
      business_name: lead.businessName,
      phone: lead.phone,
      email: lead.email,
      source: lead.source,
      message: lead.message ?? null,
      vertical: lead.vertical ?? null,
    })
    .select()
    .single();
  if (error || !data) throw new Error("Could not save your lead.");

  return {
    id: data.id,
    createdAt: data.created_at,
    name: data.name,
    businessName: data.business_name,
    phone: data.phone ?? "",
    email: data.email,
    source: data.source,
    message: data.message ?? undefined,
    vertical: data.vertical ?? undefined,
  };
}

export async function listLeads(): Promise<Lead[]> {
  if (demoEnabled()) return demoGetLeads();

  const supabase = createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    name: r.name,
    businessName: r.business_name,
    phone: r.phone ?? "",
    email: r.email,
    source: r.source,
    message: r.message ?? undefined,
    vertical: r.vertical ?? undefined,
  }));
}

// ---------- Fulfillment tasks ----------

export async function listTasks(): Promise<AdminTask[]> {
  if (demoEnabled()) return [];

  const supabase = createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("tasks")
    .select("*, orders(business_name)")
    .order("created_at", { ascending: true })
    .limit(100);
  return (data ?? []).map((t: Record<string, unknown>) => ({
    id: String(t.id),
    service: String(t.service_title),
    client:
      (String(t.client_name ?? "") ||
        (t.orders as { business_name?: string } | null)?.business_name) ??
      "",
    assignee: (t.assignee as string | null) ?? null,
    due: (t.due_date as string | null)
      ? new Date(t.due_date as string).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "No due date",
    priority: (t.priority ?? "medium") as AdminTask["priority"],
    status: String(t.status ?? "queued"),
    estimatedHours: Number(t.estimated_hours ?? 0),
    completedAt: (t.completed_at as string | null) ?? null,
  }));
}

export async function createTask(input: {
  client: string;
  service: string;
  due?: string;
  priority: AdminTask["priority"];
  estimatedHours?: number;
}): Promise<AdminTask | null> {
  if (demoEnabled()) return null;

  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      order_id: null,
      service_id: 0,
      service_title: input.service,
      client_name: input.client || null,
      assignee: null,
      status: "queued",
      progress: 0,
      priority: input.priority,
      due_date: input.due || null,
      estimated_hours: input.estimatedHours ?? 0,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return {
    id: String(data.id),
    service: String(data.service_title),
    client: input.client,
    assignee: null,
    due: input.due
      ? new Date(input.due).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "No due date",
    priority: (data.priority ?? "medium") as AdminTask["priority"],
    status: String(data.status ?? "queued"),
    estimatedHours: Number(data.estimated_hours ?? input.estimatedHours ?? 0),
    completedAt: (data.completed_at as string | null) ?? null,
  };
}

export async function deleteTask(id: string): Promise<void> {
  if (demoEnabled()) return;
  const supabase = createClient();
  if (!supabase) return;
  await supabase.from("tasks").delete().eq("id", id);
}

export async function updateTask(
  id: string,
  patch: {
    assignee?: string | null;
    status?: string;
    estimatedHours?: number;
    completedAt?: string | null;
  },
): Promise<void> {
  if (demoEnabled()) return;

  const supabase = createClient();
  if (!supabase) return;
  const row: Record<string, unknown> = {};
  if (patch.assignee !== undefined) row.assignee = patch.assignee;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.estimatedHours !== undefined)
    row.estimated_hours = patch.estimatedHours;
  if (patch.completedAt !== undefined) row.completed_at = patch.completedAt;
  if (Object.keys(row).length === 0) return;
  await supabase.from("tasks").update(row).eq("id", id);
}

/**
 * Checks a task off: marks it completed with today's timestamp and records the
 * day + estimated hours in the work log.
 */
export async function markTaskDone(id: string, hours: number): Promise<void> {
  if (demoEnabled()) return;
  const supabase = createClient();
  if (!supabase) return;
  const { data: task } = await supabase
    .from("tasks")
    .select("client_name, service_title")
    .eq("id", id)
    .maybeSingle();
  const completedAt = new Date().toISOString();
  await supabase
    .from("tasks")
    .update({
      status: "completed",
      completed_at: completedAt,
      estimated_hours: hours,
    })
    .eq("id", id);
  if (task) {
    await supabase.from("work_logs").insert({
      task_id: id,
      client_name: task.client_name ?? "",
      service: task.service_title ?? "",
      work_date: new Date().toISOString().slice(0, 10),
      hours,
    });
  }
}

// ---------- Stripe subscriptions ----------

export interface AdminSubscription {
  id: string;
  tier: string | null;
  amount: number;
  status: string;
  currentPeriodEnd: string | null;
  businessName: string;
  email: string;
}

export async function listSubscriptions(): Promise<AdminSubscription[]> {
  if (demoEnabled()) return [];

  const supabase = createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .order("current_period_end", { ascending: false })
    .limit(50);
  const rows = (data ?? []) as {
    id: string;
    user_id: string | null;
    tier: string | null;
    amount: number;
    status: string;
    current_period_end: string | null;
    email: string | null;
  }[];

  const userIds = Array.from(
    new Set(rows.map((r) => r.user_id).filter((v): v is string => Boolean(v))),
  );
  const names: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, business_name, full_name")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      names[p.id] = p.business_name || p.full_name || "";
    }
  }

  return rows.map((r) => ({
    id: r.id,
    tier: r.tier,
    amount: r.amount,
    status: r.status,
    currentPeriodEnd: r.current_period_end,
    businessName: (r.user_id && names[r.user_id]) || "",
    email: r.email ?? "",
  }));
}

// ---------- Offers (custom-priced proposals) ----------

export async function listOffers(): Promise<Offer[]> {
  if (demoEnabled()) return demoGetOffers();

  const supabase = createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("offers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []).map(offerFromRow);
}

export async function createOffer(input: {
  clientName: string;
  clientEmail: string;
  services: number[];
  offerPrice: number;
  notes: string;
}): Promise<Offer> {
  if (demoEnabled()) return demoSaveOffer(input);

  const res = await fetch("/api/offers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.offer) {
    throw new Error(json?.error ?? "Could not create the offer.");
  }
  return json.offer as Offer;
}

export async function updateOfferStatus(
  id: string,
  status: Offer["status"],
): Promise<void> {
  if (demoEnabled()) {
    demoPatchOffer(id, { status });
    return;
  }
  const supabase = createClient();
  if (!supabase) return;
  await supabase.from("offers").update({ status }).eq("id", id);
}

export async function deleteOffer(id: string): Promise<void> {
  if (demoEnabled()) {
    demoDeleteOffer(id);
    return;
  }
  const supabase = createClient();
  if (!supabase) return;
  await supabase.from("offers").delete().eq("id", id);
}

// ---------- Monthly reports (manager-written, shareable) ----------

export async function listReports(): Promise<MonthlyReport[]> {
  if (demoEnabled()) return demoGetReports();

  const supabase = createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []).map(reportFromRow);
}

export async function createReport(input: {
  clientName: string;
  clientEmail: string;
  month: string;
  headline: string;
  highlights: string[];
  metrics: MonthlyReport["metrics"];
  deliverables: string[];
  nextSteps: string[];
}): Promise<MonthlyReport> {
  if (demoEnabled()) return demoSaveReport(input);

  const supabase = createClient();
  if (!supabase) throw new Error("Storage is not configured.");
  const { data, error } = await supabase
    .from("reports")
    .insert({
      client_name: input.clientName,
      client_email: input.clientEmail || null,
      month: input.month || null,
      headline: input.headline || null,
      highlights: input.highlights,
      metrics: input.metrics,
      deliverables: input.deliverables,
      next_steps: input.nextSteps,
      status: "draft",
    })
    .select("*")
    .single();
  if (error || !data) throw new Error("Could not save the report.");
  return reportFromRow(data);
}

export async function updateReport(
  id: string,
  patch: Partial<
    Pick<
      MonthlyReport,
      | "clientName"
      | "clientEmail"
      | "month"
      | "headline"
      | "highlights"
      | "metrics"
      | "deliverables"
      | "nextSteps"
      | "status"
    >
  >,
): Promise<MonthlyReport | null> {
  if (demoEnabled()) {
    return demoPatchReport(id, patch);
  }

  const supabase = createClient();
  if (!supabase) return null;
  const row: Record<string, unknown> = {};
  if (patch.clientName !== undefined) row.client_name = patch.clientName;
  if (patch.clientEmail !== undefined) row.client_email = patch.clientEmail;
  if (patch.month !== undefined) row.month = patch.month;
  if (patch.headline !== undefined) row.headline = patch.headline;
  if (patch.highlights !== undefined) row.highlights = patch.highlights;
  if (patch.metrics !== undefined) row.metrics = patch.metrics;
  if (patch.deliverables !== undefined) row.deliverables = patch.deliverables;
  if (patch.nextSteps !== undefined) row.next_steps = patch.nextSteps;
  if (patch.status !== undefined) row.status = patch.status;
  if (Object.keys(row).length === 0) return null;
  const { data } = await supabase
    .from("reports")
    .update(row)
    .eq("id", id)
    .select("*")
    .single();
  return data ? reportFromRow(data) : null;
}

export async function deleteReport(id: string): Promise<void> {
  if (demoEnabled()) {
    demoDeleteReport(id);
    return;
  }
  const supabase = createClient();
  if (!supabase) return;
  await supabase.from("reports").delete().eq("id", id);
}

// ---------- Work log (day + hours per task) ----------

export async function listWorkLogs(): Promise<WorkLog[]> {
  if (demoEnabled()) return demoGetWorkLogs();

  const supabase = createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("work_logs")
    .select("*")
    .order("work_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300);
  return (data ?? []).map((r) => ({
    id: String(r.id),
    taskId: (r.task_id as string | null) ?? null,
    clientName: String(r.client_name ?? ""),
    service: String(r.service ?? ""),
    workDate: String(r.work_date ?? ""),
    hours: Number(r.hours ?? 0),
    notes: (r.notes as string | null) ?? "",
    createdAt: String(r.created_at),
  }));
}

export async function addWorkLog(input: {
  taskId?: string;
  clientName: string;
  service: string;
  workDate: string;
  hours: number;
}): Promise<WorkLog | null> {
  if (demoEnabled()) {
    return demoSaveWorkLog(input);
  }

  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("work_logs")
    .insert({
      task_id: input.taskId ?? null,
      client_name: input.clientName,
      service: input.service,
      work_date: input.workDate,
      hours: input.hours,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return {
    id: String(data.id),
    taskId: (data.task_id as string | null) ?? null,
    clientName: String(data.client_name ?? ""),
    service: String(data.service ?? ""),
    workDate: String(data.work_date ?? ""),
    hours: Number(data.hours ?? 0),
    notes: (data.notes as string | null) ?? "",
    createdAt: String(data.created_at),
  };
}

export async function deleteWorkLog(id: string): Promise<void> {
  if (demoEnabled()) {
    demoDeleteWorkLog(id);
    return;
  }
  const supabase = createClient();
  if (!supabase) return;
  await supabase.from("work_logs").delete().eq("id", id);
}

// ---------- Asset vault ----------

export async function listAssets(): Promise<AssetItem[]> {
  if (demoEnabled()) return demoAssets();

  const supabase = createClient();
  if (!supabase) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("assets")
    .select("*")
    .eq("user_id", user.id)
    .order("uploaded_at", { ascending: false });
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    size: r.size_bytes ? `${(r.size_bytes / 1024).toFixed(0)} KB` : "—",
    kind: r.kind,
    uploadedAt: new Date(r.uploaded_at).toLocaleDateString(),
  }));
}

export async function createAsset(file: File): Promise<void> {
  if (demoEnabled()) {
    demoAddAsset(file);
    return;
  }

  const supabase = createClient();
  if (!supabase) throw new Error("Storage is not configured.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in to upload assets.");

  const kind: AssetItem["kind"] = file.type.startsWith("video")
    ? "video"
    : file.type.startsWith("image")
      ? "image"
      : "doc";
  const path = `${user.id}/${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("assets")
    .upload(path, file, { upsert: true });
  if (uploadError) throw new Error("Upload failed. Please try again.");

  const { error: insertError } = await supabase.from("assets").insert({
    user_id: user.id,
    name: file.name,
    kind,
    size_bytes: file.size,
    storage_path: path,
  });
  if (insertError) {
    await supabase.storage.from("assets").remove([path]);
    throw new Error("Could not save asset metadata.");
  }
}

export async function deleteAsset(id: string): Promise<void> {
  if (demoEnabled()) {
    demoDeleteAsset(id);
    return;
  }

  const supabase = createClient();
  if (!supabase) return;
  const { data: asset } = await supabase
    .from("assets")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (asset?.storage_path) {
    await supabase.storage.from("assets").remove([asset.storage_path]);
  }
  await supabase.from("assets").delete().eq("id", id);
}

// ---------- Row mappers ----------

function auditFromRow(r: Record<string, unknown>): AuditReport {
  return {
    id: String(r.id),
    createdAt: String(r.created_at),
    url: String(r.url),
    businessName: (r.business_name as string | null) ?? "",
    gbp: (r.gbp as string | null) ?? undefined,
    socials: {
      instagram: (r.instagram as string | null) ?? undefined,
      facebook: (r.facebook as string | null) ?? undefined,
      tiktok: (r.tiktok as string | null) ?? undefined,
    },
    healthScore: Number(r.health_score),
    grade: String(r.grade),
    breakdowns: (r.breakdowns as AuditReport["breakdowns"]) ?? [],
    painPoints: (r.pain_points as string[]) ?? [],
    fixes: (r.fixes as string[]) ?? [],
    comparedTo: (r.compared_to as AuditReport["comparedTo"]) ?? [],
    keywordSearches:
      (r.keyword_searches as AuditReport["keywordSearches"]) ?? [],
    contact: (r.contact as AuditReport["contact"]) ?? undefined,
    formData: (r.form_data as Record<string, unknown>) ?? undefined,
  };
}

function orderFromRow(
  r: Record<string, unknown>,
  services?: ServiceItem[],
): ClientOrder {
  const svcs =
    services ??
    (((r.service_ids as number[] | null) ?? [])
      .map((id) => SERVICE_MAP[id])
      .filter(Boolean) as ServiceItem[]);
  const oneTime = svcs.reduce((s, x) => s + x.oneTime, 0);
  const monthly = svcs.reduce((s, x) => s + x.monthly, 0);
  const projection = (r.projection as ClientOrder["projection"]) ?? {
    leadIncreasePct: 0,
    leadsPerMonth: 0,
    acv: 0,
    projectedMonthly: 0,
    roas: 0,
  };
  const vertical =
    BUSINESS_VERTICALS.some((v) => v.id === r.vertical)
      ? (r.vertical as VerticalId)
      : "professional";

  return {
    id: String(r.id),
    createdAt: String(r.created_at),
    businessName: String(r.business_name),
    email: String(r.email),
    vertical,
    services: svcs,
    counts: {
      services: svcs.length,
      oneTime: Number(r.one_time_total ?? oneTime),
      monthly: Number(r.monthly_total ?? monthly),
    },
    projection,
    status: (r.status as ClientOrder["status"]) ?? "active",
    fulfillment: [],
  };
}

// ---------- Demo asset storage (localStorage) ----------

const ASSETS_KEY = "biz-reborn-demo-assets";

function demoAssets(): AssetItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(ASSETS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function demoAddAsset(file: File) {
  if (typeof window === "undefined") return;
  const kind: AssetItem["kind"] = file.type.startsWith("video")
    ? "video"
    : file.type.startsWith("image")
      ? "image"
      : "doc";
  const asset: AssetItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: file.name,
    size: (file.size / 1024).toFixed(0) + " KB",
    kind,
    uploadedAt: new Date().toLocaleDateString(),
  };
  localStorage.setItem(
    ASSETS_KEY,
    JSON.stringify([asset, ...demoAssets()]),
  );
}

function demoDeleteAsset(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    ASSETS_KEY,
    JSON.stringify(demoAssets().filter((a) => a.id !== id)),
  );
}

// ---------- Row mappers (offers & reports) ----------

function offerFromRow(r: Record<string, unknown>): Offer {
  return {
    id: String(r.id),
    token: String(r.token),
    clientName: String(r.client_name),
    clientEmail: (r.client_email as string | null) ?? "",
    services: (r.services as number[]) ?? [],
    serviceTitles: (r.service_titles as string[]) ?? [],
    listPrice: Number(r.list_price ?? 0),
    offerPrice: Number(r.offer_price ?? 0),
    discountPct: Number(r.discount_pct ?? 0),
    status: (r.status ?? "draft") as Offer["status"],
    stripePaymentLink: (r.stripe_payment_link as string | null) ?? null,
    notes: (r.notes as string | null) ?? "",
    paidAt: (r.paid_at as string | null) ?? null,
    createdAt: String(r.created_at),
  };
}

function reportFromRow(r: Record<string, unknown>): MonthlyReport {
  return {
    id: String(r.id),
    token: String(r.token),
    clientName: String(r.client_name),
    clientEmail: (r.client_email as string | null) ?? "",
    month: (r.month as string | null) ?? "",
    headline: (r.headline as string | null) ?? "",
    highlights: (r.highlights as string[]) ?? [],
    metrics: (r.metrics as MonthlyReport["metrics"]) ?? [],
    deliverables: (r.deliverables as string[]) ?? [],
    nextSteps: (r.next_steps as string[]) ?? [],
    status: (r.status ?? "draft") as MonthlyReport["status"],
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

// ---------- Demo offers/reports/work-log storage (localStorage) ----------

const OFFERS_KEY = "biz-reborn-demo-offers";
const REPORTS_KEY = "biz-reborn-demo-reports";
const WORKLOG_KEY = "biz-reborn-demo-worklog";

function readDemoList<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]");
  } catch {
    return [];
  }
}

function writeDemoList<T>(key: string, items: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(items));
}

function demoGetOffers(): Offer[] {
  return readDemoList<Offer>(OFFERS_KEY);
}

function demoSaveOffer(input: {
  clientName: string;
  clientEmail: string;
  services: number[];
  offerPrice: number;
  notes: string;
}): Offer {
  const items = demoGetOffers();
  const listPrice = input.services.reduce(
    (s, id) => s + (SERVICE_MAP[id]?.oneTime ?? 0) + (SERVICE_MAP[id]?.monthly ?? 0),
    0,
  );
  const offer: Offer = {
    id: `O-${Date.now()}`,
    token: `demo-${Date.now()}`,
    clientName: input.clientName,
    clientEmail: input.clientEmail,
    services: input.services,
    serviceTitles: input.services
      .map((id) => SERVICE_MAP[id]?.title)
      .filter(Boolean),
    listPrice,
    offerPrice: input.offerPrice,
    discountPct:
      listPrice > input.offerPrice
        ? Math.round(((listPrice - input.offerPrice) / listPrice) * 100)
        : 0,
    status: "sent",
    stripePaymentLink: null,
    notes: input.notes,
    paidAt: null,
    createdAt: new Date().toISOString(),
  };
  writeDemoList(OFFERS_KEY, [offer, ...items]);
  return offer;
}

function demoPatchOffer(id: string, patch: Partial<Offer>) {
  writeDemoList(
    OFFERS_KEY,
    demoGetOffers().map((o) => (o.id === id ? { ...o, ...patch } : o)),
  );
}

function demoDeleteOffer(id: string) {
  writeDemoList(
    OFFERS_KEY,
    demoGetOffers().filter((o) => o.id !== id),
  );
}

function demoGetReports(): MonthlyReport[] {
  return readDemoList<MonthlyReport>(REPORTS_KEY);
}

function demoSaveReport(input: {
  clientName: string;
  clientEmail: string;
  month: string;
  headline: string;
  highlights: string[];
  metrics: MonthlyReport["metrics"];
  deliverables: string[];
  nextSteps: string[];
}): MonthlyReport {
  const items = demoGetReports();
  const now = new Date().toISOString();
  const report: MonthlyReport = {
    id: `R-${Date.now()}`,
    token: `demo-${Date.now()}`,
    clientName: input.clientName,
    clientEmail: input.clientEmail,
    month: input.month,
    headline: input.headline,
    highlights: input.highlights,
    metrics: input.metrics,
    deliverables: input.deliverables,
    nextSteps: input.nextSteps,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
  writeDemoList(REPORTS_KEY, [report, ...items]);
  return report;
}

function demoPatchReport(
  id: string,
  patch: Partial<MonthlyReport>,
): MonthlyReport | null {
  let updated: MonthlyReport | null = null;
  writeDemoList(
    REPORTS_KEY,
    demoGetReports().map((r) => {
      if (r.id !== id) return r;
      updated = { ...r, ...patch, updatedAt: new Date().toISOString() };
      return updated;
    }),
  );
  return updated;
}

function demoDeleteReport(id: string) {
  writeDemoList(
    REPORTS_KEY,
    demoGetReports().filter((r) => r.id !== id),
  );
}

function demoGetWorkLogs(): WorkLog[] {
  return readDemoList<WorkLog>(WORKLOG_KEY);
}

function demoSaveWorkLog(input: {
  taskId?: string;
  clientName: string;
  service: string;
  workDate: string;
  hours: number;
}): WorkLog | null {
  const items = demoGetWorkLogs();
  const log: WorkLog = {
    id: `W-${Date.now()}`,
    taskId: input.taskId ?? null,
    clientName: input.clientName,
    service: input.service,
    workDate: input.workDate,
    hours: input.hours,
    notes: "",
    createdAt: new Date().toISOString(),
  };
  writeDemoList(WORKLOG_KEY, [log, ...items]);
  return log;
}

function demoDeleteWorkLog(id: string) {
  writeDemoList(
    WORKLOG_KEY,
    demoGetWorkLogs().filter((w) => w.id !== id),
  );
}
