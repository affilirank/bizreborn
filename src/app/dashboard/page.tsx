import type { Metadata } from "next";
import { getSupabase } from "@/lib/supabase";
import {
  FileText,
  RefreshCw,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Client Portal — Biz Reborn Marketing",
  description: "Your client dashboard — view orders, subscriptions, and reports.",
};

const statusStyles: Record<string, string> = {
  active: "text-glow-400 border-glow-500/20 bg-glow-500/5",
  pending: "text-amber-400 border-amber-500/20 bg-amber-500/5",
  cancelled: "text-rose-400 border-rose-500/20 bg-rose-500/5",
  completed: "text-brand-400 border-brand-500/20 bg-brand-500/5",
};

const statusIcons: Record<string, any> = {
  active: CheckCircle,
  pending: Clock,
  cancelled: AlertCircle,
  completed: CheckCircle,
};

export default async function DashboardPage() {
  const supabase = getSupabase();

  const { data: orders } = supabase
    ? await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10)
    : { data: [] };

  const { data: subscriptions } = supabase
    ? await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false })
    : { data: [] };

  const { data: reports } = supabase
    ? await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10)
    : { data: [] };

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-950/20 via-ink-950 to-ink-950" />
      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-sora text-2xl font-bold text-white sm:text-3xl">
              Client Portal
            </h1>
            <p className="mt-1 text-sm text-ink-400">
              Manage your services, view reports, and track progress.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-ink-800/60 bg-ink-900/50 p-5">
            <div className="flex items-center gap-2 text-glow-400">
              <CheckCircle size={16} />
              <span className="text-xs font-medium uppercase tracking-wider">
                Active Subscriptions
              </span>
            </div>
            <div className="mt-3 font-sora text-3xl font-bold text-white">
              {subscriptions?.filter((s) => s.status === "active").length || 0}
            </div>
          </div>
          <div className="rounded-xl border border-ink-800/60 bg-ink-900/50 p-5">
            <div className="flex items-center gap-2 text-brand-400">
              <FileText size={16} />
              <span className="text-xs font-medium uppercase tracking-wider">
                Total Orders
              </span>
            </div>
            <div className="mt-3 font-sora text-3xl font-bold text-white">
              {orders?.length || 0}
            </div>
          </div>
          <div className="rounded-xl border border-ink-800/60 bg-ink-900/50 p-5">
            <div className="flex items-center gap-2 text-amber-400">
              <RefreshCw size={16} />
              <span className="text-xs font-medium uppercase tracking-wider">
                Reports Available
              </span>
            </div>
            <div className="mt-3 font-sora text-3xl font-bold text-white">
              {reports?.length || 0}
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="font-sora text-base font-bold text-white">
              Recent Orders
            </h2>
            <div className="mt-4 space-y-3">
              {!orders || orders.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-500">
                  No orders yet.
                </p>
              ) : (
                orders.map((order) => {
                  const Icon = statusIcons[order.status || "pending"] || Clock;
                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between rounded-lg border border-ink-800/60 bg-ink-900/50 p-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">
                          Order #{order.id.slice(0, 8)}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-500">
                          ${order.amount} —{" "}
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium capitalize ${statusStyles[order.status || "pending"] || ""}`}
                      >
                        <Icon size={10} />
                        {order.status || "pending"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <h2 className="font-sora text-base font-bold text-white">
              Subscriptions
            </h2>
            <div className="mt-4 space-y-3">
              {!subscriptions || subscriptions.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-500">
                  No active subscriptions.
                </p>
              ) : (
                subscriptions.map((sub) => {
                  const Icon = statusIcons[sub.status] || Clock;
                  return (
                    <div
                      key={sub.id}
                      className="rounded-lg border border-ink-800/60 bg-ink-900/50 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium capitalize text-white">
                          {sub.plan} Plan
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium capitalize ${statusStyles[sub.status] || ""}`}
                        >
                          <Icon size={10} />
                          {sub.status}
                        </span>
                      </div>
                      <div className="mt-2 flex gap-4 text-[11px] text-ink-500">
                        {sub.current_period_start && (
                          <span>
                            Started:{" "}
                            {new Date(
                              sub.current_period_start
                            ).toLocaleDateString()}
                          </span>
                        )}
                        {sub.current_period_end && (
                          <span>
                            Ends:{" "}
                            {new Date(
                              sub.current_period_end
                            ).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="font-sora text-base font-bold text-white">
              Reports
            </h2>
            <Link
              href="/audit"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300"
            >
              Run New Audit
              <ArrowRight size={12} />
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {!reports || reports.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-500">
                No reports available.
              </p>
            ) : (
              reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between rounded-lg border border-ink-800/60 bg-ink-900/50 p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {report.title || "Untitled Report"}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {new Date(report.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-[11px] text-ink-500">View</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
