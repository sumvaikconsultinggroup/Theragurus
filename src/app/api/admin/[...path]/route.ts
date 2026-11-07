import { NextRequest } from "next/server";
import { handle } from "@/lib/booking-server";
import { adminGet,adminPost } from "@/lib/admin-server";
export const runtime="nodejs";
type Context={params:Promise<{path:string[]}>};
export async function GET(request:NextRequest,context:Context){return handle(async()=>adminGet(request,(await context.params).path));}
export async function POST(request:NextRequest,context:Context){return handle(async()=>adminPost(request,(await context.params).path));}
