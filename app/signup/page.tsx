"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateEmployeeId } from "@/lib/generateEmployeeId";

type Role = "admin" | "employee";

export default function SignupPage() {
  const router = useRouter();

  const [role, setRole] = useState<Role>("admin");

  // Admin specific fields
  const [companyName, setCompanyName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Common fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Employee specific fields
  const [inputEmployeeId, setInputEmployeeId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedEmployeeId, setGeneratedEmployeeId] = useState<string | null>(null);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      let inviteData = null;

      // 1. If employee, verify the invite first
      if (role === "employee") {
        if (!inputEmployeeId) {
          throw new Error("Employee ID is required for employee registration.");
        }
        const { data, error: inviteError } = await supabase
          .from("employee_invites")
          .select("*")
          .eq("employee_id", inputEmployeeId)
          .eq("status", "pending")
          .single();

        if (inviteError || !data) {
          throw new Error("Invalid or expired Employee ID. Please contact your HR.");
        }
        
        if (data.email.toLowerCase() !== email.toLowerCase()) {
          throw new Error("Email does not match the invited employee record.");
        }
        
        inviteData = data;
      }

      // 2. Sign up with Supabase Auth (email/password)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) throw signUpError;

      const user = signUpData.user;
      if (!user) {
        throw new Error(
          "Account created, but no active session was returned. Make sure email confirmation is disabled in Supabase Auth settings for this hackathon."
        );
      }

      // 3. Handle Admin registration
      if (role === "admin") {
        let logoUrl: string | null = null;
        if (logoFile) {
          const ext = logoFile.name.split(".").pop();
          const path = `${user.id}-${Date.now()}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("company-logos")
            .upload(path, logoFile, { upsert: true });
          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage
            .from("company-logos")
            .getPublicUrl(path);
          logoUrl = publicUrlData.publicUrl;
        }

        const joiningYear = new Date().getFullYear();
        const { data: serialData, error: serialError } = await supabase.rpc(
          "get_next_serial",
          { p_year: joiningYear }
        );
        if (serialError) throw serialError;
        const serialNumber = serialData as number;

        const newEmployeeId = generateEmployeeId(fullName, joiningYear, serialNumber);

        const { error: profileError } = await supabase.from("profiles").insert({
          id: user.id,
          employee_id: newEmployeeId,
          company_name: companyName,
          full_name: fullName,
          email,
          phone,
          role: "admin",
          logo_url: logoUrl,
          joining_year: joiningYear,
          serial_number: serialNumber,
        });
        if (profileError) throw profileError;

        setGeneratedEmployeeId(newEmployeeId);
      } 
      // 4. Handle Employee registration
      else if (role === "employee" && inviteData) {
        // Create profile from invite data
        const { error: profileError } = await supabase.from("profiles").insert({
          id: user.id,
          employee_id: inviteData.employee_id,
          company_name: inviteData.company_name,
          full_name: inviteData.full_name,
          email: inviteData.email,
          phone,
          role: "employee",
          logo_url: null, // Employees don't upload company logo
          joining_year: new Date().getFullYear(),
          serial_number: 0, // Placeholder for employees added via invite
        });
        if (profileError) throw profileError;

        // Mark invite as accepted
        const { error: updateInviteError } = await supabase
          .from("employee_invites")
          .update({ status: "accepted" })
          .eq("id", inviteData.id);
        
        if (updateInviteError) throw updateInviteError;

        setGeneratedEmployeeId(inviteData.employee_id);
      }
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (generatedEmployeeId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="card-shell text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-royal-100 text-royal-700">
            ✓
          </div>
          <h1 className="font-display text-xl font-semibold text-slate-900">
            You&apos;re all set
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Your account has been created. Use the ID below to sign in — save
            it somewhere safe.
          </p>
          <div className="mt-5 rounded-lg border border-royal-100 bg-royal-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-royal-600">
              Your Employee ID
            </p>
            <p className="font-display text-2xl font-bold tracking-wider text-royal-700">
              {generatedEmployeeId}
            </p>
          </div>
          <button
            onClick={() => router.push("/login")}
            className="btn-primary mt-6"
          >
            Go to sign in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell px-4 py-10">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="soft-card flex flex-col justify-center">
          <div className="hero-badge">Built for modern teams</div>
          <h1 className="mt-6 font-display text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
            Set up your people operations in just a few steps.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-600">
            Choose the role that fits your team and launch your workspace with the same secure workflow you already trust.
          </p>
          <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">What you can expect</p>
            <ul className="mt-3 space-y-2">
              <li>• Instant employee ID generation for admins</li>
              <li>• Guided invite-based onboarding for employees</li>
              <li>• A polished, consistent experience from day one</li>
            </ul>
          </div>
        </section>

        <div className="card-shell mx-auto w-full max-w-lg">
          <div className="mb-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-royal-600">
              HRMS
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-slate-900">
              Create your account
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Every workday, perfectly aligned.
            </p>
          </div>

          <div className="mb-6 flex rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
                role === "admin"
                  ? "bg-white text-royal-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setRole("admin")}
            >
              Admin / HR
            </button>
            <button
              type="button"
              className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
                role === "employee"
                  ? "bg-white text-royal-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setRole("employee")}
            >
              Employee
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
          {role === "admin" && (
            <div>
              <label className="field-label" htmlFor="companyName">
                Company name
              </label>
              <input
                id="companyName"
                className="field-input"
                placeholder="Acme Industries"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>
          )}

          {role === "employee" && (
            <div>
              <label className="field-label" htmlFor="inputEmployeeId">
                Employee ID (Provided by HR)
              </label>
              <input
                id="inputEmployeeId"
                className="field-input"
                placeholder="EMP-..."
                value={inputEmployeeId}
                onChange={(e) => setInputEmployeeId(e.target.value)}
                required
              />
            </div>
          )}

          {role === "admin" && (
            <div>
              <label className="field-label" htmlFor="fullName">
                Your full name
              </label>
              <input
                id="fullName"
                className="field-input"
                placeholder="John Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                className="field-input"
                placeholder="john@acme.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="phone">
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                className="field-input"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required={role === "admin"}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="field-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="confirmPassword">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="field-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
          </div>

          {role === "admin" && (
            <div>
              <label className="field-label" htmlFor="logo">
                Company logo
              </label>
              <div className="flex items-center gap-3">
                {logoPreview && (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="h-12 w-12 rounded-lg border border-slate-200 object-cover"
                  />
                )}
                <input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-royal-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-royal-700 hover:file:bg-royal-100"
                />
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-royal-600">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
