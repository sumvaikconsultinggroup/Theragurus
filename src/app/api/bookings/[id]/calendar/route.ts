import { NextRequest, NextResponse } from "next/server";
import { clinic } from "@/lib/booking-catalog";
import { handle, ownedAppointment } from "@/lib/booking-server";
export const runtime = "nodejs";
const escape = (value: string) =>
  value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
const stamp = (date: string) =>
  date.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const appointment = await ownedAppointment((await params).id);
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//TheraGurus//Appointment Requests//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${appointment.id}@theragurus.com`,
      `DTSTAMP:${stamp(new Date().toISOString())}`,
      `DTSTART:${stamp(appointment.start_at)}`,
      `DTEND:${stamp(appointment.end_at)}`,
      `SUMMARY:TheraGurus ${appointment.admin_status === "confirmed" ? "appointment" : "appointment request"}`,
      `DESCRIPTION:${escape(`${appointment.admin_status === "confirmed" ? "Appointment confirmed by the clinic." : "Preferred appointment window only. Time and session length await clinic confirmation."} Reference: ${appointment.reference}. Call ${clinic.phone}.`)}`,
      `LOCATION:${escape(appointment.mode === "clinic" ? clinic.address : "Contact clinic to confirm visit details")}`,
      `STATUS:${appointment.status === "cancelled" ? "CANCELLED" : appointment.admin_status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
      "END:VCALENDAR",
    ];
    return new NextResponse(lines.join("\r\n") + "\r\n", {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${appointment.reference}.ics"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
