import { NextResponse } from "next/server";
import { listGuestOptions } from "@/lib/supabase-rest";

export async function GET() {
  const result = await listGuestOptions();

  return NextResponse.json(result);
}
