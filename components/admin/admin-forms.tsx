"use client";
import { useState } from "react";
import { createOrganizationAction, createPropertyAction, createUserAction } from "@/app/admin-master/actions";

export type AdminOrganization = {
  id: string;
  name: string;
};

export type AdminProfile = {
  email: string;
  id: string;
  organization_id: string | null;
  role: string;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export function AdminForms({
  organizations,
  profiles = [],
}: {
  organizations: AdminOrganization[];
  profiles?: AdminProfile[];
}) {
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
      const result = await createOrganizationAction(orgName);
      if (result.error) {
        setMessage("Error: " + result.error);
      } else {
        setOrgName("");
        setMessage("Organization created successfully!");
      }
    } catch (error) {
      setMessage("Error: " + errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propName || !selectedOrgId) return;
    setLoading(true);
    try {
      const result = await createPropertyAction(propName, selectedOrgId);
      if (result.error) {
        setMessage("Error: " + result.error);
      } else {
        setPropName("");
        setMessage("Property created successfully!");
      }
    } catch (error) {
      setMessage("Error: " + errorMessage(error));
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
      if (result.error) {
        setMessage("Error: " + result.error);
      } else {
        setUserEmail("");
        setMessage(`User created! Temp Password: ${result.tempPassword}`);
      }
    } catch (error) {
      setMessage("Error: " + errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12">
      {message && (
        <div className="p-6 bg-navy/5 border border-navy/10 text-navy rounded-2xl shadow-sm backdrop-blur-md flex justify-between items-center animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-accent rounded-full animate-ping" />
            <span className="font-semibold">{message}</span>
          </div>
          <button onClick={() => setMessage("")} className="text-navy/40 hover:text-navy transition-colors">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Organization Form */}
        <section className="p-8 rounded-[32px] bg-white border border-border shadow-sm relative overflow-hidden group hover:border-accent/30 transition-all duration-500 luxury-ring">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <svg className="w-24 h-24 text-navy" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          </div>
          <h2 className="text-2xl font-display font-bold text-navy mb-8 flex items-center gap-3">
            <span className="p-2 bg-accent/10 rounded-xl text-accent-strong">🏢</span>
            Create Organization
          </h2>
          <form onSubmit={handleCreateOrg} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted ml-2">Organization Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g., Malia Hotels"
                className="w-full bg-stone-50 border border-border rounded-2xl px-6 py-4 text-navy focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-stone-400 text-sm font-medium"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-navy hover:bg-[#1c4755] text-white font-bold rounded-2xl transition-all disabled:opacity-50 shadow-lg shadow-navy/10 active:scale-[0.98]"
            >
              {loading ? "Processing..." : "Register Organization"}
            </button>
          </form>
        </section>

        {/* User Management Form */}
        <section className="p-8 rounded-[32px] bg-white border border-border shadow-sm relative overflow-hidden group hover:border-accent/30 transition-all duration-500 luxury-ring">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <svg className="w-24 h-24 text-navy" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          </div>
          <h2 className="text-2xl font-display font-bold text-navy mb-8 flex items-center gap-3">
            <span className="p-2 bg-accent/10 rounded-xl text-accent-strong">👤</span>
            Create Admin/User
          </h2>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted ml-2">User Email</label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="admin@hotel.com"
                className="w-full bg-stone-50 border border-border rounded-2xl px-6 py-4 text-navy focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all text-sm font-medium"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted ml-2">Assign Org</label>
                <select
                  value={userOrgId}
                  onChange={(e) => setUserOrgId(e.target.value)}
                  className="w-full bg-stone-50 border border-border rounded-2xl px-6 py-4 text-navy focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all text-sm font-medium"
                  required
                >
                  <option value="" disabled>Select Org</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted ml-2">Access Role</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full bg-stone-50 border border-border rounded-2xl px-6 py-4 text-navy focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all text-sm font-medium"
                  required
                >
                  <option value="org_admin">Org Admin</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !userOrgId}
              className="w-full py-4 bg-navy hover:bg-[#1c4755] text-white font-bold rounded-2xl transition-all disabled:opacity-50 shadow-lg shadow-navy/10 active:scale-[0.98]"
            >
              {loading ? "Creating..." : "Generate Access"}
            </button>
          </form>
        </section>
      </div>

      {/* Property Form (Full Width Below) */}
      <section className="p-8 rounded-[32px] bg-white border border-border shadow-sm luxury-ring">
        <h2 className="text-2xl font-display font-bold text-navy mb-8 flex items-center gap-3">
          <span className="p-2 bg-accent/10 rounded-xl text-accent-strong">🏠</span>
          Link New Property
        </h2>
        <form onSubmit={handleCreateProp} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted ml-2">Organization</label>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="w-full bg-stone-50 border border-border rounded-2xl px-6 py-4 text-navy focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all text-sm font-medium"
              required
            >
              <option value="" disabled>Select Organization</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted ml-2">Property Name</label>
            <input
              type="text"
              value={propName}
              onChange={(e) => setPropName(e.target.value)}
              placeholder="e.g., Malia NYC"
              className="w-full bg-stone-50 border border-border rounded-2xl px-6 py-4 text-navy focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all text-sm font-medium"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !selectedOrgId}
            className="py-4 bg-navy hover:bg-[#1c4755] text-white font-bold rounded-2xl transition-all disabled:opacity-50 shadow-lg shadow-navy/10"
          >
            {loading ? "Linking..." : "Link Property"}
          </button>
        </form>
      </section>

      {/* Profiles List */}
      {profiles.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-display font-bold text-navy mb-6 flex items-center gap-2">
            <span className="w-2 h-6 bg-accent rounded-full" />
            Active Users ({profiles.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((profile) => (
              <div key={profile.id} className="p-5 rounded-[24px] bg-white border border-border hover:border-accent/30 transition-all group luxury-ring">
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-navy">{profile.email}</span>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold ${
                      profile.role === 'superadmin' ? 'bg-navy text-white' : 
                      profile.role === 'org_admin' ? 'bg-accent/10 text-accent-strong' : 
                      'bg-stone-100 text-stone-500'
                    }`}>
                      {profile.role}
                    </span>
                    <span className="text-xs text-muted truncate font-medium">
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
