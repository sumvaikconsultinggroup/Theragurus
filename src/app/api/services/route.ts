import { bookingServices, clinic } from "@/lib/booking-catalog";
import { json } from "@/lib/booking-server";
export const runtime = "nodejs";
export async function GET() {
  return json({
    services: bookingServices,
    clinic,
    paymentGatewayEnabled: false,
    paymentMethod: "cash_at_visit",
  });
}
