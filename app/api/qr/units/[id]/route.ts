import { NextResponse } from "next/server";
import { regenerateUnitQrCode } from "@/lib/supabase-rest";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const unit = await regenerateUnitQrCode(id);

    return NextResponse.json({ unit });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to regenerate QR code.",
      },
      { status: 500 },
    );
  }
}
