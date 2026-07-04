"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import TopNav from "../dashboard/components/TopNav";
import { Profile } from "../dashboard/page";

type LeaveRequest = {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  remarks: string;
  status: string;
  applied_on: string;
  attachment_url?: string;
};

// Helper to calculate weekdays between two dates
function calculateAllocation(start: string, end: string) {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (e < s) return 0;
  
  let days = 0;
  let curr = new Date(s);
  while (curr <= e) {
    const dayOfWeek = curr.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) days++;
    curr.setDate(curr.getDate() + 1);
  }
  return days;
}

// Helper to check if a specific date has a leave request
function getLeaveStatusForDate(year: number, monthIndex: number, day: number, leaves: LeaveRequest[]) {
  if (!day) return null;
  const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const targetTime = new Date(dateStr).getTime();
  
  for (const l of leaves) {
    const s = new Date(l.start_date).getTime();
    const e = new Date(l.end_date).getTime();
    if (targetTime >= s && targetTime <= e) {
      return l.status;
    }
  }
  return null;
}

function MonthCalendar({ year, monthIndex, leaves }: { year: number, monthIndex: number, leaves: LeaveRequest[] }) {
  const date = new Date(year, monthIndex, 1);
  const monthName = date.toLocaleString('default', { month: 'long' });
  const firstDay = date.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  
  const grid = [];
  for (let i = 0; i < firstDay; i++) grid.push(null);
  for (let i = 1; i <= daysInMonth; i++) grid.push(i);
  
  // Fill the rest of the 6x7 grid (42 cells max, usually 35 or 42)
  while (grid.length % 7 !== 0) grid.push(null);

  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="text-xs">
      <div className="font-bold text-slate-200 mb-2">{monthName} {year}</div>
      <div className="grid grid-cols-7 text-center text-slate-500 mb-1">
        {daysOfWeek.map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 text-center gap-y-1">
        {grid.map((day, i) => {
          const status = day ? getLeaveStatusForDate(year, monthIndex, day, leaves) : null;
          
          let circleClasses = "w-6 h-6 mx-auto flex items-center justify-center rounded-full ";
          if (!day) {
            circleClasses += "transparent";
          } else if (status === 'Approved') {
            circleClasses += "bg-green-500/20 text-green-400 border border-green-500/50";
          } else if (status === 'Pending') {
            circleClasses += "bg-blue-500/20 text-blue-400 border border-blue-500/50";
          } else if (status === 'Rejected') {
            circleClasses += "bg-red-500/20 text-red-400 border border-red-500/50";
          } else {
            circleClasses += "text-slate-300 hover:bg-slate-800 cursor-default";
          }

          return (
            <div key={i} className="">
              <div className={circleClasses}>
                {day || ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LeavePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [leaveType, setLeaveType] = useState("Paid");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const currentYear = new Date().getFullYear();

  const fetchLeaves = async () => {
    const { data, error } = await supabase
      .from("leave_requests")
      .select("*")
      .order("applied_on", { ascending: false });
      
    if (data) setLeaveRequests(data);
  };

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
        console.error("Profile load error:", error);
        router.push("/login");
        return;
      }

      setProfile(data as Profile);
      setLoading(false);
    }
    load();
  }, [router]);

  useEffect(() => {
    if (profile) {
      fetchLeaves();
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    
    if (!profile) return;

    try {
      const { error: insertError } = await supabase
        .from("leave_requests")
        .insert({
          employee_id: profile.employee_id,
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          status: "Pending"
        });

      if (insertError) throw insertError;
      
      setIsModalOpen(false);
      setLeaveType("Paid");
      setStartDate("");
      setEndDate("");
      
      // Refresh the list
      fetchLeaves();

    } catch (err: any) {
      setError(err.message ?? "Failed to submit leave request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await supabase
        .from("leave_requests")
        .update({ status })
        .eq("id", id);
      fetchLeaves();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f111a]">
        <p className="text-sm text-slate-500">Loading...</p>
      </main>
    );
  }

  // Calculate Balances for Employee
  const paidLeavesUsed = leaveRequests.filter(l => l.employee_id === profile.employee_id && (l.leave_type === "Paid" || l.leave_type === "Paid Time off") && l.status === "Approved")
    .reduce((acc, curr) => acc + calculateAllocation(curr.start_date, curr.end_date), 0);
    
  const sickLeavesUsed = leaveRequests.filter(l => l.employee_id === profile.employee_id && (l.leave_type === "Sick" || l.leave_type === "Sick Leave") && l.status === "Approved")
    .reduce((acc, curr) => acc + calculateAllocation(curr.start_date, curr.end_date), 0);

  const PAID_ALLOWANCE = 24;
  const SICK_ALLOWANCE = 7;

  return (
    <main className="min-h-screen bg-[#0f111a] text-slate-200 relative">
      <TopNav 
        companyName={profile.company_name} 
        companyLogoUrl={profile.logo_url}
        userProfileUrl={profile.avatar_url}
        role={profile.role}
        employeeId={profile.employee_id}
      />
      
      {profile.role === "admin" ? (
        // ==========================================
        // ADMIN VIEW: Leave Approvals List
        // ==========================================
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold">Time Off Approvals</h1>
          </div>
          
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-400">
                <thead className="text-xs uppercase bg-slate-700 text-slate-300">
                  <tr>
                    <th className="px-6 py-3">Employee ID</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Duration</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                        No leave requests found.
                      </td>
                    </tr>
                  ) : (
                    leaveRequests.map((leave) => (
                      <tr key={leave.id} className="border-b border-slate-700">
                        <td className="px-6 py-4 text-white font-mono">{leave.employee_id}</td>
                        <td className="px-6 py-4">{leave.leave_type}</td>
                        <td className="px-6 py-4">{leave.start_date} to {leave.end_date}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            leave.status === 'Approved' ? 'bg-green-500/20 text-green-400' :
                            leave.status === 'Rejected' ? 'bg-red-500/20 text-red-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {leave.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {leave.status === 'Pending' && (
                            <>
                              <button onClick={() => handleStatusChange(leave.id, 'Approved')} className="text-green-400 hover:text-green-300 mr-4 text-xs font-semibold uppercase">Approve</button>
                              <button onClick={() => handleStatusChange(leave.id, 'Rejected')} className="text-red-400 hover:text-red-300 text-xs font-semibold uppercase">Reject</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        // ==========================================
        // EMPLOYEE VIEW: Time Off Dashboard
        // ==========================================
        <div className="mx-auto max-w-6xl px-6 py-8">
          
          <div className="bg-[#151822] border border-slate-700 rounded-lg overflow-hidden shadow-xl">
            {/* Header / Subnav */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-800 p-4 border-b border-slate-700 gap-4">
              <div className="text-white font-bold px-2 tracking-wide text-lg">
                Time Off
              </div>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-1.5 rounded text-sm font-semibold tracking-wider uppercase transition-colors"
              >
                New
              </button>
            </div>

            {/* Summary Bars */}
            <div className="grid grid-cols-2 divide-x divide-slate-700 border-b border-slate-700 bg-slate-800/50">
              <div className="p-6 text-center">
                <div className="text-blue-400 text-xl font-bold mb-1">Paid time Off</div>
                <div className="text-slate-300">{PAID_ALLOWANCE - paidLeavesUsed} Days Available</div>
              </div>
              <div className="p-6 text-center">
                <div className="text-blue-400 text-xl font-bold mb-1">Sick time off</div>
                <div className="text-slate-300">{SICK_ALLOWANCE - sickLeavesUsed} Days Available</div>
              </div>
            </div>

            {/* Yearly Calendar View */}
            <div className="p-8 flex gap-8">
              {/* 12-Month Grid */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {Array.from({ length: 12 }).map((_, i) => (
                  <MonthCalendar 
                    key={i} 
                    year={currentYear} 
                    monthIndex={i} 
                    leaves={leaveRequests.filter(l => l.employee_id === profile.employee_id)} 
                  />
                ))}
              </div>

              {/* Legend */}
              <div className="w-48 shrink-0 hidden lg:block border-l border-slate-700 pl-8">
                <div className="text-sm font-bold text-slate-200 mb-4">Legend</div>
                <div className="flex items-center gap-3 mb-3 text-sm text-slate-300">
                  <div className="w-4 h-4 rounded-full bg-green-500/20 border border-green-500/50"></div>
                  Validated
                </div>
                <div className="flex items-center gap-3 mb-3 text-sm text-slate-300">
                  <div className="w-4 h-4 rounded-full bg-blue-500/20 border border-blue-500/50"></div>
                  To Approve
                </div>
                <div className="flex items-center gap-3 mb-6 text-sm text-slate-300">
                  <div className="w-4 h-4 rounded-full bg-red-500/20 border border-red-500/50"></div>
                  Refused
                </div>

                <div className="text-sm font-bold text-slate-200 mb-4">TimeOff Types:</div>
                <ul className="text-sm text-slate-400 space-y-2 list-disc list-inside">
                  <li>Paid Time off</li>
                  <li>Sick Leave</li>
                  <li>Unpaid Leaves</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          NEW REQUEST MODAL
          ========================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#1a1d27] border border-slate-700 p-8 shadow-2xl relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white text-xl"
            >
              ✕
            </button>
            
            <h2 className="text-xl font-bold text-slate-200 mb-8 tracking-wide">Time off Type Request</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="flex items-center gap-4">
                <div className="w-32 text-sm text-slate-400 font-medium">Employee</div>
                <div className="flex-1 text-blue-400 font-semibold">[{profile.full_name}]</div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-32 text-sm text-slate-400 font-medium">Time off Type</div>
                <div className="flex-1">
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="w-full rounded bg-[#0f111a] border border-slate-700 px-4 py-2 text-blue-400 font-semibold focus:outline-none focus:border-slate-500"
                  >
                    <option value="Paid">Paid Time off</option>
                    <option value="Sick">Sick Leave</option>
                    <option value="Unpaid">Unpaid Leaves</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-32 text-sm text-slate-400 font-medium">Validity Period</div>
                <div className="flex-1 flex items-center gap-3">
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex-1 rounded bg-[#0f111a] border border-slate-700 px-3 py-1.5 text-blue-400 text-sm focus:outline-none focus:border-slate-500"
                  />
                  <span className="text-slate-400 text-sm">To</span>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="flex-1 rounded bg-[#0f111a] border border-slate-700 px-3 py-1.5 text-blue-400 text-sm focus:outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-32 text-sm text-slate-400 font-medium">Allocation</div>
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-blue-400 text-lg font-mono">
                    {calculateAllocation(startDate, endDate).toFixed(2).padStart(5, '0')}
                  </span>
                  <span className="text-blue-400">Days</span>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <div className="w-32 text-sm text-slate-400 font-medium">Attachment:</div>
                <div className="flex-1 flex items-center gap-3">
                  <button type="button" className="bg-blue-600 hover:bg-blue-500 text-white w-8 h-8 rounded flex items-center justify-center transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  </button>
                  <span className="text-slate-400 text-sm italic">(For sick leave certificate)</span>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                  {error}
                </p>
              )}

              <div className="pt-6 flex gap-4">
                <button 
                  type="submit"
                  disabled={submitting || calculateAllocation(startDate, endDate) === 0}
                  className="rounded bg-purple-600 px-8 py-2 text-sm font-semibold tracking-wide text-white hover:bg-purple-500 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded bg-slate-700 px-8 py-2 text-sm font-semibold tracking-wide text-slate-300 hover:bg-slate-600 transition-colors"
                >
                  Discard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
