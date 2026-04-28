import { NextResponse } from "next/server";
import { updateGuestRequestStatus } from "@/lib/supabase-rest";
import type { GuestRequestStatus } from "@/lib/guest-requests";

const allowedStatuses: GuestRequestStatus[] = ["Open", "In progress", "Resolved"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as { status?: GuestRequestStatus };

  if (!body.status || !allowedStatuses.includes(body.status)) {
    return NextResponse.json(
      { message: "A valid status is required." },
      { status: 400 },
    );
  }

  try {
    const guestRequest = await updateGuestRequestStatus(id, body.status);

    return NextResponse.json({ request: guestRequest });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to update request.",
      },
      { status: 500 },
    );
  }
}
