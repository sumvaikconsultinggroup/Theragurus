import { NextRequest } from "next/server";
import {
  availability,
  handle,
  json,
  ownedAppointment,
} from "@/lib/booking-server";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  return handle(async () => {
    const exclude = request.nextUrl.searchParams.get("booking") || "";
    if (exclude) await ownedAppointment(exclude);
    return json(
      await availability(
        request.nextUrl.searchParams.get("date") || undefined,
        exclude,
      ),
    );
  });
}
