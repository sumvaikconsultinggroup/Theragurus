import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest, NextResponse } from "next/server";
import { syncClerkProfile } from "@/lib/booking-server";

type ClerkEmail = { id: string; email_address: string };
type ClerkPhone = { id: string; phone_number: string };
type ClerkUser = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email_addresses?: ClerkEmail[];
  primary_email_address_id: string | null;
  phone_numbers?: ClerkPhone[];
  primary_phone_number_id: string | null;
};

function profileFromUser(data: ClerkUser) {
  const email = data.email_addresses
    ?.find((item) => item.id === data.primary_email_address_id)
    ?.email_address
    ?.trim()
    .toLowerCase();
  if (!email) return null;
  const phone =
    data.phone_numbers?.find((item) => item.id === data.primary_phone_number_id)
      ?.phone_number || "";
  const name =
    [data.first_name, data.last_name].filter(Boolean).join(" ").trim() || email;
  return { id: data.id, name, email, phone };
}

export async function POST(request: NextRequest) {
  let event;
  try {
    event = await verifyWebhook(request);
  } catch {
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }
  if (event.type === "user.created" || event.type === "user.updated") {
    const profile = profileFromUser(event.data as ClerkUser);
    if (profile) await syncClerkProfile(profile);
  }
  return NextResponse.json({ received: true });
}
