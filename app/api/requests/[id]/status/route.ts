import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { getUserProfile } from "@/lib/supabase-rest";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status } = await request.json();

  // 1. Validar status (Status Lock)
  const validStatuses = ["open", "in_progress", "resolved"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ message: "Invalid status" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const profile = await getUserProfile(user.id);
    if (!profile?.organization_id) {
      return NextResponse.json({ message: "No organization assigned" }, { status: 403 });
    }

    const organizationId = profile.organization_id;
    const admin = createAdminClient();

    // 2. Fetch current status to prevent moving back from 'resolved'
    const { data: currentReq, error: fetchError } = await admin
      .from("requests")
      .select("status")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (fetchError || !currentReq) {
      return NextResponse.json({ message: "Request not found or access denied" }, { status: 404 });
    }

    if (currentReq.status === "resolved" && status !== "resolved") {
      return NextResponse.json({ message: "Cannot move back from resolved status" }, { status: 400 });
    }

    // 3. Update DB (Strict Multi-tenant)
    const updateData: any = { status };
    if (status === "resolved") {
      updateData.resolved_at = new Date().toISOString();
    }
    if (status === "in_progress") {
      updateData.assigned_to = user.id;
    }

    const { error: updateError } = await admin
      .from("requests")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (updateError) {
      return NextResponse.json({ message: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
