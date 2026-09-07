import type { Metadata } from "next";
import { ClientDashboard } from "@/components/dashboard/client-dashboard";

export const metadata: Metadata = { title: "Client Dashboard" };

export default function DashboardPage() {
  return <ClientDashboard />;
}
