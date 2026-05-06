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

  // --- Metrics Calculation (Multi-tenant) ---
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const startOfWeek = new Date();
  startOfWeek.setUTCDate(startOfWeek.getUTCDate() - 7);

  // 1. Requests Today
  let todayQuery = admin
    .from("requests")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfToday.toISOString());

  // 2. Requests This Week
  let weekQuery = admin
    .from("requests")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfWeek.toISOString());

  // 3. Requests by Type (All time for analytics)
  let byTypeQuery = admin
    .from("requests")
    .select("category");

  // 4. Top Issues
  let issuesQuery = admin
    .from("requests")
    .select("issue")
    .eq("category", "issue")
    .not("issue", "is", null);

  // Apply filters
  if (!isSuperAdmin && orgId) {
    todayQuery = todayQuery.eq("organization_id", orgId);
    weekQuery = weekQuery.eq("organization_id", orgId);
    byTypeQuery = byTypeQuery.eq("organization_id", orgId);
    issuesQuery = issuesQuery.eq("organization_id", orgId);
  }

  // --- Main Dashboard Data ---
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
      "id, category, status, created_at, guest_name, priority, issue, assigned_to, properties(name), units(name), organization_id"
    )
    .order("created_at", { ascending: false })
    .limit(100); // Fetch more for Kanban

  let knowledgeQuery = admin
    .from("property_knowledge")
    .select("id, property_id, topic, content, created_at, properties!inner(organization_id)")
    .order("created_at", { ascending: false });

  if (!isSuperAdmin && orgId) {
    propertiesQuery = propertiesQuery.eq("organization_id", orgId);
    unitsQuery = unitsQuery.eq("properties.organization_id", orgId);
    requestsQuery = requestsQuery.eq("organization_id", orgId);
    knowledgeQuery = knowledgeQuery.eq("properties.organization_id", orgId);
  }

  // Admin data
  let allOrganizations = [];
  let allProfiles = [];
  if (isSuperAdmin) {
    const [orgsRes, profilesRes] = await Promise.all([
      admin.from("organizations").select("*").order("name", { ascending: true }),
      admin.from("profiles").select("*, organizations(name)").order("email", { ascending: true })
    ]);
    allOrganizations = orgsRes.data || [];
    allProfiles = (profilesRes.data || []).map(p => ({
      ...p,
      organizationName: Array.isArray(p.organizations) ? p.organizations[0]?.name : (p.organizations as any)?.name || "System"
    }));
  }

  // Parallel Execution
  const [
    todayRes,
    weekRes,
    byTypeRes,
    issuesRes,
    propertiesRes,
    unitsRes,
    requestsRes,
    knowledgeRes,
  ] = await Promise.all([
    todayQuery,
    weekQuery,
    byTypeQuery,
    issuesQuery,
    propertiesQuery,
    unitsQuery,
    requestsQuery,
    knowledgeQuery,
  ]);

  const properties = propertiesRes.data || [];
  const unitsCount = unitsRes.count || 0;
  const knowledge = knowledgeRes.data || [];
  
  // Analytics processing
  const typeCounts: Record<string, number> = {};
  (byTypeRes.data || []).forEach(r => {
    typeCounts[r.category] = (typeCounts[r.category] || 0) + 1;
  });

  const issueCounts: Record<string, number> = {};
  (issuesRes.data || []).forEach(r => {
    if (r.issue) issueCounts[r.issue] = (issueCounts[r.issue] || 0) + 1;
  });

  const topIssues = Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, count]) => ({ topic, count }));

  const recentRequests = ((requestsRes.data || []) as any[]).map((req) => {
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
      unit: unitName || "Room",
      assignedTo: req.assigned_to,
      issue: req.issue,
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
      metrics={{
        today: todayRes.count || 0,
        week: weekRes.count || 0,
        typeCounts,
        topIssues,
      }}
      allOrganizations={allOrganizations}
      allProfiles={allProfiles}
    />
  );
}
