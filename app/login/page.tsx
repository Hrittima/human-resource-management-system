"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Look up the email tied to this generated employee ID
      const { data: email, error: lookupError } = await supabase.rpc(
        "get_email_by_employee_id",
        { p_employee_id: employeeId.trim().toUpperCase() }
      );
      if (lookupError) throw lookupError;
      if (!email) {
        throw new Error("We couldn't find an account with that Employee ID.");
      }

      // 2. Sign in with the real email + password behind the scenes
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw new Error("Incorrect Employee ID or password.");

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell px-4 py-10">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="soft-card flex flex-col justify-center">
          <div className="hero-badge">Operational clarity</div>
          <h1 className="mt-6 font-display text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
            Keep every employee journey in one calm workspace.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-600">
            From onboarding to attendance and approvals, the experience stays simple,
            reliable, and easy to manage for growing teams.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="metric-pill">
              <p className="font-semibold text-slate-800">Fast sign-in</p>
              <p className="mt-1 text-sm">Use your employee ID to access your workspace immediately.</p>
            </div>
            <div className="metric-pill">
              <p className="font-semibold text-slate-800">Secure access</p>
              <p className="mt-1 text-sm">Protected authentication with the same backend flow you already use.</p>
            </div>
          </div>
        </section>

        <div className="card-shell mx-auto w-full max-w-md">
          <div className="mb-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-royal-600">
              HRMS
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-slate-900">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Every workday, perfectly aligned.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label" htmlFor="employeeId">
                Employee ID
              </label>
              <input
                id="employeeId"
                className="field-input uppercase tracking-wider"
                placeholder="JOSM26001"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
              />
            </div>

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
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            New company?{" "}
            <Link href="/signup" className="font-semibold text-royal-600">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
