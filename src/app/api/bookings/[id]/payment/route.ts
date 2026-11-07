import { NextRequest } from "next/server";
import { handle, input, json, ownedAppointment } from "@/lib/booking-server";
export const runtime = "nodejs";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    await input(request);
    const row = await ownedAppointment((await params).id);
    return json({
      charged: false,
      method: "cash_at_visit",
      code: "CASH_AT_VISIT",
      paymentStatus:
        row.payment_status === "pending_quote"
          ? "due_at_visit"
          : row.payment_status,
      message:
        "Payment is collected in cash when you arrive. Nothing was charged online.",
    });
  });
}
