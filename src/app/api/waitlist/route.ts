import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import {
  ApiError,
  email,
  handle,
  input,
  json,
  text,
} from "@/lib/booking-server";
import { getStore } from "@/lib/booking-store";
import { serviceById, type VisitMode } from "@/lib/booking-catalog";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handle(async () => {
    const data = await input(request);
    const serviceId = text(data, "serviceId");
    const service = serviceById(serviceId);
    if (!service) throw new ApiError(400, "Choose a service.", "serviceId");
    const mode = text(data, "mode") as VisitMode;
    if (!service.modes.includes(mode))
      throw new ApiError(400, "Choose a visit type for this service.", "mode");
    const start = text(data, "start");
    if (!Number.isFinite(new Date(start).getTime()))
      throw new ApiError(400, "Choose the time you wanted.", "start");
    const name = text(data, "name");
    const address = email(data);
    const phone = text(data, "phone", 32);
    const store = await getStore();
    const waitlist = store.database.collection<{
      _id: string;
      email: string;
      name: string;
      phone: string;
      mode: string;
      timezone: string;
      start_at: string;
      service_id: string;
      status: string;
      created_at: string;
    }>("booking_waitlist");
    const existing = await waitlist.findOne({
      email: address,
      start_at: start,
      service_id: serviceId,
      status: { $in: ["waiting", "offered"] },
    });
    if (existing) return json({ ok: true, already: true });
    await waitlist.insertOne({
      _id: randomUUID(),
      service_id: serviceId,
      mode,
      start_at: start,
      name,
      email: address,
      phone,
      timezone: text(data, "timezone", 80, false) || "America/Los_Angeles",
      status: "waiting",
      created_at: new Date().toISOString(),
    });
    return json({ ok: true, already: false });
  });
}
