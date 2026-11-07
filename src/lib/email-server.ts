import "server-only";
import { ApiError } from "./booking-server";
export const emailReady = () =>
  !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
export async function sendEmail({
  to,
  subject,
  body,
  key,
}: {
  to: string;
  subject: string;
  body: string;
  key: string;
}) {
  if (!emailReady())
    throw new ApiError(503, "Email delivery is not configured yet.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": key,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [to],
      subject,
      text: body,
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok)
    throw new ApiError(
      502,
      "Resend could not accept this email. Check the sender configuration and try again.",
    );
  const result = await response.json();
  if (typeof result.id !== "string")
    throw new ApiError(
      502,
      "The email provider returned an incomplete response.",
    );
  return { id: result.id as string };
}
