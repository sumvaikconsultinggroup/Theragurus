import { NextRequest } from "next/server";
import { ApiError, handle, input, json, text } from "@/lib/booking-server";
import { findCoupon } from "@/lib/booking-notify";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handle(async () => {
    const data = await input(request);
    const code = text(data, "code", 24);
    const found = await findCoupon(code);
    if (!found || "error" in found) {
      throw new ApiError(400, found && "error" in found ? found.error : "Enter a coupon code.", "code");
    }
    return json({ coupon: found.coupon });
  });
}
