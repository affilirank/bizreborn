import type { Metadata } from "next";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";

export const metadata: Metadata = { title: "Admin Command Center" };

export default function AdminPage() {
  return <AdminDashboard />;
}
