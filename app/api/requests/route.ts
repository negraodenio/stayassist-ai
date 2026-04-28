import { NextResponse } from "next/server";
import {
  createGuestRequest,
  listGuestRequests,
} from "@/lib/supabase-rest";
import type { GuestRequestType } from "@/lib/guest-requests";
import { sendRequestWhatsAppAlert } from "@/lib/twilio-whatsapp";

export async function GET() {
  const result = await listGuestRequests();

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    organizationId?: string;
    propertyId?: string;
    unitId?: string;
    type?: GuestRequestType;
  };

  if (!body.organizationId || !body.propertyId || !body.unitId || !body.type) {
    return NextResponse.json(
      { message: "organizationId, propertyId, unitId, and type are required." },
      { status: 400 },
    );
  }

  try {
    const guestRequest = await createGuestRequest({
      organizationId: body.organizationId,
      propertyId: body.propertyId,
      unitId: body.unitId,
      type: body.type,
    });
    const alert = await sendRequestWhatsAppAlert(guestRequest);

    if (alert.enabled && !alert.sent) {
      console.warn(`WhatsApp alert failed for request ${guestRequest.id}: ${alert.error}`);
    }

    return NextResponse.json({ alert, request: guestRequest }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to create request.",
      },
      { status: 500 },
    );
  }
}
