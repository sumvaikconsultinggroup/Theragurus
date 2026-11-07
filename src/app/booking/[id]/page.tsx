import type { Metadata } from "next";
import { BookingDetail } from "@/components/booking/BookingDetail";
export const metadata: Metadata = {
  title: "Your appointment",
  robots: { index: false, follow: false },
};
export default async function AppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <BookingDetail id={(await params).id} />;
}
