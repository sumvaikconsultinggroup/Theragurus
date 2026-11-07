import { NextRequest } from "next/server";
import {
  createAppointment,
  handle,
  json,
  listAppointments,
} from "@/lib/booking-server";
export const runtime = "nodejs";
export async function GET() {
  return handle(async () => json({ appointments: await listAppointments() }));
}
export async function POST(request: NextRequest) {
  return handle(() => createAppointment(request));
}
