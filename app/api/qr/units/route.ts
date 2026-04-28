import { NextResponse } from "next/server";
import { generateMissingQrCodes, listQrUnits } from "@/lib/supabase-rest";

export async function GET() {
  try {
    const units = await listQrUnits();

    return NextResponse.json({ units });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to load QR units.",
      },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const units = await generateMissingQrCodes();

    return NextResponse.json({ units });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to generate QR codes.",
      },
      { status: 500 },
    );
  }
}
