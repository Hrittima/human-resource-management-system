"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import TopNav from "../../dashboard/components/TopNav";
import { Profile } from "../../dashboard/page";

type ActiveTab = "My Profile" | "Private Info" | "Salary Info";
type RuleType = "percentage" | "fixed";
type Rule = { type: RuleType; value: number };

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const employeeIdParam = params.id as string;
  
  const [adminProfile, setAdminProfile] = useState<Profile | null>(null);
  const [targetEmployee, setTargetEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("My Profile");

  // --- Salary State ---
  const [monthlyWage, setMonthlyWage] = useState<number>(50000);
  const [yearlyWage, setYearlyWage] = useState<number>(600000);
  const [workingDays, setWorkingDays] = useState<number>(5);
  const [breakTime, setBreakTime] = useState<number>(1);

  // Salary Component Rules
  const [basicRule, setBasicRule] = useState<Rule>({ type: "percentage", value: 50 });
  const [hraRule, setHraRule] = useState<Rule>({ type: "percentage", value: 50 });
  const [stdRule, setStdRule] = useState<Rule>({ type: "fixed", value: 4167 });
  const [perfRule, setPerfRule] = useState<Rule>({ type: "percentage", value: 8.33 });
  const [ltaRule, setLtaRule] = useState<Rule>({ type: "percentage", value: 8.333 });
  
  // Deductions Rules
  const [pfRule, setPfRule] = useState<Rule>({ type: "percentage", value: 12 });
  const [profTaxRule, setProfTaxRule] = useState<Rule>({ type: "fixed", value: 200 });

  // Load Admin's own profile & target employee details
  useEffect(() => {
    async function loadData() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: adminData, error: adminError } = await supabase
        .from("profiles")
        .select("employee_id, full_name, company_name, logo_url, role")
        .eq("id", user.id)
        .single();
        
      if (adminError || !adminData || adminData.role !== "admin") {
        router.push("/login"); // Only admins allowed here
        return;
      }

      setAdminProfile(adminData as Profile);

      // Fetch target employee data
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("employee_id", employeeIdParam)
        .single();

      if (profileData) {
        setTargetEmployee(profileData);
      } else {
        const { data: inviteData } = await supabase
          .from("employee_invites")
          .select("*")
          .eq("employee_id", employeeIdParam)
          .single();
        if (inviteData) {
          setTargetEmployee(inviteData);
        }
      }

      // Fetch Payroll Details
      const { data: payrollData } = await supabase
        .from("payroll_details")
        .select("*")
        .eq("employee_id", employeeIdParam)
        .single();

      if (payrollData) {
        setMonthlyWage(payrollData.monthly_wage);
        setYearlyWage(payrollData.yearly_wage);
        setWorkingDays(payrollData.working_days_per_week);
        setBreakTime(payrollData.break_time_hrs);
        
        if (payrollData.salary_structure) {
          const struct = payrollData.salary_structure;
          if (struct.basic) setBasicRule(struct.basic);
          if (struct.hra) setHraRule(struct.hra);
          if (struct.standard_allowance) setStdRule(struct.standard_allowance);
          if (struct.performance_bonus) setPerfRule(struct.performance_bonus);
          if (struct.lta) setLtaRule(struct.lta);
          if (struct.pf) setPfRule(struct.pf);
          if (struct.professional_tax) setProfTaxRule(struct.professional_tax);
        }
      }

      setLoading(false);
    }
    loadData();
  }, [router, employeeIdParam]);

  // --- Auto Calculations ---
  const basicAmt = basicRule.type === "percentage" ? (monthlyWage * basicRule.value) / 100 : basicRule.value;
  // HRA is calculated against BASIC amount
  const hraAmt = hraRule.type === "percentage" ? (basicAmt * hraRule.value) / 100 : hraRule.value;
  const stdAmt = stdRule.type === "percentage" ? (monthlyWage * stdRule.value) / 100 : stdRule.value;
  const perfAmt = perfRule.type === "percentage" ? (monthlyWage * perfRule.value) / 100 : perfRule.value;
  const ltaAmt = ltaRule.type === "percentage" ? (monthlyWage * ltaRule.value) / 100 : ltaRule.value;
  
  const componentsSum = basicAmt + hraAmt + stdAmt + perfAmt + ltaAmt;
  const fixedAllowanceAmt = Math.max(0, monthlyWage - componentsSum);

  // Deductions
  const pfAmt = pfRule.type === "percentage" ? (basicAmt * pfRule.value) / 100 : pfRule.value;
  const profTaxAmt = profTaxRule.type === "percentage" ? (monthlyWage * profTaxRule.value) / 100 : profTaxRule.value;
  const totalDeductions = pfAmt + profTaxAmt;
  const netPayAmt = monthlyWage - totalDeductions;

  // Sync Monthly to Yearly
  useEffect(() => {
    setYearlyWage(monthlyWage * 12);
  }, [monthlyWage]);

  const handleSaveSalary = async () => {
    setSaving(true);
    const struct = {
      basic: basicRule,
      hra: hraRule,
      standard_allowance: stdRule,
      performance_bonus: perfRule,
      lta: ltaRule,
      pf: pfRule,
      professional_tax: profTaxRule
    };

    const payload = {
      employee_id: employeeIdParam,
      monthly_wage: monthlyWage,
      yearly_wage: yearlyWage,
      working_days_per_week: workingDays,
      break_time_hrs: breakTime,
      salary_structure: struct
    };

    const { error } = await supabase
      .from("payroll_details")
      .upsert(payload, { onConflict: "employee_id" });

    if (!error) {
      alert("Salary Info saved successfully!");
    } else {
      alert("Error saving: " + error.message);
    }
    setSaving(false);
  };

  if (loading || !adminProfile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f111a]">
        <p className="text-sm text-slate-500">Loading...</p>
      </main>
    );
  }

  // Static mock data fallback for profile formatting
  const mockEmp = {
    avatar_url: targetEmployee?.logo_url || "",
    full_name: targetEmployee?.full_name || "Alice Smith",
    employee_id: targetEmployee?.employee_id || employeeIdParam || "EMP-2026-0001",
    email: targetEmployee?.email || "alice.smith@example.com",
    phone: targetEmployee?.phone || "-",
    company: adminProfile.company_name,
    department: targetEmployee?.department || "Engineering",
    manager: targetEmployee?.manager || "Bob Jones",
    location: targetEmployee?.location || "New York, NY",
    about: targetEmployee?.about || "No about information.",
    job_love: targetEmployee?.job_love || "No details provided.",
    hobbies: targetEmployee?.hobbies || "No hobbies listed.",
    skills: targetEmployee?.skills || [],
    certifications: targetEmployee?.certifications || [],
    dob: targetEmployee?.dob || "-",
    residing_address: targetEmployee?.residing_address || "-",
    nationality: targetEmployee?.nationality || "-",
    personal_email: targetEmployee?.personal_email || "-",
    gender: targetEmployee?.gender || "-",
    marital_status: targetEmployee?.marital_status || "-",
    doj: targetEmployee?.doj || "-",
    bank_account_no: targetEmployee?.bank_account_no || "-",
    bank_name: targetEmployee?.bank_name || "-",
    ifsc_code: targetEmployee?.ifsc_code || "-",
    pan_no: targetEmployee?.pan_no || "-",
    uan_no: targetEmployee?.uan_no || "-"
  };

  const renderRuleInput = (rule: Rule, setRule: (r: Rule) => void) => (
    <div className="flex items-center gap-2 mt-1">
      <select 
        value={rule.type} 
        onChange={(e) => setRule({ ...rule, type: e.target.value as RuleType })}
        className="bg-[#0f111a] border border-slate-700 text-xs text-white rounded px-2 py-1 focus:outline-none"
      >
        <option value="percentage">%</option>
        <option value="fixed">Fixed</option>
      </select>
      <input 
        type="number" 
        value={rule.value} 
        onChange={(e) => setRule({ ...rule, value: parseFloat(e.target.value) || 0 })}
        className="bg-[#0f111a] border border-slate-700 text-xs text-white rounded px-2 py-1 w-20 text-right focus:outline-none"
      />
    </div>
  );

  return (
    <main className="min-h-screen bg-[#0f111a] text-slate-200 flex flex-col font-sans">
      <TopNav 
        companyName={adminProfile.company_name} 
        companyLogoUrl={adminProfile.logo_url}
        userProfileUrl={adminProfile.avatar_url}
        role={adminProfile.role}
        employeeId={adminProfile.employee_id}
      />
      
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-6 py-8 h-full flex flex-col lg:flex-row gap-8">
          
          {/* Left Sidebar (Profile Info) */}
          <div className="w-full lg:w-80 shrink-0 border border-slate-700 bg-slate-800/50 rounded-xl p-6 flex flex-col h-max">
            <h2 className="text-xl font-bold mb-6 text-white border-b border-slate-700 pb-4">Employee Detail</h2>
            
            <div className="flex flex-col items-center mb-8 text-center">
              <div className="h-28 w-28 rounded-full border-4 border-slate-700 bg-slate-700 flex items-center justify-center text-3xl overflow-hidden mb-4 shadow-xl">
                {mockEmp.avatar_url ? (
                  <img src={mockEmp.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  "👤"
                )}
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{mockEmp.full_name}</h3>
            </div>

            <div className="space-y-4">
              <div className="border-b border-slate-700 pb-4 space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Login ID</span>
                  <span className="text-sm text-slate-200 font-mono border-b border-slate-600 pb-0.5 min-w-[120px] text-right">{mockEmp.employee_id}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Email</span>
                  <span className="text-sm text-slate-200 border-b border-slate-600 pb-0.5 min-w-[120px] text-right">{mockEmp.email}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Mobile</span>
                  <span className="text-sm text-slate-200 border-b border-slate-600 pb-0.5 min-w-[120px] text-right">{mockEmp.phone}</span>
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Company</span>
                  <span className="text-sm text-slate-200 border-b border-slate-600 pb-0.5 min-w-[120px] text-right">{mockEmp.company}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Department</span>
                  <span className="text-sm text-slate-200 border-b border-slate-600 pb-0.5 min-w-[120px] text-right">{mockEmp.department}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Manager</span>
                  <span className="text-sm text-slate-200 border-b border-slate-600 pb-0.5 min-w-[120px] text-right">{mockEmp.manager}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Location</span>
                  <span className="text-sm text-slate-200 border-b border-slate-600 pb-0.5 min-w-[120px] text-right">{mockEmp.location}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Tabs */}
            <div className="flex border-b border-slate-700 mb-6">
              <button
                onClick={() => setActiveTab("My Profile")}
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
                  activeTab === "My Profile" 
                    ? "border-purple-500 text-purple-400 bg-purple-500/10" 
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600"
                }`}
              >
                My Profile
              </button>
              <button
                onClick={() => setActiveTab("Private Info")}
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
                  activeTab === "Private Info" 
                    ? "border-purple-500 text-purple-400 bg-purple-500/10" 
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600"
                }`}
              >
                Private Info
              </button>
              <button
                onClick={() => setActiveTab("Salary Info")}
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
                  activeTab === "Salary Info" 
                    ? "border-purple-500 text-purple-400 bg-purple-500/10" 
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600"
                }`}
              >
                Salary Info
              </button>
            </div>

            {/* Tab Content: My Profile */}
            {activeTab === "My Profile" && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in duration-300">
                <div className="xl:col-span-2 space-y-6">
                  <div className="border border-slate-700 bg-slate-800/30 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-3">About</h3>
                    <p className="text-sm text-slate-400 leading-relaxed italic">{mockEmp.about}</p>
                  </div>
                  <div className="border border-slate-700 bg-slate-800/30 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-3">What I love about my job</h3>
                    <p className="text-sm text-slate-400 leading-relaxed italic">{mockEmp.job_love}</p>
                  </div>
                  <div className="border border-slate-700 bg-slate-800/30 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-3">My interests and hobbies</h3>
                    <p className="text-sm text-slate-400 leading-relaxed italic">{mockEmp.hobbies}</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="border border-slate-700 bg-slate-800/30 rounded-xl p-6 h-64 flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-4">Skills</h3>
                    <div className="flex-1 flex flex-wrap gap-2 content-start overflow-y-auto">
                      {mockEmp.skills.map((skill: string) => (
                        <span key={skill} className="text-xs px-3 py-1 bg-slate-700 text-slate-300 rounded-full border border-slate-600">{skill}</span>
                      ))}
                    </div>
                  </div>
                  <div className="border border-slate-700 bg-slate-800/30 rounded-xl p-6 h-64 flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-4">Certification</h3>
                    <div className="flex-1 flex flex-wrap gap-2 content-start overflow-y-auto">
                      {mockEmp.certifications.map((cert: string) => (
                        <span key={cert} className="text-xs px-3 py-1 bg-slate-700 text-slate-300 rounded-full border border-slate-600">{cert}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Content: Private Info */}
            {activeTab === "Private Info" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16 animate-in fade-in duration-300">
                {/* Left Column */}
                <div className="space-y-6">
                  <div className="flex items-end justify-between border-b border-slate-700 pb-1">
                    <span className="text-sm font-semibold text-slate-400 w-40">Date of Birth</span>
                    <span className="text-sm text-slate-200 flex-1 text-right">{mockEmp.dob}</span>
                  </div>
                  <div className="flex items-end justify-between border-b border-slate-700 pb-1">
                    <span className="text-sm font-semibold text-slate-400 w-40">Residing Address</span>
                    <span className="text-sm text-slate-200 flex-1 text-right">{mockEmp.residing_address}</span>
                  </div>
                  <div className="flex items-end justify-between border-b border-slate-700 pb-1">
                    <span className="text-sm font-semibold text-slate-400 w-40">Nationality</span>
                    <span className="text-sm text-slate-200 flex-1 text-right">{mockEmp.nationality}</span>
                  </div>
                  <div className="flex items-end justify-between border-b border-slate-700 pb-1">
                    <span className="text-sm font-semibold text-slate-400 w-40">Personal Email</span>
                    <span className="text-sm text-slate-200 flex-1 text-right">{mockEmp.personal_email}</span>
                  </div>
                  <div className="flex items-end justify-between border-b border-slate-700 pb-1">
                    <span className="text-sm font-semibold text-slate-400 w-40">Gender</span>
                    <span className="text-sm text-slate-200 flex-1 text-right">{mockEmp.gender}</span>
                  </div>
                  <div className="flex items-end justify-between border-b border-slate-700 pb-1">
                    <span className="text-sm font-semibold text-slate-400 w-40">Marital Status</span>
                    <span className="text-sm text-slate-200 flex-1 text-right">{mockEmp.marital_status}</span>
                  </div>
                  <div className="flex items-end justify-between border-b border-slate-700 pb-1">
                    <span className="text-sm font-semibold text-slate-400 w-40">Date of Joining</span>
                    <span className="text-sm text-slate-200 flex-1 text-right">{mockEmp.doj}</span>
                  </div>
                </div>

                {/* Right Column: Bank Details */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-6 border-b border-slate-700 pb-2">Bank Details</h3>
                  <div className="space-y-6">
                    <div className="flex items-end justify-between border-b border-slate-700 pb-1">
                      <span className="text-sm font-semibold text-slate-400 w-40">Account Number</span>
                      <span className="text-sm text-slate-200 flex-1 text-right">{mockEmp.bank_account_no}</span>
                    </div>
                    <div className="flex items-end justify-between border-b border-slate-700 pb-1">
                      <span className="text-sm font-semibold text-slate-400 w-40">Bank Name</span>
                      <span className="text-sm text-slate-200 flex-1 text-right">{mockEmp.bank_name}</span>
                    </div>
                    <div className="flex items-end justify-between border-b border-slate-700 pb-1">
                      <span className="text-sm font-semibold text-slate-400 w-40">IFSC Code</span>
                      <span className="text-sm text-slate-200 flex-1 text-right">{mockEmp.ifsc_code}</span>
                    </div>
                    <div className="flex items-end justify-between border-b border-slate-700 pb-1">
                      <span className="text-sm font-semibold text-slate-400 w-40">PAN No</span>
                      <span className="text-sm text-slate-200 flex-1 text-right uppercase">{mockEmp.pan_no}</span>
                    </div>
                    <div className="flex items-end justify-between border-b border-slate-700 pb-1">
                      <span className="text-sm font-semibold text-slate-400 w-40">UAN NO</span>
                      <span className="text-sm text-slate-200 flex-1 text-right">{mockEmp.uan_no}</span>
                    </div>
                    <div className="flex items-end justify-between border-b border-slate-700 pb-1">
                      <span className="text-sm font-semibold text-slate-400 w-40">Emp Code</span>
                      <span className="text-sm text-slate-200 flex-1 text-right">{mockEmp.employee_id}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Content: Salary Info */}
            {activeTab === "Salary Info" && (
              <div className="animate-in fade-in duration-300">
                <div className="mb-8 flex items-center justify-between bg-purple-500/10 border border-purple-500/20 px-4 py-3 rounded-lg">
                  <span className="text-sm text-purple-300 font-medium tracking-wide">Salary Info tab is visible only to Admin</span>
                  <button 
                    onClick={handleSaveSalary}
                    disabled={saving}
                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-1.5 px-4 rounded transition-colors disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Salary Settings"}
                  </button>
                </div>

                <div className="border border-slate-700 bg-slate-800/50 rounded-xl p-8 shadow-lg">
                  {/* Top Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 mb-12 border-b border-slate-700 pb-10">
                    <div className="space-y-4">
                      <div className="flex items-end gap-3">
                        <input 
                          type="number" 
                          value={monthlyWage}
                          onChange={(e) => setMonthlyWage(parseFloat(e.target.value) || 0)}
                          className="bg-slate-900 border border-slate-600 text-2xl font-mono text-white w-40 text-right px-2 py-1 rounded focus:outline-none focus:border-purple-500" 
                        />
                        <span className="text-sm text-slate-400 mb-1 font-semibold">/ Month Wage</span>
                      </div>
                      <div className="flex items-end gap-3">
                        <input 
                          type="number" 
                          readOnly 
                          value={yearlyWage} 
                          className="bg-transparent border-b border-slate-600 text-2xl font-mono text-slate-400 w-40 text-right pb-1 focus:outline-none" 
                        />
                        <span className="text-sm text-slate-500 mb-1 font-semibold">/ Yearly</span>
                      </div>
                    </div>
                    <div className="space-y-4 flex flex-col justify-end">
                      <div className="flex items-end justify-between">
                        <span className="text-sm text-slate-400 font-semibold w-48">Working days per week:</span>
                        <input type="number" value={workingDays} onChange={e => setWorkingDays(parseFloat(e.target.value)||0)} className="bg-slate-900 border border-slate-600 rounded text-lg font-mono text-white w-20 text-center px-1 focus:outline-none" />
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="text-sm text-slate-400 font-semibold w-48">Break Time:</span>
                        <div className="flex items-end gap-2">
                          <input type="number" value={breakTime} onChange={e => setBreakTime(parseFloat(e.target.value)||0)} className="bg-slate-900 border border-slate-600 rounded text-lg font-mono text-white w-20 text-center px-1 focus:outline-none" />
                          <span className="text-sm text-slate-400 mb-1 font-semibold">/ hrs</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Components */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    
                    {/* Left Column (Earnings) */}
                    <div>
                      <h3 className="text-lg font-bold text-white mb-6 border-b border-slate-700 pb-2 flex justify-between">
                        <span>Salary Components</span>
                        <span className="text-sm font-mono text-green-400">Total: ₹{monthlyWage.toFixed(2)}</span>
                      </h3>
                      
                      <div className="space-y-6">
                        {/* Basic */}
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <span className="text-sm font-semibold text-slate-200">Basic Salary</span>
                              {renderRuleInput(basicRule, setBasicRule)}
                            </div>
                            <div className="flex items-end gap-2 mt-1">
                              <span className="text-sm font-mono text-white border-b border-slate-600 pb-0.5 min-w-[80px] text-right">{basicAmt.toFixed(2)}</span>
                              <span className="text-xs text-slate-400 mb-0.5 w-8">₹</span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 italic mt-2">Calculated based on Monthly Wage.</p>
                        </div>
                        
                        {/* HRA */}
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <span className="text-sm font-semibold text-slate-200">House Rent Allowance</span>
                              {renderRuleInput(hraRule, setHraRule)}
                            </div>
                            <div className="flex items-end gap-2 mt-1">
                              <span className="text-sm font-mono text-white border-b border-slate-600 pb-0.5 min-w-[80px] text-right">{hraAmt.toFixed(2)}</span>
                              <span className="text-xs text-slate-400 mb-0.5 w-8">₹</span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 italic mt-2">Calculated based on Basic Salary.</p>
                        </div>
                        
                        {/* Standard Allowance */}
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <span className="text-sm font-semibold text-slate-200">Standard Allowance</span>
                              {renderRuleInput(stdRule, setStdRule)}
                            </div>
                            <div className="flex items-end gap-2 mt-1">
                              <span className="text-sm font-mono text-white border-b border-slate-600 pb-0.5 min-w-[80px] text-right">{stdAmt.toFixed(2)}</span>
                              <span className="text-xs text-slate-400 mb-0.5 w-8">₹</span>
                            </div>
                          </div>
                        </div>

                        {/* Performance Bonus */}
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <span className="text-sm font-semibold text-slate-200">Performance Bonus</span>
                              {renderRuleInput(perfRule, setPerfRule)}
                            </div>
                            <div className="flex items-end gap-2 mt-1">
                              <span className="text-sm font-mono text-white border-b border-slate-600 pb-0.5 min-w-[80px] text-right">{perfAmt.toFixed(2)}</span>
                              <span className="text-xs text-slate-400 mb-0.5 w-8">₹</span>
                            </div>
                          </div>
                        </div>

                        {/* LTA */}
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <span className="text-sm font-semibold text-slate-200">Leave Travel Allowance (LTA)</span>
                              {renderRuleInput(ltaRule, setLtaRule)}
                            </div>
                            <div className="flex items-end gap-2 mt-1">
                              <span className="text-sm font-mono text-white border-b border-slate-600 pb-0.5 min-w-[80px] text-right">{ltaAmt.toFixed(2)}</span>
                              <span className="text-xs text-slate-400 mb-0.5 w-8">₹</span>
                            </div>
                          </div>
                        </div>

                        {/* Fixed Allowance (Auto) */}
                        <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
                          <div className="flex justify-between items-end mb-1">
                            <div>
                              <span className="text-sm font-semibold text-slate-200 block mb-1">Fixed Allowance (Auto-Balance)</span>
                              <span className="text-xs text-slate-400 font-mono">Wage - (Sum of above components)</span>
                            </div>
                            <div className="flex items-end gap-2">
                              <span className="text-sm font-mono text-purple-400 border-b border-slate-600 pb-0.5 min-w-[80px] text-right">{fixedAllowanceAmt.toFixed(2)}</span>
                              <span className="text-xs text-slate-400 mb-0.5 w-8">₹</span>
                            </div>
                          </div>
                        </div>
                        
                      </div>
                    </div>
                    
                    {/* Right Column (Deductions) */}
                    <div>
                      <h3 className="text-lg font-bold text-white mb-6 border-b border-slate-700 pb-2">Contributions / Deductions</h3>
                      
                      <div className="space-y-6">
                        {/* PF */}
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <span className="text-sm font-semibold text-slate-200">Provident Fund (PF)</span>
                              {renderRuleInput(pfRule, setPfRule)}
                            </div>
                            <div className="flex items-end gap-2 mt-1">
                              <span className="text-sm font-mono text-red-400 border-b border-slate-600 pb-0.5 min-w-[80px] text-right">- {pfAmt.toFixed(2)}</span>
                              <span className="text-xs text-slate-400 mb-0.5 w-8">₹</span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 italic mt-2">Calculated based on Basic Salary.</p>
                        </div>
                        
                        {/* Professional Tax */}
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <span className="text-sm font-semibold text-slate-200">Professional Tax</span>
                              {renderRuleInput(profTaxRule, setProfTaxRule)}
                            </div>
                            <div className="flex items-end gap-2 mt-1">
                              <span className="text-sm font-mono text-red-400 border-b border-slate-600 pb-0.5 min-w-[80px] text-right">- {profTaxAmt.toFixed(2)}</span>
                              <span className="text-xs text-slate-400 mb-0.5 w-8">₹</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Net Pay */}
                        <div className="mt-12 bg-purple-900/20 border border-purple-500/30 p-6 rounded-xl">
                          <h4 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">Estimated Net Pay</h4>
                          <div className="flex items-baseline gap-4 justify-between">
                            <span className="text-3xl font-mono font-bold text-white">₹{netPayAmt.toFixed(2)}</span>
                            <span className="text-sm text-slate-400">/ month</span>
                          </div>
                          <div className="mt-4 pt-4 border-t border-purple-500/20 flex justify-between text-xs text-slate-400">
                            <span>Gross: ₹{monthlyWage.toFixed(2)}</span>
                            <span>Deductions: ₹{totalDeductions.toFixed(2)}</span>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
