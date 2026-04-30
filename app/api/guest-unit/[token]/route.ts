import { NextResponse } from "next/server";
import { getGuestUnitByToken } from "@/lib/supabase-rest";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const result = await getGuestUnitByToken(token);

  if (!result.unit) {
    return NextResponse.json(
      {
        message: "Guest stay not found for this QR code.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(result);
}
