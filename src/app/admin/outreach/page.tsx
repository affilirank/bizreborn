import type { Metadata } from "next";
import { OutreachQueue } from "@/components/dashboard/outreach-queue";

export const metadata: Metadata = { title: "Outreach Queue" };

export default function AdminOutreachPage() {
  return <OutreachQueue />;
}
