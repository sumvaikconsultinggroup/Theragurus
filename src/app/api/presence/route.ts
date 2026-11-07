import { NextRequest } from "next/server";
import { handle, input, json } from "@/lib/booking-server";
import { recordPresence } from "@/lib/presence-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handle(async () => json(await recordPresence(request, await input(request))));
}
