import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { createAdminClient, createClient } from "@/utils/supabase/server";
import { getUserProfile } from "@/lib/supabase-rest";

type Related<T> = T | T[] | null | undefined;

type DashboardRequestRow = {
  category: string;
  created_at: string;
  id: string;
  priority?: string | null;
  properties?: Related<{ name?: string | null }>;
  status: string;
  units?: Related<{ name?: string | null }>;
};

function firstRelated<T>(value: Related<T>) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await getUserProfile(user.id);
  const isSuperAdmin = profile?.role === "superadmin";
  const orgId = profile?.organization_id;
  const admin = createAdminClient();
  let whatsappAlertPhone = "";

  if (orgId) {
    const { data: organization } = await admin
      .from("organizations")
      .select("whatsapp_alert_phone")
      .eq("id", orgId)
      .maybeSingle<{ whatsapp_alert_phone: string | null }>();

    whatsappAlertPhone = organization?.whatsapp_alert_phone || "";
  }

  // Build filtered queries
  let propertiesQuery = admin
    .from("properties")
    .select("id, name, organization_id, address, latitude, longitude")
    .order("name", { ascending: true });

  let unitsQuery = admin
    .from("units")
    .select("id, properties!inner(organization_id)", { count: "exact", head: true });

  let requestsQuery = admin
    .from("requests")
    .select(
      "id, category, status, created_at, guest_name, priority, properties(name), units(name), organization_id"
    )
    .order("created_at", { ascending: false })
    .limit(4);

  let knowledgeQuery = admin
    .from("property_knowledge")
    .select("id, property_id, topic, content, created_at, properties!inner(organization_id)")
    .order("created_at", { ascending: false });

  // Apply organization filter if not superadmin
  if (!isSuperAdmin && orgId) {
    propertiesQuery = propertiesQuery.eq("organization_id", orgId);
    unitsQuery = unitsQuery.eq("properties.organization_id", orgId);
    requestsQuery = requestsQuery.eq("organization_id", orgId);
    knowledgeQuery = knowledgeQuery.eq("properties.organization_id", orgId);
  } else if (!isSuperAdmin) {
    propertiesQuery = propertiesQuery.eq("organization_id", "__missing_org__");
    unitsQuery = unitsQuery.eq("properties.organization_id", "__missing_org__");
    requestsQuery = requestsQuery.eq("organization_id", "__missing_org__");
    knowledgeQuery = knowledgeQuery.eq("properties.organization_id", "__missing_org__");
  }

  // Fetch dashboard metrics in parallel
  const [propertiesRes, unitsRes, requestsRes, knowledgeRes] = await Promise.all([
    propertiesQuery,
    unitsQuery,
    requestsQuery,
    knowledgeQuery,
  ]);

  const properties = propertiesRes.data || [];
  const unitsCount = unitsRes.count || 0;
  const knowledge = knowledgeRes.data || [];
  
  const recentRequests = ((requestsRes.data || []) as DashboardRequestRow[]).map((req) => {
    const propName = firstRelated(req.properties)?.name;
    const unitName = firstRelated(req.units)?.name;
    return {
      id: req.id,
      guest: unitName || "Unknown Unit",
      property: propName || "Unknown Property",
      type: req.category,
      status: req.status,
      priority: req.priority || "normal",
      createdAt: req.created_at,
    };
  });

  const hasTwilioContentSid = !!(
    process.env.TWILIO_WHATSAPP_CONTENT_SID ||
    process.env.TWILIO_CONTENT_SID ||
    process.env.TWILIO_TEMPLATE_SID
  );

  return (
    <DashboardShell
      properties={properties}
      unitsCount={unitsCount}
      recentRequests={recentRequests}
      knowledge={knowledge}
      whatsappAlertPhone={whatsappAlertPhone}
      hasTwilioContentSid={hasTwilioContentSid}
      userEmail={user?.email || undefined}
    />
  );
}
