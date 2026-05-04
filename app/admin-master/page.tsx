import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { listAllOrganizations, listAllProperties, listAllProfiles } from "@/lib/supabase-rest";
import { AdminForms } from "@/components/admin/admin-forms";
import Link from "next/link";

const ADMIN_EMAIL = "negraodenio@gmail.com";

export default async function AdminMasterPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user || user.email !== ADMIN_EMAIL) {
    redirect("/dashboard");
  }

  const [organizations, properties, profiles] = await Promise.all([
    listAllOrganizations(),
    listAllProperties(),
    listAllProfiles()
  ]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <header className="mb-16 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white lg:text-5xl">
                Admin <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Master</span>
              </h1>
            </div>
            <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
              Central control for multi-tenant provisioning. Manage organizations, properties, and system-wide administrative access.
            </p>
          </div>
          <Link 
            href="/dashboard"
            className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm font-semibold backdrop-blur-md"
          >
            ← Back to Dashboard
          </Link>
        </header>

        <AdminForms organizations={organizations} profiles={profiles} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-20 pt-12 border-t border-white/5">
          {/* Organizations List */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-6 bg-blue-500 rounded-full" />
                Organizations ({organizations.length})
              </h2>
            </div>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {organizations.map((org) => (
                <div key={org.id} className="p-5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-white text-lg">{org.name}</span>
                    <span className="text-xs font-mono text-slate-500 bg-white/5 px-2 py-1 rounded">ID: {org.id.split('-')[0]}...</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Properties List */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-6 bg-emerald-500 rounded-full" />
                Properties ({properties.length})
              </h2>
            </div>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {properties.map((prop: any) => (
                <div key={prop.id} className="p-5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-white text-lg">{prop.name}</h3>
                      <p className="text-sm text-slate-400 mt-1">
                        Belongs to: <span className="text-emerald-400">{prop.organizationName || "N/A"}</span>
                      </p>
                    </div>
                    <span className="text-xs font-mono text-slate-500 bg-white/5 px-2 py-1 rounded">ID: {prop.id.split('-')[0]}...</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
