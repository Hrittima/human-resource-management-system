"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import TopNav from "../dashboard/components/TopNav";
import { Profile } from "../dashboard/page";

export default function PayrollPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("employee_id, full_name, company_name, logo_url, role")
        .eq("id", user.id)
        .single();
        
      if (error || !data) {
        router.push("/login");
        return;
      }

      setProfile(data as Profile);
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f111a]">
        <p className="text-sm text-slate-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f111a] text-slate-200">
      <TopNav 
        companyName={profile.company_name} 
        companyLogoUrl={profile.logo_url}
        userProfileUrl={profile.avatar_url}
        role={profile.role}
        employeeId={profile.employee_id}
      />
      
      <div className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-2xl font-bold mb-8">Payroll & Salary Management</h1>
        
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <p className="text-slate-400 mb-6">
            {profile.role === "admin" 
              ? "Manage salary structures and view payroll for all employees." 
              : "View your read-only salary and payroll information."}
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="text-xs uppercase bg-slate-700 text-slate-300">
                <tr>
                  {profile.role === "admin" && <th className="px-6 py-3">Employee</th>}
                  <th className="px-6 py-3">Basic Salary</th>
                  <th className="px-6 py-3">Allowances</th>
                  <th className="px-6 py-3">Deductions</th>
                  <th className="px-6 py-3">Net Salary</th>
                  {profile.role === "admin" && <th className="px-6 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {/* Mock Data row */}
                <tr className="border-b border-slate-700">
                  {profile.role === "admin" && <td className="px-6 py-4 text-white">Alice Smith</td>}
                  <td className="px-6 py-4">$4,500.00</td>
                  <td className="px-6 py-4">$500.00</td>
                  <td className="px-6 py-4">$200.00</td>
                  <td className="px-6 py-4 font-bold text-white">$4,800.00</td>
                  {profile.role === "admin" && (
                    <td className="px-6 py-4 text-right">
                      <button className="text-blue-400 hover:text-blue-300 text-xs font-semibold uppercase">Edit Structure</button>
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
