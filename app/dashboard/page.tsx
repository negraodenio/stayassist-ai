import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch dashboard metrics
  const [propertiesRes, unitsRes, requestsRes, knowledgeRes] = await Promise.all([
    supabase
      .from("properties")
      .select("id, name, organization_id, address, latitude, longitude")
      .order("name", { ascending: true }),
    supabase.from("units").select("id", { count: "exact", head: true }),
    supabase
      .from("requests")
      .select(
        "id, category, status, created_at, guest_name, priority, properties(name), units(name)"
      )
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("property_knowledge")
      .select("id, property_id, topic, content, created_at")
      .order("created_at", { ascending: false }),
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
    />
  );
}
