import { randomUUID } from "node:crypto";
import { MongoNetworkError, MongoServerSelectionError } from "mongodb";
import { NextRequest } from "next/server";
import { adminStore } from "@/lib/admin-server";
import { ApiError, handle, input, json, rateLimit } from "@/lib/booking-server";
import { clinic } from "@/lib/booking-catalog";
import { parseContact } from "@/lib/contact-schema";
import { emailReady, sendEmail } from "@/lib/email-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handle(async () => {
    const data = await input(request);
    if (typeof data.company === "string" && data.company.trim())
      return json({ ok: true });
    const parsed = parseContact(data);
    if (!parsed.ok)
      throw new ApiError(400, parsed.message, parsed.field || undefined);
    const { name, email: address, phone = "", interest, setting, message } = parsed.data;
    await rateLimit(request, "contact", address, 6);
    const now = new Date().toISOString();
    const id = randomUUID();
    try {
      await (
        await adminStore()
      ).leads.insertOne({
        _id: id,
        name,
        email: address,
        phone,
        interest: `${interest} · ${setting}`,
        note: message,
        source: "website",
        status: "new",
        created_at: now,
        updated_at: now,
      });
    } catch (error) {
      if (
        error instanceof MongoNetworkError ||
        error instanceof MongoServerSelectionError
      )
        throw new ApiError(
          503,
          "We couldn’t save your note just now. Please call the clinic.",
        );
      throw error;
    }
    if (emailReady()) {
      try {
        await sendEmail({
          to: clinic.email,
          subject: `Website note from ${name}`,
          body: `${name} wrote from the contact page.\n\nEmail: ${address}\nPhone: ${phone || "Not provided"}\nInterested in: ${interest}\nSetting: ${setting}\n\n${message}`,
          key: `contact-${id}`,
        });
      } catch {
        // The note is already saved for the clinic to read.
      }
    }
    return json({ ok: true });
  });
}
