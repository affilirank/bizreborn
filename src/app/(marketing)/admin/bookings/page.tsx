import type { Metadata } from "next";
import { BookingsManager } from "@/components/bookings/bookings-manager";

export const metadata: Metadata = {
  title: "Strategy-Call Bookings · Admin",
  description:
    "Manage strategy/discovery call bookings, view each call script with prospect audit intel and service recommendations.",
};

export default function AdminBookingsPage() {
  return <BookingsManager />;
}