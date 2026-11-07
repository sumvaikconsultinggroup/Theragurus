import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { adminStore } from "@/lib/admin-server";
import {
  ApiError,
  email,
  handle,
  hash,
  input,
  json,
  rateLimit,
} from "@/lib/booking-server";
import { emailReady, sendEmail } from "@/lib/email-server";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  return handle(async () => {
    const data = await input(request);
    await rateLimit(request, "newsletter", "", 30);
    const s = await adminStore();
    if (data.action === "confirm" || data.action === "unsubscribe") {
      const token = typeof data.token === "string" ? data.token : "";
      if (!/^[a-f0-9]{64}$/.test(token))
        throw new ApiError(400, "This link is invalid.");
      const result =
        data.action === "confirm"
          ? await s.subscribers.updateOne(
              { token_hash: hash(token), status: "pending" },
              { $set: { status: "subscribed", token_hash: "" } },
            )
          : await s.subscribers.updateOne(
              { unsubscribe_token: token },
              { $set: { status: "unsubscribed" } },
            );
      if (!result.matchedCount)
        throw new ApiError(
          400,
          "This link is invalid or has already been used.",
        );
      return json({ ok: true });
    }
    const address = email(data);
    await rateLimit(request, "newsletter-email", address, 4);
    if (data.consent !== true)
      throw new ApiError(400, "Please agree to receive our newsletter.");
    if (!emailReady())
      throw new ApiError(
        503,
        "Subscriptions are temporarily unavailable. Please try again later.",
      );
    const existing = await s.subscribers.findOne({ _id: address });
    if (existing?.status === "subscribed") return json({ ok: true });
    const token = randomBytes(32).toString("hex"),
      unsubscribe =
        existing?.unsubscribe_token || randomBytes(32).toString("hex");
    await s.subscribers.updateOne(
      { _id: address },
      {
        $set: {
          email: address,
          name: "",
          status: "pending",
          consent_source: "Website newsletter confirmation",
          created_at: new Date().toISOString(),
          token_hash: hash(token),
          unsubscribe_token: unsubscribe,
        },
      },
      { upsert: true },
    );
    await sendEmail({
      to: address,
      subject: "Confirm your TheraGurus newsletter subscription",
      body: `Please confirm that you would like to receive pelvic health and workplace wellbeing updates from TheraGurus.\n\n${process.env.APP_ORIGIN || request.nextUrl.origin}/newsletter?confirm=${token}\n\nIf you did not request this, you can ignore this email.`,
      key: `subscribe-${hash(token)}`,
    });
    return json({ ok: true });
  });
}
