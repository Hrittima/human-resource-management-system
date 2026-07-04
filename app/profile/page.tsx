"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import TopNav from "../dashboard/components/TopNav";

type Tab = "Resume" | "Private Info" | "Salary Info" | "Security";

export default function ProfilePage() {
  const router = useRouter();
  
  // Base State
  const [profile, setProfile] = useState<any>(null);
  const [monthlyWage, setMonthlyWage] = useState<string>("0.00");
  const [yearlyWage, setYearlyWage] = useState<string>("0.00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Resume");

  // --- Form Fields State ---
  // Top Banner
  const [avatarUrl, setAvatarUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [manager, setManager] = useState("");
  const [location, setLocation] = useState("");
  
  // Resume Tab
  const [about, setAbout] = useState("");
  const [jobLove, setJobLove] = useState("");
  const [hobbies, setHobbies] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [certifications, setCertifications] = useState<string[]>([]);
  const [newCert, setNewCert] = useState("");

  // Private Info Tab
  const [dob, setDob] = useState("");
  const [residingAddress, setResidingAddress] = useState("");
  const [nationality, setNationality] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [gender, setGender] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [doj, setDoj] = useState("");
  
  const [bankName, setBankName] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [panNo, setPanNo] = useState("");
  const [uanNo, setUanNo] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

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
        .select("*")
        .eq("id", user.id)
        .single();
        
      if (error || !data) {
        router.push("/login");
        return;
      }

      setProfile(data);
      
      // Top Banner
      setAvatarUrl(data.logo_url || "");
      setPhone(data.phone || "");
      setDepartment(data.department || "");
      setManager(data.manager || "");
      setLocation(data.location || "");

      // Resume
      setAbout(data.about || "");
      setJobLove(data.job_love || "");
      setHobbies(data.hobbies || "");
      setSkills(data.skills || []);
      setCertifications(data.certifications || []);
      
      // Private Info
      setDob(data.dob || "");
      setResidingAddress(data.residing_address || "");
      setNationality(data.nationality || "");
      setPersonalEmail(data.personal_email || "");
      setGender(data.gender || "");
      setMaritalStatus(data.marital_status || "");
      setDoj(data.doj || "");
      
      setBankName(data.bank_name || "");
      setBankAccountNo(data.bank_account_no || "");
      setIfscCode(data.ifsc_code || "");
      setPanNo(data.pan_no || "");
      setUanNo(data.uan_no || "");

      // Fetch Salary Info
      if (data.employee_id) {
        const { data: payrollData } = await supabase
          .from("payroll_details")
          .select("monthly_wage, yearly_wage")
          .eq("employee_id", data.employee_id)
          .single();

        if (payrollData) {
          setMonthlyWage(Number(payrollData.monthly_wage).toLocaleString('en-IN', { minimumFractionDigits: 2 }));
          setYearlyWage(Number(payrollData.yearly_wage).toLocaleString('en-IN', { minimumFractionDigits: 2 }));
        }
      }

      setLoading(false);
    }
    load();
  }, [router]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setSaving(true);
    setError(null);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(urlData.publicUrl);
    } catch (err: any) {
      setError(err.message || "Failed to upload image.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updates = {
        logo_url: avatarUrl,
        phone,
        department,
        manager,
        location,
        
        about,
        job_love: jobLove,
        hobbies,
        skills,
        certifications,
        
        dob,
        residing_address: residingAddress,
        nationality,
        personal_email: personalEmail,
        gender,
        marital_status: maritalStatus,
        doj,
        
        bank_name: bankName,
        bank_account_no: bankAccountNo,
        ifsc_code: ifscCode,
        pan_no: panNo,
        uan_no: uanNo,
      };

      const { error: updateError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", profile.id);

      if (updateError) throw updateError;
      
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err: any) {
      setError(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  const handleAddCert = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCert.trim() && !certifications.includes(newCert.trim())) {
      setCertifications([...certifications, newCert.trim()]);
      setNewCert("");
    }
  };

  const handleRemoveCert = (certToRemove: string) => {
    setCertifications(certifications.filter(c => c !== certToRemove));
  };

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f111a]">
        <p className="text-sm text-slate-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f111a] text-slate-200 flex flex-col font-sans">
      <TopNav 
        companyName={profile.company_name} 
        companyLogoUrl={profile.logo_url}
        userProfileUrl={avatarUrl}
        role={profile.role}
        employeeId={profile.employee_id}
      />
      
      <div className="flex-1 overflow-auto px-6 py-8">
        <div className="mx-auto max-w-5xl">
          
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-white">My Profile</h1>
            <div className="flex items-center gap-4">
              {error && <span className="text-red-400 text-sm">{error}</span>}
              {success && <span className="text-green-400 text-sm">{success}</span>}
              <button 
                onClick={handleSave}
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold py-2 px-6 rounded transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Top Banner */}
          <div className="border border-slate-700 bg-slate-800/50 rounded-xl p-8 mb-8 flex flex-col md:flex-row items-start md:items-center gap-8">
            
            {/* Avatar */}
            <div className="relative h-32 w-32 shrink-0 rounded-full border-4 border-slate-700 bg-slate-700 overflow-hidden shadow-xl group">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-slate-700 text-slate-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
              )}
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </div>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleAvatarUpload}
              />
            </div>

            {/* Basic Info */}
            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
              <div className="space-y-4">
                <h3 className="text-3xl font-bold text-white mb-2">{profile.full_name}</h3>
                
                <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                  <span className="text-sm text-slate-400 font-semibold w-24">Job Position</span>
                  <input type="text" value={profile.role === 'admin' ? 'Administrator' : 'Employee'} readOnly className="text-sm bg-transparent text-slate-200 text-right focus:outline-none w-full" />
                </div>
                
                <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                  <span className="text-sm text-slate-400 font-semibold w-24">Email</span>
                  <input type="email" value={profile.email || ""} readOnly className="text-sm bg-transparent text-slate-200 text-right focus:outline-none w-full" />
                </div>

                <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                  <span className="text-sm text-slate-400 font-semibold w-24">Mobile</span>
                  <input 
                    type="text" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter mobile..."
                    className="text-sm bg-[#0f111a] px-2 py-0.5 rounded text-white border border-slate-600 focus:outline-none focus:border-purple-500 text-right w-full ml-4" 
                  />
                </div>
              </div>

              <div className="space-y-4 pt-1 md:pt-11">
                <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                  <span className="text-sm text-slate-400 font-semibold w-24">Company</span>
                  <input type="text" value={profile.company_name} readOnly className="text-sm bg-transparent text-slate-200 text-right focus:outline-none w-full" />
                </div>

                <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                  <span className="text-sm text-slate-400 font-semibold w-24">Department</span>
                  <input 
                    type="text" 
                    value={department} 
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="E.g. Engineering"
                    className="text-sm bg-[#0f111a] px-2 py-0.5 rounded text-white border border-slate-600 focus:outline-none focus:border-purple-500 text-right w-full ml-4" 
                  />
                </div>

                <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                  <span className="text-sm text-slate-400 font-semibold w-24">Manager</span>
                  <input 
                    type="text" 
                    value={manager} 
                    onChange={(e) => setManager(e.target.value)}
                    placeholder="Manager Name"
                    className="text-sm bg-[#0f111a] px-2 py-0.5 rounded text-white border border-slate-600 focus:outline-none focus:border-purple-500 text-right w-full ml-4" 
                  />
                </div>

                <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                  <span className="text-sm text-slate-400 font-semibold w-24">Location</span>
                  <input 
                    type="text" 
                    value={location} 
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="E.g. New York, NY"
                    className="text-sm bg-[#0f111a] px-2 py-0.5 rounded text-white border border-slate-600 focus:outline-none focus:border-purple-500 text-right w-full ml-4" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tabs Nav */}
          <div className="flex border-b border-slate-700 mb-8">
            {(["Resume", "Private Info", "Salary Info", "Security"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-3 text-sm font-bold border-b-2 transition-colors ${
                  activeTab === tab 
                    ? "border-purple-500 text-purple-400 bg-purple-500/10" 
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content: Resume */}
          {activeTab === "Resume" && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in fade-in duration-300">
              <div className="space-y-6">
                <div className="border border-slate-700 bg-slate-800/30 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-3">About</h3>
                  <textarea 
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    placeholder="Tell us about yourself..."
                    className="w-full bg-[#0f111a] border border-slate-700 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:border-purple-500 resize-none h-24"
                  />
                </div>

                <div className="border border-slate-700 bg-slate-800/30 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-3">What I love about my job</h3>
                  <textarea 
                    value={jobLove}
                    onChange={(e) => setJobLove(e.target.value)}
                    placeholder="I love my job because..."
                    className="w-full bg-[#0f111a] border border-slate-700 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:border-purple-500 resize-none h-24"
                  />
                </div>

                <div className="border border-slate-700 bg-slate-800/30 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-3">My interests and hobbies</h3>
                  <textarea 
                    value={hobbies}
                    onChange={(e) => setHobbies(e.target.value)}
                    placeholder="In my free time, I enjoy..."
                    className="w-full bg-[#0f111a] border border-slate-700 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:border-purple-500 resize-none h-24"
                  />
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="border border-slate-700 bg-slate-800/30 rounded-xl p-6 h-[216px] flex flex-col">
                  <h3 className="text-lg font-bold text-white mb-4">Skills</h3>
                  <div className="flex-1 flex flex-wrap gap-2 content-start overflow-y-auto mb-4">
                    {skills.map(skill => (
                      <span key={skill} className="text-xs px-3 py-1 bg-slate-700 text-slate-200 rounded-full border border-slate-600 flex items-center gap-2">
                        {skill}
                        <button onClick={() => handleRemoveSkill(skill)} className="text-slate-400 hover:text-red-400 focus:outline-none">&times;</button>
                      </span>
                    ))}
                  </div>
                  <form onSubmit={handleAddSkill} className="flex gap-2">
                    <input 
                      type="text" 
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Add skill..." 
                      className="flex-1 bg-[#0f111a] border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
                    />
                    <button type="submit" className="bg-slate-700 hover:bg-slate-600 text-white px-3 rounded text-sm font-bold">+</button>
                  </form>
                </div>

                <div className="border border-slate-700 bg-slate-800/30 rounded-xl p-6 h-[216px] flex flex-col">
                  <h3 className="text-lg font-bold text-white mb-4">Certifications</h3>
                  <div className="flex-1 flex flex-wrap gap-2 content-start overflow-y-auto mb-4">
                    {certifications.map(cert => (
                      <span key={cert} className="text-xs px-3 py-1 bg-slate-700 text-slate-200 rounded-full border border-slate-600 flex items-center gap-2">
                        {cert}
                        <button onClick={() => handleRemoveCert(cert)} className="text-slate-400 hover:text-red-400 focus:outline-none">&times;</button>
                      </span>
                    ))}
                  </div>
                  <form onSubmit={handleAddCert} className="flex gap-2">
                    <input 
                      type="text" 
                      value={newCert}
                      onChange={(e) => setNewCert(e.target.value)}
                      placeholder="Add certification..." 
                      className="flex-1 bg-[#0f111a] border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
                    />
                    <button type="submit" className="bg-slate-700 hover:bg-slate-600 text-white px-3 rounded text-sm font-bold">+</button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Private Info */}
          {activeTab === "Private Info" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 animate-in fade-in duration-300">
              {/* Left Column */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <span className="text-sm font-semibold text-slate-300 w-40">Date of Birth</span>
                  <div className="flex-1 relative flex items-center">
                    <input 
                      type="text" 
                      placeholder="YYYY-MM-DD" 
                      value={dob} 
                      onChange={e => setDob(e.target.value)} 
                      className="w-full bg-transparent text-white text-sm focus:outline-none" 
                    />
                    <div className="relative w-6 h-6 flex items-center justify-center">
                      <svg className="w-4 h-4 text-slate-400 absolute pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <input 
                        type="date" 
                        onChange={e => setDob(e.target.value)} 
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <span className="text-sm font-semibold text-slate-300 w-40">Residing Address</span>
                  <input type="text" value={residingAddress} onChange={e => setResidingAddress(e.target.value)} className="flex-1 bg-transparent border-b border-slate-600 text-white text-sm pb-1 focus:outline-none focus:border-purple-500" />
                </div>
                
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <span className="text-sm font-semibold text-slate-300 w-40">Nationality</span>
                  <input type="text" value={nationality} onChange={e => setNationality(e.target.value)} className="flex-1 bg-transparent border-b border-slate-600 text-white text-sm pb-1 focus:outline-none focus:border-purple-500" />
                </div>
                
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <span className="text-sm font-semibold text-slate-300 w-40">Personal Email</span>
                  <input type="email" value={personalEmail} onChange={e => setPersonalEmail(e.target.value)} className="flex-1 bg-transparent border-b border-slate-600 text-white text-sm pb-1 focus:outline-none focus:border-purple-500" />
                </div>
                
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <span className="text-sm font-semibold text-slate-300 w-40">Gender</span>
                  <select value={gender} onChange={e => setGender(e.target.value)} className="flex-1 bg-[#0f111a] border border-slate-600 rounded text-white text-sm py-1 px-2 focus:outline-none focus:border-purple-500">
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <span className="text-sm font-semibold text-slate-300 w-40">Marital Status</span>
                  <select value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)} className="flex-1 bg-[#0f111a] border border-slate-600 rounded text-white text-sm py-1 px-2 focus:outline-none focus:border-purple-500">
                    <option value="">Select Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                  </select>
                </div>
                
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <span className="text-sm font-semibold text-slate-300 w-40">Date of Joining</span>
                  <div className="flex-1 relative flex items-center">
                    <input 
                      type="text" 
                      placeholder="YYYY-MM-DD" 
                      value={doj} 
                      onChange={e => setDoj(e.target.value)} 
                      className="w-full bg-transparent text-white text-sm focus:outline-none" 
                    />
                    <div className="relative w-6 h-6 flex items-center justify-center">
                      <svg className="w-4 h-4 text-slate-400 absolute pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <input 
                        type="date" 
                        onChange={e => setDoj(e.target.value)} 
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Bank Details */}
              <div>
                <h3 className="text-lg font-bold text-white mb-6 border-b border-slate-700 pb-2">Bank Details</h3>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                    <span className="text-sm font-semibold text-slate-300 w-40">Account Number</span>
                    <input type="text" value={bankAccountNo} onChange={e => setBankAccountNo(e.target.value)} className="flex-1 bg-transparent border-b border-slate-600 text-white text-sm pb-1 focus:outline-none focus:border-purple-500" />
                  </div>
                  
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                    <span className="text-sm font-semibold text-slate-300 w-40">Bank Name</span>
                    <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} className="flex-1 bg-transparent border-b border-slate-600 text-white text-sm pb-1 focus:outline-none focus:border-purple-500" />
                  </div>
                  
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                    <span className="text-sm font-semibold text-slate-300 w-40">IFSC Code</span>
                    <input type="text" value={ifscCode} onChange={e => setIfscCode(e.target.value)} className="flex-1 bg-transparent border-b border-slate-600 text-white text-sm pb-1 focus:outline-none focus:border-purple-500" />
                  </div>
                  
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                    <span className="text-sm font-semibold text-slate-300 w-40">PAN No</span>
                    <input type="text" value={panNo} onChange={e => setPanNo(e.target.value)} className="flex-1 bg-transparent border-b border-slate-600 text-white text-sm pb-1 focus:outline-none focus:border-purple-500 uppercase" />
                  </div>
                  
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                    <span className="text-sm font-semibold text-slate-300 w-40">UAN NO</span>
                    <input type="text" value={uanNo} onChange={e => setUanNo(e.target.value)} className="flex-1 bg-transparent border-b border-slate-600 text-white text-sm pb-1 focus:outline-none focus:border-purple-500" />
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                    <span className="text-sm font-semibold text-slate-300 w-40">Emp Code</span>
                    <input type="text" value={profile.employee_id} readOnly className="flex-1 bg-transparent border-b border-slate-600 text-slate-400 text-sm pb-1 focus:outline-none" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Salary Info */}
          {activeTab === "Salary Info" && (
            <div className="border border-slate-700 bg-slate-800/50 rounded-xl p-8 max-w-2xl animate-in fade-in duration-300">
              <h2 className="text-xl font-bold text-white mb-8 border-b border-slate-700 pb-4">Salary Information</h2>
              <div className="space-y-6">
                <div className="flex items-end gap-6 bg-slate-800 p-6 rounded-lg border border-slate-700">
                  <div className="flex-1">
                    <span className="text-sm text-slate-400 font-semibold block mb-2">Monthly Wage</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-mono text-white">₹ {monthlyWage}</span>
                      <span className="text-sm text-slate-500">/ Month</span>
                    </div>
                  </div>
                  <div className="w-px h-16 bg-slate-700 hidden sm:block"></div>
                  <div className="flex-1">
                    <span className="text-sm text-slate-400 font-semibold block mb-2">Yearly Wage</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-mono text-white">₹ {yearlyWage}</span>
                      <span className="text-sm text-slate-500">/ Year</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-500 italic mt-4 text-center">For detailed salary breakdown and components, please contact your Administrator.</p>
              </div>
            </div>
          )}

          {/* Tab Content: Security */}
          {activeTab === "Security" && (
            <div className="border border-slate-700 bg-slate-800/50 rounded-xl p-8 max-w-2xl animate-in fade-in duration-300">
               <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-4">Security Settings</h2>
               <p className="text-slate-400 mb-6">Manage your password and security preferences.</p>
               <button className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-6 rounded transition-colors border border-slate-600">
                 Change Password
               </button>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
