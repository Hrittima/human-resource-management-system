"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import TopNav from "../dashboard/components/TopNav";
import { Profile } from "../dashboard/page";

function getWorkingDaysInMonth(year: number, month: number) {
  let days = 0;
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    const day = date.getDay();
    if (day !== 0 && day !== 6) days++; // Exclude weekends
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function calculateHours(checkIn: string | null, checkOut: string | null) {
  if (!checkIn || !checkOut) return { workHours: "-", extraHours: "-" };
  
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  const diffMs = end - start;
  
  if (diffMs <= 0) return { workHours: "00:00", extraHours: "00:00" };
  
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  
  const workHoursStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  
  // Extra hours: anything > 8 hours (480 mins)
  const STANDARD_MINS = 8 * 60;
  let extraHoursStr = "00:00";
  
  if (diffMins > STANDARD_MINS) {
    const extraMins = diffMins - STANDARD_MINS;
    const eHours = Math.floor(extraMins / 60);
    const eMins = extraMins % 60;
    extraHoursStr = `${eHours.toString().padStart(2, '0')}:${eMins.toString().padStart(2, '0')}`;
  }
  
  return { workHours: workHoursStr, extraHours: extraHoursStr };
}

const formatTime = (isoString: string | null) => {
  if (!isoString) return "-";
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

export default function AttendancePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // States
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [records, setRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

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
    }
    load();
  }, [router]);

  useEffect(() => {
    async function fetchRecords() {
      if (!profile) return;
      
      if (profile.role === "admin") {
        // Fetch all employees for this company
        const { data: profiles } = await supabase
          .from("profiles")
          .select("employee_id, full_name")
          .eq("company_name", profile.company_name)
          .neq("role", "admin");
          
        // Fetch attendance for the specific date
        const { data: attendance } = await supabase
          .from("attendance")
          .select("*")
          .eq("date", selectedDate);
          
        const combined = profiles?.map(p => {
          const rec = attendance?.find(a => a.employee_id === p.employee_id);
          return {
            id: p.employee_id,
            full_name: p.full_name,
            date: selectedDate,
            check_in: rec?.check_in || null,
            check_out: rec?.check_out || null,
            status: rec?.status || "Missing"
          };
        }) || [];
        
        setRecords(combined);
      } else {
        // Employee: Fetch their own attendance for the selected month
        const startDate = `${selectedMonth}-01`;
        const endDate = `${selectedMonth}-31`; 
        
        const { data } = await supabase
          .from("attendance")
          .select("*")
          .eq("employee_id", profile.employee_id)
          .gte("date", startDate)
        const { data: leavesData } = await supabase
          .from("leave_requests")
          .select("*")
          .eq("employee_id", profile.employee_id)
          .eq("status", "Approved")
          .gte("start_date", startDate)
          .lte("start_date", endDate);
          
        setRecords(data || []);
        // We could store leaves in state if needed, but for now we just count them.
        (profile as any)._leavesCount = leavesData ? leavesData.length : 0;
      }
      setLoading(false);
    }
    
    fetchRecords();
  }, [profile, selectedDate, selectedMonth]);

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f111a]">
        <p className="text-sm text-slate-500">Loading...</p>
      </main>
    );
  }

  // Filter for admin search
  const filteredRecords = profile.role === "admin" 
    ? records.filter(r => r.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
    : records;

  const handlePrevMonth = () => {
    const d = new Date(selectedMonth + "-01");
    d.setMonth(d.getMonth() - 1);
    setSelectedMonth(d.toISOString().slice(0, 7));
  };

  const handleNextMonth = () => {
    const d = new Date(selectedMonth + "-01");
    d.setMonth(d.getMonth() + 1);
    setSelectedMonth(d.toISOString().slice(0, 7));
  };

  // Stats
  const daysPresent = records.filter(r => r.status === "Present" && r.check_in).length;
  const [yearStr, monthStr] = selectedMonth.split('-');
  const totalWorkingDays = getWorkingDaysInMonth(parseInt(yearStr), parseInt(monthStr) - 1);
  const leavesCount = (profile as any)?._leavesCount || 0;

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
        
        <div className="bg-[#151822] border border-slate-700 rounded-lg overflow-hidden shadow-xl">
          {/* Internal Header / Subnav matching wireframe */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-800 p-4 border-b border-slate-700 gap-4">
            <div className="flex items-center gap-4">
              <div className="text-white font-bold px-2 tracking-wide">
                {profile.role === "admin" ? "Attendance" : "My Attendance"}
              </div>
              
              {profile.role === "admin" && (
                <>
                  <div className="w-px h-6 bg-slate-600"></div>
                  <input 
                    type="text" 
                    placeholder="Searchbar" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#0f111a] border border-slate-600 rounded px-4 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500 w-64 transition-colors" 
                  />
                </>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {profile.role === "admin" ? (
                <div className="flex items-center gap-2 bg-[#0f111a] border border-slate-600 rounded px-2 focus-within:border-purple-500 transition-colors">
                  <span className="text-xs text-slate-400 font-semibold px-2">Day</span>
                  <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={e => setSelectedDate(e.target.value)}
                    className="bg-transparent text-white py-1.5 text-sm focus:outline-none"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <button onClick={handlePrevMonth} className="bg-[#0f111a] border border-slate-600 rounded px-3 py-1.5 text-white hover:bg-slate-700 transition-colors">
                      &lt;-
                    </button>
                    <button onClick={handleNextMonth} className="bg-[#0f111a] border border-slate-600 rounded px-3 py-1.5 text-white hover:bg-slate-700 transition-colors">
                      -&gt;
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-[#0f111a] border border-slate-600 rounded px-2 focus-within:border-purple-500 transition-colors">
                    <input 
                      type="month" 
                      value={selectedMonth} 
                      onChange={e => setSelectedMonth(e.target.value)}
                      className="bg-transparent text-white py-1.5 text-sm focus:outline-none"
                    />
                  </div>

                  <div className="hidden md:flex items-center gap-3">
                    <div className="bg-[#0f111a] border border-slate-600 rounded px-4 py-1.5 flex flex-col items-center">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">Count of days present</span>
                      <span className="text-white font-bold">{daysPresent}</span>
                    </div>
                    <div className="bg-[#0f111a] border border-slate-600 rounded px-4 py-1.5 flex flex-col items-center">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">Leaves count</span>
                      <span className="text-white font-bold">{leavesCount}</span>
                    </div>
                    <div className="bg-[#0f111a] border border-slate-600 rounded px-4 py-1.5 flex flex-col items-center">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">Total working days</span>
                      <span className="text-white font-bold">{totalWorkingDays}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300 border-collapse">
              <thead className="bg-[#151822]">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-400 w-1/4">
                    {profile.role === "admin" ? "Emp" : "Date"}
                  </th>
                  <th className="px-6 py-4 font-semibold text-slate-400 border-l border-slate-700/50">Check In</th>
                  <th className="px-6 py-4 font-semibold text-slate-400 border-l border-slate-700/50">Check Out</th>
                  <th className="px-6 py-4 font-semibold text-slate-400 border-l border-slate-700/50">Work Hours</th>
                  <th className="px-6 py-4 font-semibold text-slate-400 border-l border-slate-700/50">Extra hours</th>
                </tr>
              </thead>
              <tbody>
                {/* Admin Wireframe Date Row */}
                {profile.role === "admin" && (
                  <tr className="bg-slate-800/30 border-t border-slate-700">
                    <td colSpan={5} className="px-6 py-3 text-center text-sm font-semibold text-slate-200 tracking-wide">
                      {new Date(selectedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </td>
                  </tr>
                )}

                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 border-t border-slate-700">
                      No attendance data found.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => {
                    const { workHours, extraHours } = calculateHours(r.check_in, r.check_out);
                    const isMissing = !r.check_in;
                    
                    return (
                      <tr key={r.id} className="border-t border-slate-700 hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          {profile.role === "admin" ? (
                            <span className="font-medium text-slate-200">{r.full_name}</span>
                          ) : (
                            <span className="font-medium text-slate-200">{r.date}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 border-l border-slate-700/50 text-slate-300">
                          {isMissing ? <span className="text-red-400/80 italic text-xs">Missing</span> : formatTime(r.check_in)}
                        </td>
                        <td className="px-6 py-4 border-l border-slate-700/50 text-slate-300">
                          {isMissing ? <span className="text-red-400/80 italic text-xs">Missing</span> : formatTime(r.check_out)}
                        </td>
                        <td className="px-6 py-4 border-l border-slate-700/50 text-slate-300">{workHours}</td>
                        <td className="px-6 py-4 border-l border-slate-700/50 text-slate-300">{extraHours}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        
      </div>
    </main>
  );
}
