"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import TopNav from "./components/TopNav";
import AdminDashboard from "./components/AdminDashboard";
import EmployeeDashboard from "./components/EmployeeDashboard";

export type Profile = {
  employee_id: string;
  full_name: string;
  company_name: string;
  logo_url: string | null;
  avatar_url?: string | null;
  role: "admin" | "employee";
};

export default function DashboardPage() {
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
      
      {profile.role === "admin" ? (
        <AdminDashboard profile={profile} />
      ) : (
        <EmployeeDashboard profile={profile} />
      )}
    </main>
  );
}
