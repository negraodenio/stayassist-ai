"use client";
import { useState } from "react";
import { createOrganizationAction, createPropertyAction, createUserAction } from "@/app/admin-master/actions";

export function AdminForms({ organizations, profiles = [] }: { organizations: any[], profiles?: any[] }) {
  const [orgName, setOrgName] = useState("");
  const [propName, setPropName] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  // User form state
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("org_admin");
  const [userOrgId, setUserOrgId] = useState("");

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName) return;
    setLoading(true);
    try {
      await createOrganizationAction(orgName);
      setOrgName("");
      setMessage("Organization created successfully!");
    } catch (error: any) {
      setMessage("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propName || !selectedOrgId) return;
    setLoading(true);
    try {
      await createPropertyAction(propName, selectedOrgId);
      setPropName("");
      setMessage("Property created successfully!");
    } catch (error: any) {
      setMessage("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail || !userOrgId) return;
    setLoading(true);
    try {
      const result = await createUserAction(userEmail, userRole, userOrgId);
      setUserEmail("");
      setMessage(`User created! Temp Password: ${result.tempPassword}`);
    } catch (error: any) {
      setMessage("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12">
      {message && (
        <div className="p-6 bg-blue-600/20 border border-blue-500/30 text-white rounded-2xl shadow-xl backdrop-blur-md flex justify-between items-center animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-ping" />
            <span className="font-medium">{message}</span>
          </div>
          <button onClick={() => setMessage("")} className="text-white/50 hover:text-white transition-colors">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Organization Form */}
        <section className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-2xl shadow-2xl relative overflow-hidden group hover:border-blue-500/30 transition-all duration-500">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-24 h-24 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
            <span className="p-2 bg-blue-500/20 rounded-lg text-blue-400">🏢</span>
            Create Organization
          </h2>
          <form onSubmit={handleCreateOrg} className="space-y-4">
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Organization Name (e.g., Malia Hotels)"
              className="w-full bg-white/[0.05] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-500"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20 active:scale-[0.98]"
            >
              {loading ? "Processing..." : "Register Organization"}
            </button>
          </form>
        </section>

        {/* User Management Form */}
        <section className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-2xl shadow-2xl relative overflow-hidden group hover:border-purple-500/30 transition-all duration-500">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-24 h-24 text-purple-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
            <span className="p-2 bg-purple-500/20 rounded-lg text-purple-400">👤</span>
            Create Admin/User
          </h2>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="User Email"
              className="w-full bg-white/[0.05] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <select
                value={userOrgId}
                onChange={(e) => setUserOrgId(e.target.value)}
                className="bg-white/[0.05] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all appearance-none"
                required
              >
                <option value="" disabled className="bg-slate-900">Select Org</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id} className="bg-slate-900">{org.name}</option>
                ))}
              </select>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                className="bg-white/[0.05] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all appearance-none"
                required
              >
                <option value="org_admin" className="bg-slate-900">Org Admin</option>
                <option value="staff" className="bg-slate-900">Staff</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading || !userOrgId}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold rounded-2xl transition-all disabled:opacity-50 shadow-lg shadow-purple-500/20 active:scale-[0.98]"
            >
              {loading ? "Creating..." : "Generate Access"}
            </button>
          </form>
        </section>
      </div>

      {/* Property Form (Full Width Below) */}
      <section className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-2xl shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
          <span className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">🏠</span>
          Link New Property
        </h2>
        <form onSubmit={handleCreateProp} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="bg-white/[0.05] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            required
          >
            <option value="" disabled className="bg-slate-900">Select Organization</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id} className="bg-slate-900">{org.name}</option>
            ))}
          </select>
          <input
            type="text"
            value={propName}
            onChange={(e) => setPropName(e.target.value)}
            placeholder="Property Name (e.g., Malia NYC)"
            className="bg-white/[0.05] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            required
          />
          <button
            type="submit"
            disabled={loading || !selectedOrgId}
            className="py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
          >
            {loading ? "Linking..." : "Link Property"}
          </button>
        </form>
      </section>

      {/* Profiles List */}
      {profiles.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <span className="w-2 h-6 bg-amber-500 rounded-full" />
            Active Users ({profiles.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((profile) => (
              <div key={profile.id} className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all group">
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-white">{profile.email}</span>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${
                      profile.role === 'superadmin' ? 'bg-blue-500/20 text-blue-400' : 
                      profile.role === 'org_admin' ? 'bg-purple-500/20 text-purple-400' : 
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {profile.role}
                    </span>
                    <span className="text-xs text-slate-500 truncate">
                      {organizations.find(o => o.id === profile.organization_id)?.name || 'System'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
