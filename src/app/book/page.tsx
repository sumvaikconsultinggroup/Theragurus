import type { Metadata } from "next";
import { BookingFlow } from "@/components/booking/BookingFlow";
export const metadata: Metadata = {
  title: "Book your care",
  robots: { index: false, follow: true },
};
export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const { service } = await searchParams;
  return <BookingFlow key={service || "all"} initialServiceId={service} />;
}
