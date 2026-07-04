"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { usePathname, useRouter } from "next/navigation";

export default function TopNav({
  companyLogoUrl,
  companyName,
  userProfileUrl,
  role,
  employeeId,
}: {
  companyLogoUrl?: string | null;
  companyName?: string;
  userProfileUrl?: string | null;
  role?: "admin" | "employee";
  employeeId?: string;
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function loadAttendance() {
      if (!employeeId) return;
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('date', today)
        .single();
        
      if (data) {
        if (data.check_in && !data.check_out) {
          setIsCheckedIn(true);
          const dateObj = new Date(data.check_in);
          setCheckInTime(dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        } else {
          setIsCheckedIn(false);
          setCheckInTime(null);
        }
      }
    }
    loadAttendance();
  }, [employeeId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const toggleCheckIn = async () => {
    if (!employeeId) return;
    const today = new Date().toISOString().split('T')[0];

    if (isCheckedIn) {
      // Check Out
      const now = new Date();
      await supabase
        .from('attendance')
        .update({ check_out: now.toISOString(), status: 'Present' })
        .eq('employee_id', employeeId)
        .eq('date', today);
        
      setIsCheckedIn(false);
      setCheckInTime(null);
    } else {
      // Check In
      const now = new Date();
      
      // Check if they already checked in today (and maybe checked out)
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('date', today)
        .single();
        
      if (data) {
        // Just update it if it somehow exists but they are checking in again?
        // Usually, one check-in per day for this simple app.
        await supabase
          .from('attendance')
          .update({ check_in: now.toISOString(), check_out: null, status: 'Present' })
          .eq('employee_id', employeeId)
          .eq('date', today);
      } else {
        await supabase
          .from('attendance')
          .insert({
            employee_id: employeeId,
            date: today,
            check_in: now.toISOString(),
            status: 'Present'
          });
      }
        
      setIsCheckedIn(true);
      setCheckInTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }
  };

  return (
    <nav className="flex items-center justify-between border-b border-slate-800 bg-[#0f111a] px-6 py-3">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3 border-r border-slate-700 pr-6">
          {companyLogoUrl ? (
            <img
              src={companyLogoUrl}
              alt="Company Logo"
              className="h-8 w-8 rounded bg-slate-800 object-cover border border-slate-700"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-800 border border-slate-700 text-slate-400 font-bold">
              {companyName ? companyName.charAt(0) : "C"}
            </div>
          )}
          <span className="text-sm font-semibold text-slate-200">
            {companyName || "Company Name"}
          </span>
        </div>

        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className={`text-sm font-medium transition-colors ${
              pathname === "/dashboard" ? "text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {role === "admin" ? "Employees" : "Dashboard"}
          </Link>
          <Link
            href="/attendance"
            className={`text-sm font-medium transition-colors ${
              pathname === "/attendance" ? "text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Attendance
          </Link>
          <Link
            href="/leave"
            className={`text-sm font-medium transition-colors ${
              pathname === "/leave" ? "text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Time Off
          </Link>
          <Link
            href="/payroll"
            className={`text-sm font-medium transition-colors ${
              pathname === "/payroll" ? "text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Payroll
          </Link>
        </div>
      </div>

      <div className="relative">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Search</span>
            <input
              type="text"
              placeholder=""
              className="h-8 rounded bg-slate-800 border border-slate-700 px-3 text-sm text-white focus:outline-none focus:border-slate-500"
            />
          </div>
          
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="relative h-9 w-9 rounded-full border-2 border-slate-700 overflow-hidden focus:outline-none focus:border-slate-500 transition-colors"
          >
            {userProfileUrl ? (
              <img src={userProfileUrl} alt="User Profile" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-slate-700 flex items-center justify-center text-slate-300">
                U
              </div>
            )}
            <div
              className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0f111a] ${
                isCheckedIn ? "bg-green-500" : "bg-red-500"
              }`}
            ></div>
          </button>
        </div>

        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-md border border-slate-700 bg-slate-800 shadow-lg z-50 overflow-hidden text-sm">
            <div className="px-4 py-3 border-b border-slate-700">
              <Link href="/profile" className="block text-slate-200 hover:text-white mb-2">
                My Profile
              </Link>
              <button
                onClick={handleLogout}
                className="block text-slate-400 hover:text-white"
              >
                Log Out
              </button>
            </div>
            
            <div className="p-4 bg-slate-800">
              {!isCheckedIn ? (
                <button
                  onClick={toggleCheckIn}
                  className="w-full rounded border border-slate-600 bg-slate-700 py-2 text-center text-slate-200 hover:bg-slate-600 transition-colors flex justify-between px-4 items-center"
                >
                  <span>Check IN</span>
                  <span>→</span>
                </button>
              ) : (
                <div>
                  <div className="text-xs text-slate-400 mb-2">
                    Since {checkInTime}
                  </div>
                  <button
                    onClick={toggleCheckIn}
                    className="w-full rounded border border-slate-600 bg-slate-700 py-2 text-center text-slate-200 hover:bg-slate-600 transition-colors flex justify-between px-4 items-center"
                  >
                    <span>Check Out</span>
                    <span>→</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
