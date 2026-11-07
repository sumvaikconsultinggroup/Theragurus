import { NextRequest } from "next/server";
import {
  authAction,
  currentCustomer,
  handle,
  json,
} from "@/lib/booking-server";
export const runtime = "nodejs";
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  return action === "session"
    ? handle(async () => json({ customer: await currentCustomer() }))
    : json({ error: "Not found" }, 404);
}
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  if (!["register", "login", "logout", "recover"].includes(action))
    return json({ error: "Not found" }, 404);
  return handle(() => authAction(request, action));
}
