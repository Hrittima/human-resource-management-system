import React, { useState, useEffect } from "react";
import EmployeeCard, { Employee } from "./EmployeeCard";
import { Profile } from "../page";
import { supabase } from "@/lib/supabase";
import { generateEmployeeId } from "@/lib/generateEmployeeId";



export default function AdminDashboard({ profile }: { profile: Profile }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);

  
  // Modal Form State
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpEmail, setNewEmpEmail] = useState("");
  const [newEmpRole, setNewEmpRole] = useState<"employee" | "admin">("employee");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedId, setGeneratedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadEmployees() {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_name', profile.company_name);

      const { data: invitesData } = await supabase
        .from('employee_invites')
        .select('*')
        .eq('company_name', profile.company_name)
        .eq('status', 'pending');

      const loadedEmployees: Employee[] = [];

      if (profilesData) {
        profilesData.forEach((p: any) => {
          if (p.employee_id !== profile.employee_id && p.role !== 'admin') {
            loadedEmployees.push({
              id: p.employee_id,
              name: p.full_name,
              avatarUrl: p.logo_url || "",
              status: "present", 
            });
          }
        });
      }

      if (invitesData) {
        invitesData.forEach((inv: any) => {
          loadedEmployees.push({
            id: inv.employee_id,
            name: inv.full_name + " (Pending)",
            avatarUrl: "",
            status: "absent",
          });
        });
      }
      setEmployees(loadedEmployees);
    }
    loadEmployees();
  }, [profile.company_name, profile.employee_id]);

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const pendingInvites = employees.filter((employee) => employee.name.includes("(Pending)")).length;

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setNewEmpName("");
    setNewEmpEmail("");
    setNewEmpRole("employee");
    setError(null);
    setGeneratedId(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const joiningYear = new Date().getFullYear();

      // 1. Get the next serial number
      const { data: serialData, error: serialError } = await supabase.rpc(
        "get_next_serial",
        { p_year: joiningYear }
      );
      if (serialError) throw serialError;
      const serialNumber = serialData as number;

      // 2. Generate the ID
      const employeeId = generateEmployeeId(newEmpName, joiningYear, serialNumber);

      // 3. Insert into employee_invites
      const { error: inviteError } = await supabase
        .from("employee_invites")
        .insert({
          employee_id: employeeId,
          company_name: profile.company_name,
          full_name: newEmpName,
          email: newEmpEmail,
          role: newEmpRole,
          status: "pending",
        });

      if (inviteError) throw inviteError;

      // 4. Show success
      setGeneratedId(employeeId);

    } catch (err: any) {
      setError(err.message ?? "Something went wrong creating the invite.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 relative">
      <div className="mb-8 rounded-[28px] border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">People operations</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Manage your team with a clearer view.</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Keep your workforce organized, quickly spot pending invites, and find employees without losing context.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button 
              onClick={handleOpenModal}
              className="rounded-2xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-500"
            >
              + New Employee
            </button>
            <div className="w-full sm:w-56">
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-[#0f111a] px-4 py-2.5 text-sm text-white text-center focus:outline-none focus:border-slate-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Active team</p>
            <p className="mt-2 text-2xl font-semibold text-white">{filteredEmployees.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Pending invites</p>
            <p className="mt-2 text-2xl font-semibold text-white">{pendingInvites}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Search focus</p>
            <p className="mt-2 text-sm text-slate-300">{searchQuery ? `Showing results for “${searchQuery}”` : "Showing all current employees"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filteredEmployees.map((employee) => (
          <EmployeeCard key={employee.id} employee={employee} />
        ))}
      </div>
      
      {filteredEmployees.length === 0 && (
        <div className="mt-12 rounded-[24px] border border-dashed border-slate-300 bg-white/70 p-8 text-center text-slate-500">
          No employees found matching “{searchQuery}”. Try a wider search or add a new team member.
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl bg-slate-800 border border-slate-700 p-6 shadow-2xl relative">
            <button 
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>
            
            <h2 className="text-xl font-bold text-white mb-6">Create New Employee</h2>

            {generatedId ? (
              <div className="text-center py-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 text-green-400 text-2xl">
                  ✓
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Employee Invited!</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Please share this Employee ID with them so they can register.
                </p>
                <div className="bg-[#0f111a] border border-slate-700 rounded-lg py-3 px-4 mb-6">
                  <span className="text-xl font-mono text-purple-400 font-bold tracking-widest">{generatedId}</span>
                </div>
                <button 
                  onClick={handleCloseModal}
                  className="w-full rounded bg-slate-700 px-4 py-2 font-semibold text-white hover:bg-slate-600 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newEmpName}
                    onChange={(e) => setNewEmpName(e.target.value)}
                    className="w-full rounded bg-[#0f111a] border border-slate-700 px-4 py-2 text-white focus:outline-none focus:border-slate-500"
                    placeholder="Jane Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={newEmpEmail}
                    onChange={(e) => setNewEmpEmail(e.target.value)}
                    className="w-full rounded bg-[#0f111a] border border-slate-700 px-4 py-2 text-white focus:outline-none focus:border-slate-500"
                    placeholder="jane@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Role</label>
                  <select
                    value={newEmpRole}
                    onChange={(e) => setNewEmpRole(e.target.value as any)}
                    className="w-full rounded bg-[#0f111a] border border-slate-700 px-4 py-2 text-white focus:outline-none focus:border-slate-500"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin / HR</option>
                  </select>
                </div>

                {error && (
                  <p className="text-sm text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                    {error}
                  </p>
                )}

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 rounded border border-slate-600 bg-transparent px-4 py-2 font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-500 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Creating..." : "Create"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
