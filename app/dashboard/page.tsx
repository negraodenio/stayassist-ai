import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { createClient } from "@/utils/supabase/server";
import { getUserProfile } from "@/lib/supabase-rest";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await getUserProfile(user.id);
  const isSuperAdmin = profile?.role === "superadmin";
  const orgId = profile?.organization_id;

  // Build filtered queries
  let propertiesQuery = supabase
    .from("properties")
    .select("id, name, organization_id, address, latitude, longitude")
    .order("name", { ascending: true });

  let unitsQuery = supabase
    .from("units")
    .select("id, properties!inner(organization_id)", { count: "exact", head: true });

  let requestsQuery = supabase
    .from("requests")
    .select(
      "id, category, status, created_at, guest_name, priority, properties(name), units(name), organization_id"
    )
    .order("created_at", { ascending: false })
    .limit(4);

  let knowledgeQuery = supabase
    .from("property_knowledge")
    .select("id, property_id, topic, content, created_at, properties!inner(organization_id)")
    .order("created_at", { ascending: false });

  // Apply organization filter if not superadmin
  if (!isSuperAdmin && orgId) {
    propertiesQuery = propertiesQuery.eq("organization_id", orgId);
    unitsQuery = unitsQuery.eq("properties.organization_id", orgId);
    requestsQuery = requestsQuery.eq("organization_id", orgId);
    knowledgeQuery = knowledgeQuery.eq("properties.organization_id", orgId);
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
  
  // Format requests safely
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentRequests = (requestsRes.data || []).map((req: any) => {
    const propName = Array.isArray(req.properties) ? req.properties[0]?.name : req.properties?.name;
    const unitName = Array.isArray(req.units) ? req.units[0]?.name : req.units?.name;
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

  return (
    <DashboardShell
      properties={properties}
      unitsCount={unitsCount}
      recentRequests={recentRequests}
      knowledge={knowledge}
      userEmail={user?.email || undefined}
    />
  );
}
