import { NextRequest } from "next/server";
import {
  appointmentView,
  handle,
  json,
  ownedAppointment,
  updateAppointment,
} from "@/lib/booking-server";
export const runtime = "nodejs";
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () =>
    json({
      appointment: appointmentView(await ownedAppointment((await params).id)),
    }),
  );
}
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(() => params.then(({ id }) => updateAppointment(request, id)));
}
